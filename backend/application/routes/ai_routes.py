"""
File: ai_routes.py
Type: py
Summary: Flask routes for ai routes functionality.
"""

from flask import Blueprint, g, jsonify, request

from application.ai.ai_teacher import get_ai_response
from application.decorators.login_required import require_login

ai = Blueprint("ai", __name__)


@ai.route("/get_ai_response", methods=["POST"])
@require_login
def handle_ai_query():
    user_message = (request.form.get("message") or "").strip()
    if not user_message:
        return jsonify(success=False, error="Message is required"), 400

    # Identity comes from the session — never from a client-supplied username.
    response = get_ai_response(user_message, g.user.username)
    if response:
        return jsonify(success=True, ai_response=response)
    else:
        return jsonify(success=False, ai_response=response)
