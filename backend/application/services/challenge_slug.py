"""
File: challenge_slug.py
Type: py
Summary: Renames a challenge's slug without orphaning the rows that refer to it.

Completion logs (challenge_logs.challenge_slug), project templates
(project_templates.challenge_slug) and level games (level_games.challenge_slug)
point at a challenge by its slug as plain text, with no foreign key. Changing
challenges.slug alone would leave them pointing at nothing: the students'
completions would stop counting and the template or game would stop linking to
its challenge.
"""

from application.extensions import db
from application.models.challenge import Challenge
from application.models.challenge_log import ChallengeLog
from application.models.level_game import LevelGame
from application.models.project_template import ProjectTemplate
from sqlalchemy import func
from sqlalchemy.orm import aliased


class SlugRenameError(Exception):
    """A rename that cannot be done safely; ``status`` is the HTTP status to answer."""

    def __init__(self, message, status=409):
        super().__init__(message)
        self.message = message
        self.status = status


def _log_clashes(old_slug, new_slug):
    """How many logs under ``old_slug`` would duplicate a log under ``new_slug``.

    challenge_logs is unique per (user, slug, course instance), and per (user,
    slug) while the course instance is NULL. Logs under ``new_slug`` can exist
    without a challenge of that slug (the challenge was deleted, or a slug was
    typed by hand), so a free slug in ``challenges`` does not rule a clash out.
    ``IS NOT DISTINCT FROM`` treats two NULL instances as equal, as the second
    index does.
    """
    existing = aliased(ChallengeLog)
    return (
        db.session.query(func.count(ChallengeLog.id))
        .join(
            existing,
            (existing.user_id == ChallengeLog.user_id)
            & (existing.challenge_slug == new_slug)
            & existing.course_instance.is_not_distinct_from(
                ChallengeLog.course_instance
            ),
        )
        .filter(ChallengeLog.challenge_slug == old_slug)
        .scalar()
    )


def rename_challenge_slug(challenge, new_slug):
    """Give ``challenge`` the slug ``new_slug`` and move everything that uses the old one.

    Updates the challenge's logs, project templates and level games in the
    caller's transaction, so one commit makes the rename and the move together
    and a rollback undoes both. Does not commit.

    Raises SlugRenameError (status 409) when another challenge already has the
    slug, or when some student has a log under both slugs for the same course
    instance: moving the old log would break the one-log-per-student-and-challenge
    rule, and merging two completions is not a choice to make silently.

    Returns the number of logs that were moved (0 when the slug did not change).
    """
    old_slug = challenge.slug
    if new_slug == old_slug:
        return 0

    taken = Challenge.query.filter(
        Challenge.slug == new_slug, Challenge.id != challenge.id
    ).first()
    if taken:
        raise SlugRenameError("Challenge with this slug already exists")

    clashes = _log_clashes(old_slug, new_slug)
    if clashes:
        raise SlugRenameError(
            f"Cannot rename '{old_slug}' to '{new_slug}': {clashes} completion "
            f"log{'s' if clashes != 1 else ''} under the old slug would duplicate "
            "a log that already exists under the new one. Remove the logs under "
            "the new slug first, or pick another slug."
        )

    moved = ChallengeLog.query.filter_by(challenge_slug=old_slug).update(
        {"challenge_slug": new_slug}, synchronize_session=False
    )
    ProjectTemplate.query.filter_by(challenge_slug=old_slug).update(
        {"challenge_slug": new_slug}, synchronize_session=False
    )
    LevelGame.query.filter_by(challenge_slug=old_slug).update(
        {"challenge_slug": new_slug}, synchronize_session=False
    )
    challenge.slug = new_slug
    return moved
