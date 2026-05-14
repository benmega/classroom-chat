import sqlite3
import os

db_path = r'c:\Users\Ben\AntiGravity\classroom-chat\backend\instance\dev_users.db'

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

def check_table(table_name):
    print(f"\n--- Checking table: {table_name} ---")
    try:
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns = cursor.fetchall()
        for col in columns:
            print(col)
        
        cursor.execute(f"SELECT * FROM {table_name} LIMIT 10")
        rows = cursor.fetchall()
        for row in rows:
            print(row)
            for i, val in enumerate(row):
                if val is not None:
                    print(f"  Col {i} ({columns[i][1]}): type={type(val)}, value={val}")
    except Exception as e:
        print(f"Error checking table {table_name}: {e}")

check_table("conversations")
check_table("classrooms")
check_table("users")

conn.close()
