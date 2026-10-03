import os
from application.decorators.admin_required import admin_only
from application.decorators.api_response import api_response
from application.extensions import db
from application.models.message import Message, message_classrooms, message_users
from sqlalchemy import func, select

from ..admin_routes import admin_bp

@admin_bp.route("/advanced/purge-history", methods=["POST"])
@admin_only
@api_response
def purge_history():
    """
    Permanently deletes all message and conversation history.
    This is a destructive action.
    """
    try:
        num_messages = Message.query.count()
        # SQLite does not enforce the audience tables' ON DELETE CASCADE here, and it
        # reuses message ids, so a later message would inherit a purged one's audience
        db.session.execute(message_classrooms.delete())
        db.session.execute(message_users.delete())
        Message.query.delete(synchronize_session=False)

        db.session.commit()

        return {
            "message": "History purged successfully.",
            "deleted_messages": num_messages,
        }
    except Exception as e:
        db.session.rollback()
        return {"error": f"Failed to purge history: {e!s}"}, 500
