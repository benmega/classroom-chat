
import sqlite3
import os

db_path = r'c:\Users\Ben\AntiGravity\classroom-chat\backend\instance\dev_users.db'
if not os.path.exists(db_path):
    print(f"DB not found at {db_path}")
    exit()

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# List tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
print("Tables:", tables)

# Inspect projects
cursor.execute("SELECT * FROM projects;")
projects = cursor.fetchall()
print("\nProjects:")
for p in projects:
    print(p)

conn.close()
