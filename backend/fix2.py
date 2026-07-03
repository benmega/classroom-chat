import os

socket_py = 'application/socket_events.py'
with open(socket_py, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('_active_sessions = {}', '_active_sessions: dict = {}')
with open(socket_py, 'w', encoding='utf-8') as f:
    f.write(content)

ai_py = 'application/ai/ai_teacher.py'
with open(ai_py, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('for achievement in current_user.achievements:', 'for achievement in current_user.achievements:  # type: ignore[attr-defined]')
with open(ai_py, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed!")
