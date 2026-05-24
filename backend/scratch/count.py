from application import create_app
from application.extensions import db
from sqlalchemy import text

app = create_app()
with app.app_context():
    # check if course_instance is populated
    count = db.session.execute(text("SELECT COUNT(*) FROM challenge_logs WHERE course_instance != '' AND course_instance IS NOT NULL")).scalar()
    print("Course instance populated count:", count)
    
    # Let's also check conversations
    convs = db.session.execute(text("SELECT COUNT(*) FROM conversation_users")).scalar()
    print("Conversation users count:", convs)
