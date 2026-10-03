# application/services/achievement_engine.py
import logging

from application.extensions import db
from application.models.achievements import Achievement, UserAchievement
from application.models.challenge_log import ChallengeLog
from application.models.duck_trade import DuckTradeLog
from application.models.message import Message
from application.models.session_log import SessionLog
from application.models.user_certificate import UserCertificate
from application.utilities.helper_functions import utcnow_naive
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError

logger = logging.getLogger(__name__)

# Upper bound on award passes in one evaluation (see _award_new_achievements).
_MAX_AWARD_PASSES = 10

# (slug, raw value) pairs already reported by _parse_requirement, so a broken
# achievement logs once instead of on every evaluation.
_warned_requirements: set = set()


def _parse_requirement(achievement):
    """Return the achievement's requirement as an int, or None if it is unusable.

    A missing or mis-typed requirement must never unlock the achievement for
    everyone, so callers treat None as "never". Certificates legitimately have
    no numeric requirement (the approved certificate is the condition), so a
    blank one means 1.
    """
    raw = achievement.requirement_value
    if achievement.type == "certificate" and (raw is None or not str(raw).strip()):
        return 1
    try:
        return int(raw)
    except (ValueError, TypeError):
        key = (achievement.slug, raw)
        if key not in _warned_requirements:
            _warned_requirements.add(key)
            logger.warning(
                "Achievement %r (type=%r) has an invalid requirement_value %r; "
                "it will not unlock until it is fixed",
                achievement.slug,
                achievement.type,
                raw,
            )
        return None


def _chat_count(user):
    return (
        db.session.query(func.count(Message.id))
        .filter(Message.user_id == user.id)
        .scalar()
    )


def _community_count(user):
    """Count logs by other users that credit this user as their helper."""
    return (
        db.session.query(func.count(ChallengeLog.id))
        .filter(
            func.lower(ChallengeLog.helper) == user.username.lower(),
            ChallengeLog.user_id != user.id,
        )
        .scalar()
    )


def _trade_count(user):
    return (
        db.session.query(func.count(DuckTradeLog.id))
        .filter(DuckTradeLog.user_id == user.id)
        .scalar()
    )


def compute_user_stats(user):
    """Pre-calculate the per-user stats shared by every achievement.

    Passed as `stats` to check_achievement / get_achievement_progress so they do
    not repeat these queries once per achievement.
    """
    return {
        "chat_count": _chat_count(user),
        "consistency_streak": _calculate_consistency(user.id),
        "community_count": _community_count(user),
        "max_session": longest_session_minutes(user.id),
        "trade_count": _trade_count(user),
    }


def _stat(stats, key, compute):
    """Use the pre-calculated stat if present, otherwise compute it lazily."""
    return stats[key] if key in stats else compute()


def _current_value(user, achievement, stats=None):
    """Return the user's current value for this achievement's type."""
    if stats is None:
        stats = {}

    value_getters = {
        "ducks": lambda: user.earned_ducks,
        "project": lambda: len(user.projects),
        "progress": lambda: (
            user.get_progress(achievement.source) if achievement.source else 0
        ),
        # Count all messages sent by the user
        "chat": lambda: _stat(stats, "chat_count", lambda: _chat_count(user)),
        # Count how many consecutive weeks with challenges
        "consistency": lambda: _stat(
            stats, "consistency_streak", lambda: _calculate_consistency(user.id)
        ),
        # Count how many times someone entered them as a helper
        "community": lambda: _stat(
            stats, "community_count", lambda: _community_count(user)
        ),
        # Longest session length in minutes
        "session": lambda: _stat(
            stats, "max_session", lambda: longest_session_minutes(user.id)
        ),
        # Count number of trades (regardless of status)
        "trade": lambda: _stat(stats, "trade_count", lambda: _trade_count(user)),
        # Certificate submitted and reviewed
        "certificate": lambda: (
            1
            if UserCertificate.query.filter_by(
                user_id=user.id, achievement_id=achievement.id, status="approved"
            ).first()
            else 0
        ),
    }

    return value_getters.get(achievement.type, lambda: 0)()


def check_achievement(user, achievement, stats=None):
    """Return True if the user meets the condition for this achievement."""
    requirement = _parse_requirement(achievement)
    if requirement is None:
        return False

    return _current_value(user, achievement, stats) >= requirement


