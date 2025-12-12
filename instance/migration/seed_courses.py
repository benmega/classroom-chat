import sqlite3
import os

# ================= DATA =================
# Raw data from the prompt
RAW_DATA = """
/teachers/classes/678b56ea92eef90eb4c37231,CS 1-3 JS,JavaScript
/teachers/classes/678b56da3fa31bbfe4eea1c4,SAT1300 CS3 C++,C++
/teachers/classes/675576077a41df06bfccf725,Sat1030 CS 4 PY,Python
/teachers/classes/669b1c4cfbef2636ccbc5e69,Test,Python
/teachers/classes/669377e937c0a139b661277d,Sat1430 CS2 PY,Python
/teachers/classes/6551b1d4a3312d0019a9be2f,Sun1300 CS 3a PY,Python
/teachers/classes/649ac4fb3963a0006bc2df43,Tue1730 CS 3b,Python
/teachers/classes/63a6636f0cc8f4001f271058,Sat900 CS 4,Python
/teachers/classes/6366094e2cd169001fa7ba28,Sat1300 CS 3 PY,Python
/teachers/classes/630cc1ebf015ca0023096d74,Sat1030 CS 4 JS,JavaScript
"""


def seed_course_instances(conn):
    """Parses raw data and seeds the course_instances table."""
    cursor = conn.cursor()
    print("\n--- Seeding Course Instances ---")

    # 1. Ensure Table Exists (Lightweight check for this script context)
    # Note: In a real app, Alembic/Flask-Migrate should handle creation.
    # This is just to ensure the script doesn't crash if run standalone without migration.
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS course_instances (
                id VARCHAR(64) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                language VARCHAR(64) NOT NULL,
                url VARCHAR(255) NOT NULL,
                course_id VARCHAR(64),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
    except Exception as e:
        print(f"   Table check warning: {e}")

    # 2. Parse and Insert
    lines = [line.strip() for line in RAW_DATA.strip().split('\n') if line.strip()]
    count = 0

    for line in lines:
        parts = line.split(',')
        if len(parts) < 3:
            continue

        url, name, language = parts[0], parts[1], parts[2]

        # Extract ID from URL: "/teachers/classes/678b..." -> "678b..."
        try:
            instance_id = url.split('/')[-1]
        except IndexError:
            print(f"   Skipping invalid URL format: {url}")
            continue

        # Check existing
        cursor.execute("SELECT id FROM course_instances WHERE id = ?", (instance_id,))
        if cursor.fetchone():
            continue

        try:
            cursor.execute("""
                INSERT INTO course_instances (id, name, language, url, created_at)
                VALUES (?, ?, ?, ?, datetime('now'))
            """, (instance_id, name, language, url))
            count += 1
        except Exception as e:
            print(f"   Error inserting {name}: {e}")

    conn.commit()
    print(f"   Seeded {count} new course instances.")
    print("--------------------------------\n")


# Allow running directly
if __name__ == "__main__":
    DB_FILENAME = "dev_users.db"
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DB_PATH = os.path.join(BASE_DIR, "..", DB_FILENAME)

    if os.path.exists(DB_PATH):
        with sqlite3.connect(DB_PATH) as conn:
            seed_course_instances(conn)
    else:
        print(f"Database not found at {DB_PATH}")