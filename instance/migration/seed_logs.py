import sqlite3
import csv
import os


def seed_challenge_logs(conn):
    """
    Imports challenge logs from 'master_challenge_log.csv'.
    It looks up the course_id from the 'challenges' table based on the challenge name.
    """
    cursor = conn.cursor()
    print("\n--- Seeding Challenge Logs from CSV ---")

    # 1. Locate the CSV file
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    CSV_PATH = os.path.join(BASE_DIR, "master_challenge_log.csv")

    if not os.path.exists(CSV_PATH):
        print(f"Skipping: {CSV_PATH} not found.")
        return

    # 2. Build Challenge->Course Lookup Map
    # We query the DB once to make the loop faster
    print(">> Building Challenge Lookup Map...")
    cursor.execute("SELECT name, course_id FROM challenges")

    # Dictionary format: { 'Over the Garden Wall': 'CS1', ... }
    challenge_course_map = {row[0]: row[1] for row in cursor.fetchall()}

    print(f"   Loaded {len(challenge_course_map)} challenges for lookup.")

    # 3. Process CSV
    added_count = 0
    skipped_count = 0

    try:
        with open(CSV_PATH, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)

            for row in reader:
                username = row['username']
                domain = row['domain']
                challenge_name = row['challenge_name']
                timestamp = row['timestamp']
                course_instance = row['course_instance']
                helper = row['helper']

                # LOGIC: Determine Course ID
                # 1. Check if CSV has it (unlikely per your data, but good practice)
                # 2. Lookup in our map
                # 3. Fallback to None
                csv_course_id = row.get('course_id', '').strip()
                db_course_id = challenge_course_map.get(challenge_name)

                final_course_id = csv_course_id if csv_course_id else db_course_id

                # IDEMPOTENCY CHECK
                # Ensure we don't insert the exact same log twice.
                # We match on Username, Challenge, and Timestamp.
                cursor.execute("""
                    SELECT id FROM challenge_logs 
                    WHERE username = ? AND challenge_name = ? AND timestamp = ?
                """, (username, challenge_name, timestamp))

                if cursor.fetchone():
                    skipped_count += 1
                    continue

                # INSERT
                try:
                    cursor.execute("""
                        INSERT INTO challenge_logs 
                        (username, domain, challenge_name, timestamp, course_id, course_instance, helper)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (username, domain, challenge_name, timestamp, final_course_id, course_instance, helper))
                    added_count += 1
                except Exception as e:
                    print(f"   Error inserting log for {username} - {challenge_name}: {e}")

        conn.commit()
        print(f"   Success: {added_count} logs added.")
        print(f"   Skipped: {skipped_count} logs (already existed).")

    except Exception as e:
        print(f"CRITICAL ERROR reading CSV: {e}")

    print("--- Challenge Log Seeding Complete ---\n")


# Allow running standalone for testing
if __name__ == "__main__":
    DB_FILENAME = "dev_users.db"
    # Adjust path to step out of the current folder if needed
    DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", DB_FILENAME)

    if os.path.exists(DB_PATH):
        with sqlite3.connect(DB_PATH) as conn:
            seed_challenge_logs(conn)
    else:
        print(f"Database not found at {DB_PATH}")