def get_achievement_progress(user, achievement, stats=None):
    """Return (current_value, requirement_value) for progress tracking."""
    requirement = _parse_requirement(achievement)

    value = _current_value(user, achievement, stats)
    # An unusable requirement reports 0 so the UI shows no progress bar.
    return value, requirement if requirement is not None else 0


def _calculate_consistency(user_id):
    """
    Count how many consecutive weeks the user has challenge logs.
    """
    logs = (
        db.session.query(ChallengeLog.timestamp)
        .filter(ChallengeLog.user_id == user_id)
        .order_by(ChallengeLog.timestamp.asc())
        .all()
    )
    if not logs:
        return 0

    # Extract weeks (year, weeknum)
    weeks = sorted({ts[0].isocalendar()[:2] for ts in logs})
    if not weeks:
        return 0

    from datetime import date

    # Convert each (year, week) to the Monday date of that ISO week
    week_mondays = sorted([date.fromisocalendar(year, week, 1) for year, week in weeks])

    streak = 1
    best_streak = 1
    for i in range(1, len(week_mondays)):
        diff = (week_mondays[i] - week_mondays[i - 1]).days
        if diff == 7:
            streak += 1
            best_streak = max(best_streak, streak)
        else:
            streak = 1

    return best_streak


def evaluate_user(user, force=False):
    """Evaluate all achievements for a given user with 1-hour throttling and pessimistic locking."""
    now = utcnow_naive()

    # Use pessimistic locking to prevent concurrent evaluations
    # Lock the user row to ensure only one evaluation runs at a time
    user = (
        db.session.query(user.__class__).with_for_update().filter_by(id=user.id).first()
    )
    if not user:
        return []

    # Throttle: Only evaluate once every 5 minutes unless forced
    if not force and user.last_achievement_evaluation:
        elapsed = (now - user.last_achievement_evaluation).total_seconds()
        if elapsed < 300:  # 5 minutes
            return []

    # Pre-calculate common stats for the entire evaluation pass
    # This avoids N extra queries inside the loop below.
    stats = compute_user_stats(user)

    # Optimization: Only query definitions once
    all_achievements = Achievement.query.all()

    # Two attempts: if a concurrent evaluation of the same user wins the race to
    # insert a UserAchievement (unique on user_id + achievement_id) our flush or
    # commit fails; roll back, re-read what is already earned and try once more.
    for _attempt in range(2):
        try:
            new_awards = _award_new_achievements(user, all_achievements, stats)

            # Always update the last evaluation timestamp if we successfully ran
            user.last_achievement_evaluation = now
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            continue
        return new_awards

    logger.warning(
        "Could not record achievements for user %s: concurrent evaluation", user.id
    )
    return []


def _award_new_achievements(user, all_achievements, stats):
    """Add every achievement the user newly qualifies for (does not commit)."""
    earned_ids = {ua.achievement_id for ua in user.achievements}
    new_awards = []

    # A duck reward raises earned_ducks, which can satisfy a "ducks" achievement
    # that was already checked earlier in the loop (or one that comes later in
    # an arbitrary order). Repeat until a pass hands out no more ducks.
    for _ in range(_MAX_AWARD_PASSES):
        ducks_granted = False
        for achievement in all_achievements:
            if achievement.id in earned_ids:
                continue
            if check_achievement(user, achievement, stats=stats):
                db.session.add(
                    UserAchievement(user_id=user.id, achievement_id=achievement.id)
                )
                earned_ids.add(achievement.id)
                # grant ducks reward
                if achievement.reward > 0:
                    user.add_ducks(
                        achievement.reward, reason=f"Achievement: {achievement.name}"
                    )
                    ducks_granted = True

                new_awards.append(achievement)
        if not ducks_granted:
            break

    return new_awards


def longest_session_minutes(user_id):
    """Calculate max session duration for a specific user.

    Uses a SQL-level MAX() with julianday() to avoid loading all session rows
    into Python memory — duration grows unboundedly with usage otherwise.
    """
    result = (
        db.session.query(
            func.max(
                func.julianday(func.coalesce(SessionLog.end_time, SessionLog.last_seen))
                - func.julianday(SessionLog.start_time)
            )
        )
        .filter(SessionLog.user_id == user_id)
        .scalar()
    )
    # julianday diff is in fractional days; convert to minutes
    return (result or 0) * 24 * 60
