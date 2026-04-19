from application import create_app
from application.models.user import User
from application.models.challenge_log import ChallengeLog

app = create_app()
with app.app_context():
    u = User.query.filter_by(_username='ben').first()
    if u:
        count = ChallengeLog.query.filter_by(username=u.username).count()
        print(f"User {u.username} has {count} challenge logs")
        
        # Check specific domains
        oz_count = ChallengeLog.query.filter_by(username=u.username, domain='www.ozaria.com').count()
        cc_count = ChallengeLog.query.filter_by(username=u.username, domain='codecombat.com').count()
        print(f"Ozaria: {oz_count}, CodeCombat: {cc_count}")
    else:
        print("Admin user not found")
