import sqlite3
import os

db_path = "instance/dev_users.db"
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute("DROP TABLE _alembic_tmp_achievement")
        print("Dropped _alembic_tmp_achievement")
    except Exception as e:
        print(f"Error or table not found: {e}")
    conn.commit()
    conn.close()
else:
    print("DB not found")
