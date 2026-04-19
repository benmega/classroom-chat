
import sys
from application import create_app
from application.extensions import db
from application.models.conversation import Conversation
from application.models.message import Message

# Set encoding to utf-8 for printing emojis if needed, or just replace them
sys.stdout.reconfigure(encoding='utf-8')

app = create_app()
with app.app_context():
    conv_id = 362
    conv = Conversation.query.get(conv_id)
    if conv:
        print(f"--- Conversation {conv_id} ---")
        msgs = Message.query.filter_by(conversation_id=conv_id).order_by(Message.created_at.asc()).all()
        print(f"Total messages: {len(msgs)}")
        for m in msgs[-10:]:
            content = m.content.encode('ascii', 'replace').decode('ascii')
            username = m.user.username if m.user else 'N/A'
            print(f"ID: {m.id}, User: {username} (ID {m.user_id}), Content: {content}")
    else:
        print(f"Conversation {conv_id} not found")
