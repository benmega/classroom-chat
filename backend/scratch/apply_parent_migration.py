"""
One-time migration script to add 'role' column to users table
and create 'parent_students' association table.
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "instance", "dev_users.db")
DB_PATH = os.path.abspath(DB_PATH)

print(f"Target DB: {DB_PATH}")

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Check if role column already exists
cursor.execute("PRAGMA table_info(users)")
columns = [col[1] for col in cursor.fetchall()]
print(f"Current users columns: {columns}")

if "role" not in columns:
    cursor.execute('ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT "student"')
    print("Added 'role' column to users table.")
else:
    print("'role' column already exists.")

# Create parent_students table
cursor.execute("""
    CREATE TABLE IF NOT EXISTS parent_students (
        parent_id INTEGER NOT NULL REFERENCES users(id),
        student_id INTEGER NOT NULL REFERENCES users(id),
        PRIMARY KEY (parent_id, student_id),
        CONSTRAINT uq_parent_student UNIQUE (parent_id, student_id)
    )
""")
print("Created 'parent_students' table (if not exists).")

conn.commit()

# Verify
cursor.execute("PRAGMA table_info(users)")
columns = [col[1] for col in cursor.fetchall()]
print(f"Updated users columns: {columns}")

cursor.execute('SELECT name FROM sqlite_master WHERE type="table" AND name="parent_students"')
exists = bool(cursor.fetchone())
print(f"parent_students table exists: {exists}")

conn.close()
print("Migration complete.")
