
from application import create_app
from application.extensions import db
from application.models.message import Message
from application.models.conversation import Conversation
from application.models.user import User

app = create_app()
with app.app_context():
    print("--- Conversations ---")
    convs = Conversation.query.order_by(Conversation.created_at.desc()).limit(5).all()
    for c in convs:
        print(f"ID: {c.id}, Title: {c.title}, Users: {[u.username for u in c.users]}")
        msgs = Message.query.filter_by(conversation_id=c.id).order_by(Message.created_at.desc()).limit(3).all()
        for m in msgs:
            print(f"  - Msg ID: {m.id}, Content: {m.content}, User: {m.user.username if m.user else 'N/A'}")

    print("\n--- Recent Messages ---")
    recent_msgs = Message.query.order_by(Message.created_at.desc()).limit(10).all()
    for m in recent_msgs:
        print(f"ID: {m.id}, ConvID: {m.conversation_id}, Content: {m.content}, UserID: {m.user_id}")
