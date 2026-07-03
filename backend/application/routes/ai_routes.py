"""
File: ai_routes.py
Type: py
Summary: Flask routes for ai routes functionality.
"""

from flask import Blueprint, jsonify, request

from application.ai.ai_teacher import get_ai_response


ai = Blueprint("ai", __name__)


@ai.route("/get_ai_response", methods=["POST"])

def handle_ai_query():
    user_message = request.form["message"]
    username = request.form["username"]

    response = get_ai_response(user_message, username)
    if response:
        return jsonify(success=True, ai_response=response)
    else:
        return jsonify(success=False, ai_response=response)
