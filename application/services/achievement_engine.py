# application/services/achievement_engine.py
from application.extensions import db
from application.models.achievements import Achievement, UserAchievement

def check_achievement(user, achievement):
    """Return True if the user meets the condition for this achievement."""
    if achievement.type == "ducks":
        return user.ducks >= int(achievement.requirement_value)

    elif achievement.type == "project":
        return len(user.projects) >= int(achievement.requirement_value)

    elif achievement.type == "challenge":
        return user.get_progress("codecombat.com") >= int(achievement.requirement_value)

    elif achievement.type == "custom":
        # TODO: plug in your own callable registry for custom checks
        return False

    return False


def evaluate_user(user):
    """Evaluate all achievements for a given user, grant new ones."""
    earned_ids = {ua.achievement_id for ua in user.achievements}

    new_awards = []
    for achievement in Achievement.query.all():
        if achievement.id in earned_ids:
            continue
        if check_achievement(user, achievement):
            ua = UserAchievement(user_id=user.id, achievement_id=achievement.id)
            db.session.add(ua)
            new_awards.append(achievement)

    if new_awards:
        db.session.commit()

    return new_awards
