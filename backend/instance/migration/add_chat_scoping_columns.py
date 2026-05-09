import sqlite3
import os

def migrate():
    db_path = os.path.join(os.path.dirname(__file__), '..', 'prod_users.db')
    if not os.path.exists(db_path):
        db_path = os.path.join(os.path.dirname(__file__), '..', 'dev_users.db')
    
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    print(f"Migrating database at {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Add columns to conversations
        cursor.execute("ALTER TABLE conversations ADD COLUMN classroom_id TEXT REFERENCES classrooms(id)")
        cursor.execute("ALTER TABLE conversations ADD COLUMN is_locked BOOLEAN DEFAULT 0")
        cursor.execute("ALTER TABLE conversations ADD COLUMN slow_mode_delay INTEGER DEFAULT 0")
        print("Updated 'conversations' table.")
    except sqlite3.OperationalError as e:
        print(f"Note: {e}")

    try:
        # Add columns to users
        cursor.execute("ALTER TABLE users ADD COLUMN classroom_id TEXT REFERENCES classrooms(id)")
        print("Updated 'users' table.")
    except sqlite3.OperationalError as e:
        print(f"Note: {e}")

    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
