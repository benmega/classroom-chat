import sqlite3
import os


def seed_ben_data(conn):
    """
    Seeds 'ben' with:
    1. A ChallengeLog for every existing Challenge.
    2. A UserCertificate for every existing 'certificate' type Achievement.
    """
    cursor = conn.cursor()
    username = "ben"

    print(f"\n--- Seeding Data for '{username}' ---")

    # 1. Get User ID (Needed for Certificates)
    cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
    user_row = cursor.fetchone()

    if not user_row:
        print(f"Skipping: User '{username}' not found in 'users' table.")
        return

    user_id = user_row[0]

    # ==========================================
    # PART A: Seed Challenge Logs
    # ==========================================
    print(">> Processing Challenge Logs...")

    # Get all challenges
    cursor.execute("SELECT name, domain, course_id FROM challenges")
    challenges = cursor.fetchall()

    log_count = 0
    for name, domain, course_id in challenges:
        # Check for existing log
        cursor.execute(
            "SELECT id FROM challenge_logs WHERE username = ? AND challenge_name = ?",
            (username, name)
        )
        if cursor.fetchone():
            continue

        try:
            cursor.execute("""
                INSERT INTO challenge_logs 
                (username, domain, challenge_name, course_id, timestamp)
                VALUES (?, ?, ?, ?, datetime('now'))
            """, (username, domain, name, course_id))
            log_count += 1
        except Exception as e:
            print(f"   Error inserting log {name}: {e}")

    print(f"   Added {log_count} new challenge logs.")

    # ==========================================
    # PART B: Seed User Certificates
    # ==========================================
    print(">> Processing User Certificates...")

    # Get all achievements of type 'certificate'
    cursor.execute("SELECT id, slug FROM achievement WHERE type = 'certificate'")
    certs = cursor.fetchall()

    cert_count = 0
    for ach_id, slug in certs:
        # Check for existing certificate (Unique constraint on user_id + achievement_id)
        cursor.execute(
            "SELECT id FROM user_certificate WHERE user_id = ? AND achievement_id = ?",
            (user_id, ach_id)
        )
        if cursor.fetchone():
            continue

        try:
            # We set reviewed=1 (True) and provide a dummy URL since it's a system seed
            cursor.execute("""
                INSERT INTO user_certificate 
                (user_id, achievement_id, url, submitted_at, reviewed, reviewed_at)
                VALUES (?, ?, 'system_seeded', datetime('now'), 1, datetime('now'))
            """, (user_id, ach_id))
            cert_count += 1
        except Exception as e:
            print(f"   Error inserting cert {slug}: {e}")

    print(f"   Added {cert_count} new certificates.")

    conn.commit()
    print("--- Seeding Complete ---\n")


# Allow running this script directly for testing
if __name__ == "__main__":
    DB_FILENAME = "dev_users.db"
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DB_PATH = os.path.join(BASE_DIR, "..", DB_FILENAME)

    if os.path.exists(DB_PATH):
        with sqlite3.connect(DB_PATH) as conn:
            seed_ben_data(conn)
    else:
        print(f"Database not found at {DB_PATH}")