# application/services/achievement_engine.py
from datetime import datetime

from sqlalchemy import func

from application.extensions import db
from application.models.achievements import Achievement, UserAchievement
from application.models.challenge_log import ChallengeLog
from application.models.duck_trade import DuckTradeLog
from application.models.message import Message
from application.models.session_log import SessionLog
from application.models.user_certificate import UserCertificate


def check_achievement(user, achievement, stats=None):
    """Return True if the user meets the condition for this achievement."""
    if stats is None:
        stats = {}

    try:
        requirement = int(achievement.requirement_value)
    except (ValueError, TypeError):
        requirement = 0

    value_getters = {
        "ducks": lambda: user.earned_ducks,
        "project": lambda: len(user.projects),
        "progress": lambda: (
            user.get_progress(achievement.source) if achievement.source else 0
        ),
        # Count all messages sent by the user
        "chat": lambda: (
            stats.get("chat_count")
            if "chat_count" in stats
            else db.session.query(func.count(Message.id))
            .filter(Message.user_id == user.id)
            .scalar()
        ),
        # Count how many consecutive weeks with challenges
        "consistency": lambda: (
            stats.get("consistency_streak")
            if "consistency_streak" in stats
            else _calculate_consistency(user.username)
        ),
        # Count how many times someone entered them as a helper
        "community": lambda: (
            stats.get("community_count")
            if "community_count" in stats
            else db.session.query(func.count(ChallengeLog.id))
            .filter(func.lower(ChallengeLog.helper) == user.username.lower())
            .scalar()
        ),
        # Longest session length in minutes
        "session": lambda: (
            stats.get("max_session")
            if "max_session" in stats
            else longest_session_minutes(user.id)
        ),
        # Count number of trades (regardless of status)
        "trade": lambda: (
            stats.get("trade_count")
            if "trade_count" in stats
            else db.session.query(func.count(DuckTradeLog.id))
            .filter(func.lower(DuckTradeLog.username) == user.username.lower())
            .scalar()
        ),
        # Certificate submitted or not
        "certificate": lambda: (
            1
            if UserCertificate.query.filter_by(
                user_id=user.id, achievement_id=achievement.id
            ).first()
            else 0
        ),
    }

    value = value_getters.get(achievement.type, lambda: 0)()
    return value >= requirement


def get_achievement_progress(user, achievement, stats=None):
    """Return (current_value, requirement_value) for progress tracking."""
    if stats is None:
        stats = {}

    try:
        requirement = int(achievement.requirement_value)
    except (ValueError, TypeError):
        requirement = 0

    value_getters = {
        "ducks": lambda: user.earned_ducks,
        "project": lambda: len(user.projects),
        "progress": lambda: (
            user.get_progress(achievement.source) if achievement.source else 0
        ),
        "chat": lambda: (
            stats.get("chat_count")
            if "chat_count" in stats
            else db.session.query(func.count(Message.id))
            .filter(Message.user_id == user.id)
            .scalar()
        ),
        "consistency": lambda: (
            stats.get("consistency_streak")
            if "consistency_streak" in stats
            else _calculate_consistency(user.username)
        ),
        "community": lambda: (
            stats.get("community_count")
            if "community_count" in stats
            else db.session.query(func.count(ChallengeLog.id))
            .filter(func.lower(ChallengeLog.helper) == user.username.lower())
            .scalar()
        ),
        "session": lambda: (
            stats.get("max_session")
            if "max_session" in stats
            else longest_session_minutes(user.id)
        ),
        "trade": lambda: (
            stats.get("trade_count")
            if "trade_count" in stats
            else db.session.query(func.count(DuckTradeLog.id))
            .filter(func.lower(DuckTradeLog.username) == user.username.lower())
            .scalar()
        ),
        "certificate": lambda: (
            1
            if UserCertificate.query.filter_by(
                user_id=user.id, achievement_id=achievement.id
            ).first()
            else 0
        ),
    }

    value = value_getters.get(achievement.type, lambda: 0)()
    return value, requirement


def _calculate_consistency(username):
    """
    Count how many consecutive weeks the user has challenge logs.
    """
    logs = (
        db.session.query(ChallengeLog.timestamp)
        .filter(func.lower(ChallengeLog.username) == username.lower())
        .order_by(ChallengeLog.timestamp.asc())
        .all()
    )
    if not logs:
        return 0

    # Extract weeks (year, weeknum)
    weeks = sorted({ts[0].isocalendar()[:2] for ts in logs})

    streak = 1
    best_streak = 1
    for i in range(1, len(weeks)):
        prev_year, prev_week = weeks[i - 1]
        curr_year, curr_week = weeks[i]

        # Handle year transition
        if (curr_year == prev_year and curr_week == prev_week + 1) or (
            curr_year == prev_year + 1 and prev_week == 52 and curr_week == 1
        ):
            streak += 1
            best_streak = max(best_streak, streak)
        else:
            streak = 1

    return best_streak


def evaluate_user(user, force=False):
    """Evaluate all achievements for a given user with 1-hour throttling and pessimistic locking."""
    now = datetime.utcnow()

    # Use pessimistic locking to prevent concurrent evaluations
    # Lock the user row to ensure only one evaluation runs at a time
    user = db.session.query(user.__class__).with_for_update().filter_by(id=user.id).first()
    if not user:
        return []

    # Throttle: Only evaluate once every 60 minutes unless forced
    if not force and user.last_achievement_evaluation:
        elapsed = (now - user.last_achievement_evaluation).total_seconds()
        if elapsed < 3600:  # 60 minutes
            return []

    # Pre-calculate common stats for the entire evaluation pass
    # This avoids N extra queries inside the loop below.
    from application.models.duck_trade import DuckTradeLog

    stats = {
        "chat_count": db.session.query(func.count(Message.id))
        .filter(Message.user_id == user.id)
        .scalar(),
        "consistency_streak": _calculate_consistency(user.username),
        "community_count": db.session.query(func.count(ChallengeLog.id))
        .filter(func.lower(ChallengeLog.helper) == user.username.lower())
        .scalar(),
        "max_session": longest_session_minutes(user.id),
        "trade_count": db.session.query(func.count(DuckTradeLog.id))
        .filter(func.lower(DuckTradeLog.username) == user.username.lower())
        .scalar(),
    }

    earned_ids = {ua.achievement_id for ua in user.achievements}
    new_awards = []

    # Optimization: Only query definitions once
    all_achievements = Achievement.query.all()

    for achievement in all_achievements:
        if achievement.id in earned_ids:
            continue
        if check_achievement(user, achievement, stats=stats):
            ua = UserAchievement(user_id=user.id, achievement_id=achievement.id)
            db.session.add(ua)
            # grant ducks reward
            if achievement.reward > 0:
                user.add_ducks(achievement.reward)

            new_awards.append(achievement)

    # Always update the last evaluation timestamp if we successfully ran
    user.last_achievement_evaluation = now
    db.session.commit()

    return new_awards


def longest_session_minutes(user_id):
    """Calculate max session duration for a specific user."""
    # Fixed: Filter by user_id instead of querying .all()
    logs = SessionLog.query.filter_by(user_id=user_id).all()

    max_duration = 0
    now = datetime.utcnow()
    for log in logs:
        end = log.end_time or now
        duration = (end - log.start_time).total_seconds()
        if duration > max_duration:
            max_duration = duration
    return max_duration / 60
