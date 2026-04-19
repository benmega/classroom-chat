
from application import create_app
from application.models.conversation import Conversation
from application.models.message import Message

app = create_app()
with app.app_context():
    user_id = 30 # blossomstudent02
    conversations = (
        Conversation.query.filter(Conversation.users.any(id=user_id))
        .all()
    )
    print(f"User {user_id} has {len(conversations)} conversations.")
    for conv in conversations:
        print(f"ID: {conv.id}, Title: {conv.title}")
        msg_count = Message.query.filter_by(conversation_id=conv.id).count()
        print(f"  Messages: {msg_count}")
