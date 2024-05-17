# server/ai_teacher.py

import openai

from config import Config

# Your conversation history and AI role
conversation_history = []  # TODO: Add GUI to clear. (teacher only)
ai_role = '''Answer computer science questions about Python.
The students are learning using the programs Code Combat and Ozaria.
'''  # TODO: Add GUI to change (teacher only)
ai_username = "AI Teacher"  # TODO: Add GUI to change (teacher only)
ChatBotEnabled = False  # TODO: Add GUI to toggle (teacher only)
openai.api_key = Config.OPENAI_API_KEY

def get_ai_response(user_message, username):
    conversation_history.append((username, user_message))
    prompt = ai_role + " " + " ".join([message for user, message in conversation_history])

    if not ChatBotEnabled:
        return ""

    response = openai.Completion.create(
        engine="text-davinci-003",
        prompt=prompt,
        max_tokens=150
    )
    ai_response = response['choices'][0]['text']
    conversation_history.append((ai_username, ai_response))
    return ai_response
