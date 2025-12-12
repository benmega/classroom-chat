import sqlite3


def migrate_codecombat_domains(conn):
    """
    Scans specific tables and replaces occurrences of 'CodeCombat'
    with 'codecombat.com' in text columns.
    """
    cursor = conn.cursor()

    # Configuration: Table names and the specific columns to check
    # Note: I'm assuming likely column names (e.g., url, description, content).
    # If you want to blindly replace it in ALL text columns, we can adjust the logic
    # to query PRAGMA table_info, but specifying columns is safer.

    # If you aren't sure of column names, we can iterate all columns.
    # Below is a safe generic approach that finds all text columns for each table.

    target_tables = ["challenge_logs", "challenges", "courses"]

    print("\n--- Starting Domain Migration (CodeCombat -> codecombat.com) ---")

    for table in target_tables:
        try:
            # 1. Get all columns for the table
            cursor.execute(f"PRAGMA table_info({table})")
            columns_info = cursor.fetchall()

            # 2. Filter for text-like columns (TEXT, VARCHAR, CHAR)
            text_columns = [
                col[1] for col in columns_info
                if "TEXT" in col[2].upper() or "CHAR" in col[2].upper()
            ]

            if not text_columns:
                print(f"Skipping {table}: No text columns found.")
                continue

            # 3. Construct update query for each column
            changes_made = 0
            for col in text_columns:
                # SQLite REPLACE(string, pattern, replacement)
                query = f"""
                    UPDATE {table} 
                    SET {col} = REPLACE({col}, 'CodeCombat', 'codecombat.com') 
                    WHERE {col} LIKE '%CodeCombat%';
                """
                cursor.execute(query)
                changes_made += cursor.rowcount

            if changes_made > 0:
                print(f"Updated {table}: Modified {changes_made} row(s).")
            else:
                print(f"Checked {table}: No occurrences found.")

        except sqlite3.OperationalError as e:
            # Handle cases where table might not exist yet
            print(f"Skipping {table}: Table not found or error accessing it ({e}).")

    conn.commit()
    print("--- Domain Migration Complete ---\n")