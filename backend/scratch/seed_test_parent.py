"""
Create a test parent account and link it to existing students
for verifying the Parent Report Card feature.
"""
import sqlite3
import os
from werkzeug.security import generate_password_hash

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "instance", "dev_users.db")
DB_PATH = os.path.abspath(DB_PATH)

conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

# List existing students
c.execute("SELECT id, username, role FROM users LIMIT 10")
users = c.fetchall()
print("Existing users:")
for u in users:
    print(f"  id={u[0]}, username={u[1]}, role={u[2]}")

# Check if test parent already exists
c.execute("SELECT id FROM users WHERE username = 'test_parent'")
parent = c.fetchone()

if parent:
    parent_id = parent[0]
    print(f"\nTest parent already exists with id={parent_id}")
else:
    # Create test parent account
    pw_hash = generate_password_hash("parent123")
    c.execute(
        "INSERT INTO users (username, password_hash, nickname, role, is_approved, slug) VALUES (?, ?, ?, ?, ?, ?)",
        ("test_parent", pw_hash, "Test Parent", "parent", 1, "test-parent")
    )
    parent_id = c.lastrowid
    print(f"\nCreated test parent account: id={parent_id}, username=test_parent, password=parent123")

# Link parent to first 2 students (if any)
student_ids = [u[0] for u in users if u[2] == "student"][:2]
if not student_ids:
    # Just use first 2 non-parent users
    student_ids = [u[0] for u in users if u[1] != "test_parent"][:2]

for sid in student_ids:
    c.execute("SELECT * FROM parent_students WHERE parent_id = ? AND student_id = ?", (parent_id, sid))
    if not c.fetchone():
        c.execute("INSERT INTO parent_students (parent_id, student_id) VALUES (?, ?)", (parent_id, sid))
        print(f"Linked parent {parent_id} -> student {sid}")
    else:
        print(f"Already linked: parent {parent_id} -> student {sid}")

conn.commit()

# Verify
c.execute("SELECT ps.parent_id, ps.student_id, u.username FROM parent_students ps JOIN users u ON u.id = ps.student_id WHERE ps.parent_id = ?", (parent_id,))
links = c.fetchall()
print(f"\nParent {parent_id} children:")
for link in links:
    print(f"  student_id={link[1]}, username={link[2]}")

conn.close()
print("\nDone! Login as 'test_parent' with password 'parent123' to test.")
