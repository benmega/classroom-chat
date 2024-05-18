from flask import Blueprint, request, jsonify
from application.models.user import db, User

admin_bp = Blueprint('admin_bp', __name__)

@admin_bp.route('/users', methods=['GET'])
def get_users():
    if request.args.get('username') != 'Mr. Mega' or request.args.get('password') != '1234':
        return jsonify({"error": "Unauthorized"}), 401
    users = User.query.all()
    users_data = [{"id": user.id, "username": user.username, "ip_address": user.ip_address, "is_ai_teacher": user.is_ai_teacher} for user in users]
    return jsonify(users_data)

@admin_bp.route('/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    if request.form['username'] != 'Mr. Mega' or request.form['password'] != '1234':
        return jsonify({"error": "Unauthorized"}), 401
    user = User.query.get(user_id)
    if user:
        user.username = request.form.get('username', user.username)
        user.is_ai_teacher = request.form.get('is_ai_teacher', user.is_ai_teacher) in ['true', 'True', '1']
        db.session.commit()
        return jsonify({"success": True})
    return jsonify({"error": "User not found"}), 404
