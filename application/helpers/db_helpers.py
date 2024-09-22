from application.models.conversation import Conversation
from application.models.user import User, db
from application.utilities.helper_functions import request_database_commit
import uuid

def get_or_make_user(user_ip, form_username="", admin_override=False):
    user = User.query.filter_by(ip_address=user_ip).first()
    if user:
        if admin_override and user.username != form_username:
            user.username = form_username
    else:
        user = User(ip_address=user_ip, username=form_username or generate_unique_username())
        db.session.add(user)
    success = request_database_commit()
    return user if success else None

def save_message_to_db(user_id, message):
    conversation = Conversation(message=message, user_id=user_id)
    db.session.add(conversation)
    return request_database_commit()

def generate_unique_username():
    return f"user_{uuid.uuid4()}"
