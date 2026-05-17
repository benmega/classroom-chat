from application.extensions import db
from application.models.project import Project
from application import create_app

app = create_app()

with app.app_context():
    projects = Project.query.filter(Project.name.ilike('%Classroom Chat%')).all()
    if not projects:
        print("No project named Classroom Chat found.")
    else:
        for p in projects:
            p.image_url = 'classroom_chat_screenshot.png'
            p.code_snippet = """// Socket.io Client for Real-time Chat
import { io } from 'socket.io-client';

const socket = io('http://localhost:8000', {
    auth: { token: localStorage.getItem('token') }
});

socket.on('message', (data) => {
    dispatch({ type: 'RECEIVE_MESSAGE', payload: data });
    scrollToBottom();
});

export const sendMessage = (text, conversationId) => {
    socket.emit('send_message', { text, conversationId });
};"""
            print(f"Updated project {p.id}")
        db.session.commit()
        print("Done.")
