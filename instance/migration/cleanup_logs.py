"""
File: cleanup_logs.py
Type: py
Summary: Removes ChallengeLogs that have invalid domains or lack a corresponding Challenge.
"""

import sqlite3

ALLOWED_DOMAINS = ('CodeCombat', 'www.ozaria.com', 'codecombat.com')

def cleanup_invalid_logs(conn):
    """
    Performs cleanup on the challenge_logs table:
    1. Removes logs with domains not in the allowed list.
    2. Removes logs where the challenge_name does not exist in the challenges table.
    """
    cursor = conn.cursor()
    print("\n--- Cleaning Up Challenge Logs ---")

    try:
        # Check if tables exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='challenges';")
        has_challenges = cursor.fetchone()

        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='challenge_logs';")
        has_logs = cursor.fetchone()

        if not (has_challenges and has_logs):
            print("Cleanup Skipped: Required tables not found.")
            return

        # --- STEP 1: Prune Invalid Domains ---
        # We use NOT IN with a parameterized query for safety
        query_domain = f"""
            DELETE FROM challenge_logs
            WHERE domain NOT IN ({','.join(['?']*len(ALLOWED_DOMAINS))});
        """
        cursor.execute(query_domain, ALLOWED_DOMAINS)
        domain_deleted_count = cursor.rowcount

        if domain_deleted_count > 0:
            print(f"Cleanup: Removed {domain_deleted_count} logs with invalid domains (Allowed: {ALLOWED_DOMAINS}).")
        else:
            print("Cleanup: No invalid domains found.")

        # --- STEP 2: Prune Orphaned Challenges ---
        # Remove logs where challenge_name isn't in the challenges table
        query_orphans = """
                DELETE FROM challenge_logs
                WHERE challenge_name NOT IN (
                    SELECT name FROM challenges
                )
                AND challenge_name NOT IN (
                    SELECT slug FROM challenges
                );
            """
        cursor.execute(query_orphans)
        orphans_deleted_count = cursor.rowcount

        if orphans_deleted_count > 0:
            print(f"Cleanup: Removed {orphans_deleted_count} orphaned log entries (Challenge not found).")
        else:
            print("Cleanup: No orphaned logs found.")

        conn.commit()

    except Exception as e:
        print(f"Cleanup Error: {e}")
        conn.rollback()