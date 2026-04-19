from application import create_app
from application.models.user import User
from application.models.message import Message
from application.models.achievements import UserAchievement, Achievement
from application.models.challenge_log import ChallengeLog
from application.models.duck_trade import DuckTradeLog
from application.services.achievement_engine import check_achievement

app = create_app()
with app.app_context():
    users = User.query.all()
    achievements = Achievement.query.all()
    ach_map = {a.id: a for a in achievements}
    
    inconsistencies = []
    
    for u in users:
        earned_uas = UserAchievement.query.filter_by(user_id=u.id).all()
        for ua in earned_uas:
            ach = ach_map.get(ua.achievement_id)
            if not ach: continue
            
            # Re-check requirement
            if not check_achievement(u, ach):
                inconsistencies.append({
                    "user": u.username,
                    "achievement": ach.slug,
                    "requirement": ach.requirement_value,
                    "earned_at": ua.earned_at
                })
                
    if inconsistencies:
        print(f"Found {len(inconsistencies)} inconsistencies:")
        for inc in inconsistencies[:20]:
            print(f"- User: {inc['user']}, Ach: {inc['achievement']}, Req: {inc['requirement']}, earned at {inc['earned_at']}")
    else:
        print("No inconsistencies found!")
