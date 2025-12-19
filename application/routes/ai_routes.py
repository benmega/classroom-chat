"""
File: ai_routes.py
Type: py
Summary: Flask routes for ai routes functionality.
"""

from flask import Blueprint, jsonify, request

from application.ai.ai_teacher import get_ai_response
from application.decorators.licensing import premium_required

ai = Blueprint("ai", __name__)


@ai.route("/get_ai_response", methods=["POST"])
@premium_required
def ai_response():
    user_message = request.form["message"]
    username = request.form["username"]

    response = get_ai_response(user_message, username)
    if response:
        return jsonify(success=True, ai_response=response)
    else:
        return jsonify(success=False, ai_response=response)
