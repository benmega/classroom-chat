import os

from flask import Flask, render_template, jsonify, request
from server.models import db, User
from server.ai_teacher import get_ai_response, conversation_history
from config import Config

# TODO make object-oriented.APP
# Your conversation history and AI role
conversation_history = []  # TODO add GUI to clear. (teacher only)
ai_role = '''Answer computer science questions about Python. 
The students are learnign using the programs Code Combat and Ozaria.

'''  # TODO add GUI to change (teacher only)
ai_username = "AI Teacher"  # TODO add GUI to change (teacher only)
ChatBotEnabled = True  # TODO add GUI to toggle (teacher only)


def create_app():
    app = Flask(__name__, static_folder=Config.STATIC_FOLDER, template_folder=Config.TEMPLATE_FOLDER)
    app.config.from_object(Config)
    db.init_app(app)
    @app.route('/')
    def index():
        return render_template('index.html')

    @app.route('/send_message', methods=['POST'])
    def send_message():

        # TODO refactor to part of the user object
        # TODO make user object
        user_ip = request.remote_addr
        username = request.form['username']
        user = User.query.filter_by(ip_address=user_ip).first()
        print(f'sending message from {user_ip} ({username})')
        if user:
            if not username:
                username = user.username
            elif user.username != username:
                print(f"Updating user from {user.username} to {username}")
                user.username = username
                try:
                    db.session.commit()
                except Exception as e:
                    print(f"Database error: {e}")
                    db.session.rollback()  # Roll back on error
        else:
            print("No user found, creating a new one.")
            user = User(ip_address=user_ip, username=username)
            db.session.add(user)
            db.session.commit()

        user_message = request.form['message']
        conversation_history.append((username, user_message))

        if not ChatBotEnabled:
            return jsonify(success=True)

        return jsonify(success=True, ai_response=get_ai_response(user_message, username))

    @app.route('/get_conversation', methods=['GET'])
    def get_conversation():
        return jsonify(conversation_history=conversation_history)

    @app.route('/set_username', methods=['POST'])
    def set_username():
        username = request.form['username']
        return jsonify({'success': True})

    @app.route('/verify_password', methods=['POST'])
    def verify_password():
        password = request.form['password']
        if password == '1234':
            return jsonify(success=True)
        else:
            return jsonify(success=False), 401

    with app.app_context():
        db.create_all()

    @app.route('/admin/users', methods=['GET'])
    def get_users():
        if request.args.get('username') != 'Mr. Mega' or request.args.get('password') != '1234':
            return jsonify({"error": "Unauthorized"}), 401
        users = User.query.all()
        users_data = [{"id": user.id, "username": user.username, "ip_address": user.ip_address, "is_ai_teacher": user.is_ai_teacher} for user in users]
        return jsonify(users_data)

    @app.route('/admin/users/<int:user_id>', methods=['PUT'])
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

    with app.app_context():
        db.create_all()

    return app
