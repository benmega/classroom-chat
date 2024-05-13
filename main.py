from flask import Flask, render_template, jsonify, request
from models import db, User
import openai
from config import Config

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)

# Your conversation history and AI role
conversation_history = []
ai_role = '''I am an elementary teacher.
    My goal is to provide easy to understand answers that, while possibly simplified, give an understand of what is."
'''
ai_username = "AI Teacher"
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/send_message', methods=['POST'])
def send_message():
    print('sending message')
    user_ip = request.remote_addr
    username = request.form['username']
    user = User.query.filter_by(ip_address=user_ip).first()

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
    # Assuming you're storing the message history somewhere
    conversation_history.append((username, user_message))

    # Concatenate all pending messages
    prompt = ai_role + " " + " ".join([message for user, message in conversation_history])

    # Send to OpenAI and get response
    noChatBot = True  # TODO make easy to switch on and off
    if noChatBot:
        return jsonify(success=True)
    response = openai.Completion.create(
        engine="text-davinci-003",
        prompt=prompt,
        max_tokens=150
    )
    conversation_history.append((ai_username, response.choices[0].text))
    # TODO Add optional wait time based on length of message so as to appear more realistic
    return jsonify(success=True)


@app.route('/get_conversation', methods=['GET'])
def get_conversation():
    return jsonify(conversation_history=conversation_history)


@app.route('/set_username', methods=['POST'])
def set_username():
    username = request.form['username']
    # Logic to update the username in your database or session
    return jsonify({'success': True})

@app.route('/verify_password', methods=['POST'])
def verify_password():
    username = request.form['username']
    password = request.form['password']
    if password == '1234':  # Normally, you'd use a more secure comparison method
        # Update username logic here (e.g., update session or database)
        return jsonify(success=True)
    else:
        return jsonify(success=False), 401

with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')
