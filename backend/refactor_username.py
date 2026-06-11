import os
import re

DIR = r"C:\Users\Ben\AntiGravity\classroom-chat\backend"

REPLACEMENTS = [
    # Models
    (r"id = db.Column\(db.Integer, primary_key=True\)\s*username = db.Column\(db.String\(100\), nullable=False, index=True\)",
     r"id = db.Column(db.Integer, primary_key=True)\n    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)"),
    (r"username = db.Column\(\s*db.String\(80\), db.ForeignKey\(\"users.username\"\), nullable=False, index=True\s*\)",
     r"user_id = db.Column(\n        db.Integer, db.ForeignKey(\"users.id\"), nullable=False, index=True\n    )"),
    
    # User model challenge_logs relationship
    (r"primaryjoin=\"User._username == foreign\(ChallengeLog.username\)\"",
     r"primaryjoin=\"User.id == foreign(ChallengeLog.user_id)\""),
    
    # Queries using .username =
    (r"ChallengeLog\.query\.filter_by\(\s*username=", r"ChallengeLog.query.filter_by(\n            user_id="),
    (r"DuckTradeLog\.query\.filter_by\(\s*username=", r"DuckTradeLog.query.filter_by(user_id="),

    # Wait, in user.py:
    (r"username=self\._username", r"user_id=self.id"),

    # DuckTradeLog to_dict
    (r"\"username\": self\.username,", r"\"user_id\": self.user_id,"),

    # ChallengeLog repr
    (r"username=\{self\.username\}", r"user_id={self.user_id}"),
]

for root, _, files in os.walk(DIR):
    for f in files:
        if f.endswith(".py"):
            filepath = os.path.join(root, f)
            try:
                with open(filepath, 'r', encoding='utf-8') as file:
                    content = file.read()
            except UnicodeDecodeError:
                continue

            new_content = content
            for old, new in REPLACEMENTS:
                new_content = re.sub(old, new, new_content)

            # Extra manual-like replacements
            # If username was used as an arg in log_challenge, etc. Let's see.

            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as file:
                    file.write(new_content)
                print(f"Updated {filepath}")
