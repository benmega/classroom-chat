
from application import create_app
from application.models.conversation import Conversation

app = create_app()
with app.app_context():
    convs = Conversation.query.filter(Conversation.title.like("New Chat on April 07, 2026%")).all()
    print(f"Found {len(convs)} conversations with that title.")
    for c in convs:
        print(f"ID: {c.id}, Created At: {c.created_at}")
