"""
File: challenge_completion.py
Type: py
Summary: Shared helper that marks a Challenge as completed for a user without
the CodeCombat/Ozaria URL flow (admin overrides, approved mini-projects, ...).
"""

from application.extensions import db
from application.models.challenge_log import ChallengeLog


def grant_challenge_completion(
    user,
    challenge,
    reason=None,
    duck_multiplier=1,
    commit=True,
    evaluate=True,
    award_ducks=True,
    set_active_track=True,
):
    """Idempotently complete ``challenge`` for ``user``.

    * Creates a ChallengeLog for (user, challenge.slug) with the challenge's
      domain and course_id, unless the user already has a log for that slug.
    * Awards ``challenge.scale_value() * duck_multiplier`` ducks through
      ``user.add_ducks`` (same amount pass_chapter uses) - only when a new log
      was created, so repeating the call never double-awards.
    * Points ``user.active_track`` at the track of the challenge's course.
    * Runs the achievement evaluation (forced) so progress achievements fire.

    The keyword switches exist so bulk callers (pass_chapter) can reuse the
    log-creation/idempotency logic while handling ducks, commit and
    evaluation themselves.

    Returns True when a new ChallengeLog was created, False when the user had
    already completed the challenge.
    """
    existing = ChallengeLog.query.filter_by(
        user_id=user.id, challenge_slug=challenge.slug
    ).first()
    if existing:
        return False

    db.session.add(
        ChallengeLog(
            user_id=user.id,
            domain=challenge.domain,
            challenge_slug=challenge.slug,
            course_id=challenge.course_id,
        )
    )

    if award_ducks:
        amount = int(challenge.scale_value() * duck_multiplier)
        if amount > 0:
            user.add_ducks(amount, reason=reason or f"Challenge: {challenge.slug}")

    if set_active_track and challenge.course_id:
        from application.routes.challenge_routes import get_track_for_course_id

        track = get_track_for_course_id(challenge.course_id)
        if track and track != user.active_track:
            user.active_track = track
            db.session.add(user)

    if commit:
        db.session.commit()
        if evaluate:
            from application.services.achievement_engine import evaluate_user

            evaluate_user(user, force=True)

    return True
