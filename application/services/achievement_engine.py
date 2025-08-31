# application/services/achievement_engine.py
from application.extensions import db
from application.models.achievements import Achievement, UserAchievement
from application.models.user_certificate import UserCertificate


def check_achievement(user, achievement):
    """Return True if the user meets the condition for this achievement."""
    if achievement.type == "ducks":
        return user.ducks >= int(achievement.requirement_value)

    elif achievement.type == "project":
        return len(user.projects) >= int(achievement.requirement_value)

    elif achievement.type == "challenge":
        return user.get_progress("codecombat.com") >= int(achievement.requirement_value)

    elif achievement.type == "custom":
        # Check if user has submitted a certificate for this achievement
        cert = UserCertificate.query.filter_by(
            user_id=user.id, achievement_id=achievement.id
***REMOVED***.first()
        return cert is not None

    return False


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
                user.ducks += achievement.reward

            new_awards.append(achievement)

    if new_awards:
        db.session.commit()

    return new_awards