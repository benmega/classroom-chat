import os
import re

DIR = r"C:\Users\Ben\AntiGravity\classroom-chat\backend"

REPLACEMENTS = [
    # In queries and initialization for ChallengeLog and DuckTradeLog
    (r"ChallengeLog\.query\.filter_by\(username=sample_user\.username\)",
     r"ChallengeLog.query.filter_by(user_id=sample_user.id)"),
    (r"DuckTradeLog\.query\.filter_by\(username=sample_user_with_ducks\.username\)",
     r"DuckTradeLog.query.filter_by(user_id=sample_user_with_ducks.id)"),
    (r"DuckTradeLog\.query\.filter_by\(username=sample_user_with_ducks\.username, status=\"pending\"\)",
     r"DuckTradeLog.query.filter_by(user_id=sample_user_with_ducks.id, status=\"pending\")"),
    
    (r"ChallengeLog\(username=sample_user\.username,", r"ChallengeLog(user_id=sample_user.id,"),
    (r"DuckTradeLog\(username=sample_user_with_ducks\.username,", r"DuckTradeLog(user_id=sample_user_with_ducks.id,"),
    
    (r"ChallengeLog\(username=\"testuser\",", r"ChallengeLog(user_id=999,"), # hack for test_challenge_log.py since user might not exist, but let's see
    (r"ChallengeLog\(username=\"test_user\",", r"ChallengeLog(user_id=888,"),
]



for root, _, files in os.walk(os.path.join(DIR, 'tests')):
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

            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as file:
                    file.write(new_content)
                print(f"Updated {filepath}")
