
from application import create_app
from application.extensions import db
from application.models.conversation import Conversation
from application.routes.message_routes import serialize_message

app = create_app()
with app.app_context():
    user_id = 32 # blossomstudent01
    conversations = (
        Conversation.query.filter(Conversation.users.any(id=user_id))
        .order_by(Conversation.created_at.desc())
        .all()
    )
    print(f"User {user_id} has {len(conversations)} conversations.")
    for conv in conversations:
        print(f"Conv ID: {conv.id}, Title: {conv.title}")
        msgs = [msg for msg in conv.messages if not msg.is_struck]
        print(f"  Messages count: {len(msgs)}")
        for m in msgs[-5:]:
            print(f"    - [{m.user.username if m.user else 'N/A'}] {m.content}")
