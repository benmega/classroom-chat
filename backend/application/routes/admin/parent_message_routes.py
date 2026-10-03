"""
File: parent_message_routes.py
Type: py
Summary: Admin routes for listing and resolving parent messages and inquiries.
"""

from datetime import datetime

from application.decorators.admin_required import admin_only
from application.decorators.api_response import api_response
from application.extensions import db
from application.models.parent_message import ParentMessage
from flask import request, session

from ..admin_routes import admin_bp


VALID_STATUS_FILTERS = {"pending", "resolved", "all"}
MAX_LIST_RESULTS = 200


@admin_bp.route("/parent-messages", methods=["GET"])
@admin_only
@api_response
def list_parent_messages():
    status = request.args.get("status", "pending")
    if status not in VALID_STATUS_FILTERS:
        return "Invalid status filter.", 400

    query = ParentMessage.query
    if status != "all":
        query = query.filter(ParentMessage.status == status)

    messages = (
        query.order_by(ParentMessage.created_at.desc())
        .limit(MAX_LIST_RESULTS)
        .all()
    )
    return {"messages": [m.to_dict() for m in messages]}


@admin_bp.route("/parent-messages/<int:msg_id>/resolve", methods=["POST"])
@admin_only
@api_response
def resolve_parent_message(msg_id):
    parent_msg = db.session.get(ParentMessage, msg_id)
    if not parent_msg:
        return "Parent message not found.", 404

    if parent_msg.status == "resolved":
        # Already resolved: keep the original resolved_at / resolved_by.
        return {"message": "Parent message was already resolved.", "item": parent_msg.to_dict()}

    parent_msg.status = "resolved"
    parent_msg.resolved_at = datetime.utcnow()
    parent_msg.resolved_by_id = session.get("user")

    db.session.commit()
    return {"message": "Parent message marked as resolved.", "item": parent_msg.to_dict()}
