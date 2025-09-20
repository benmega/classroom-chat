# application/services/achievement_engine.py
from application.extensions import db
from application.models.achievements import Achievement, UserAchievement
from application.models.challenge_log import ChallengeLog
from application.models.duck_trade import DuckTradeLog
from application.models.user_certificate import UserCertificate


from sqlalchemy import func
from application.extensions import db
from application.models.message import Message


def check_achievement(user, achievement):
    """Return True if the user meets the condition for this achievement."""
    requirement = int(achievement.requirement_value)

    value_getters = {
        "ducks": lambda: user.earned_ducks,
        "project": lambda: len(user.projects),
        "progress": lambda: user.get_progress(achievement.source) if achievement.source else 0,

        # Count all messages sent by the user
        "chat": lambda: db.session.query(func.count(Message.id))
                           .filter(Message.user_id == user.id).scalar(),

        # Count how many consecutive weeks with challenges
        "consistency": lambda: _calculate_consistency(user.username),

        # Count how many times someone entered them as a helper
        "community": lambda: db.session.query(func.count(ChallengeLog.id))
                             .filter(ChallengeLog.helper == user.username).scalar(),

        # Still undefined
        "session": lambda: 0,  # TODO add sessionlog table and track login and logouts

        # Count number of trades (regardless of status)
        "trade": lambda: db.session.query(func.count(DuckTradeLog.id))
                             .filter(DuckTradeLog.username == user.username).scalar(),

        # Certificate submitted or not
        "certificate": lambda: (
            1 if UserCertificate.query.filter_by(
                user_id=user.id, achievement_id=achievement.id
            ).first() else 0
        ),
    }

    value = value_getters.get(achievement.type, lambda: 0)()
    return value >= requirement


def _calculate_consistency(username):
    """
    Count how many consecutive weeks the user has challenge logs.
    """
    logs = (
        db.session.query(ChallengeLog.timestamp)
        .filter(ChallengeLog.username == username)
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


def evaluate_user(user):
    """Evaluate all achievements for a given user, grant new ones."""
    earned_ids = {ua.achievement_id for ua in user.achievements}
    new_awards = []
    for achievement in Achievement.query.all():
        if achievement.id in earned_ids:
            continue
        if check_achievement(user, achievement):
            # grant achievement
            ua = UserAchievement(user_id=user.id, achievement_id=achievement.id)
            db.session.add(ua)
            print(f"{user.nickname} just complete {achievement.name}")
            # grant ducks reward
            if achievement.reward > 0:
                # TODO uncomment once feature ready to ship
                pass
                # user.add_ducks(achievement.reward)

            new_awards.append(achievement)

    if new_awards:
        db.session.commit()

    return new_awards