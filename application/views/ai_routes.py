from flask import Blueprint, jsonify, request
from application.ai.ai_teacher import get_ai_response

ai_bp = Blueprint('ai_bp', __name__)


@ai_bp.route('/get_ai_response', methods=['POST'])
def ai_response():
    user_message = request.form['message']
    username = request.form['username']
    # Call AI logic here...
    return jsonify(success=True, ai_response=get_ai_response(user_message, username))
