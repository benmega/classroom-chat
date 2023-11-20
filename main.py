from flask import Flask, render_template, request, jsonify
import openai
import os

#Service access at http://192.168.1.37:5000/
#Blossom 192.168.1.136
# Set your OpenAI API key


openai.api_key = os.environ.get('OPEN_AI_API_KEY')


app = Flask(__name__, static_url_path='/templates', static_folder='templates')

# Your conversation history and AI role
conversation_history = []
#ai_role = "I am trying to impersonate a human."
ai_role = "I am an elementary teacher. My goal is to provide easy to understand answers that, while possibly simplified, give an understand of what is."
#ai_role = "I am a DND dungeon master" #meh
#ai_role = "I am the computer in the text adventure game Zork first released in 1977 by developers Tim Anderson"
ai_username = "AI Teacher"

@app.route('/')
def index():
    return render_template('index.html', conversation_history=conversation_history)

@app.route('/set_role', methods=['POST'])
def set_role():
    global ai_role
    ai_role = request.form['role']
    return jsonify(success=True)

@app.route('/get_conversation', methods=['GET'])
def get_conversation():
    return jsonify(conversation_history=conversation_history)

@app.route('/send_message', methods=['POST'])
def send_message():
    print("Received data:", request.form)

    user_message = request.form['message']
    username = request.form['username']
    conversation_history.append((username, user_message))

    # Concatenate all pending messages
    prompt = ai_role + " " + " ".join([message for user, message in conversation_history])

    # Send to OpenAI and get response
    noChatBot = True # TODO make easy to switch on and of f
    if noChatBot:
        return jsonify(success=True)
    response = openai.Completion.create(
      engine="text-davinci-003",
      prompt=prompt,
      max_tokens=150
    )
    conversation_history.append((ai_username, response.choices[0].text))
    #TODO Add optional wait time based on length of message so as to appear more realistic
    return jsonify(success=True)


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')
