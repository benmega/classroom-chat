import sqlite3
import os

db_path = r'c:\Users\Ben\AntiGravity\classroom-chat\backend\instance\dev_users.db'
if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
else:
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute('SELECT username, profile_picture FROM users')
    rows = cur.fetchall()
    for row in rows:
        print(f"{row[0]}: {row[1]}")
    conn.close()
