import sqlite3
from collections import defaultdict


def migrate_challenge_names(conn):
    """
    Converts challenge_name to challenge_slug, handles duplicates,
    and renames the database column.
    """
    cursor = conn.cursor()

    # 1. Check if migration is already done
    cursor.execute("PRAGMA table_info(challenge_logs)")
    columns = [row[1] for row in cursor.fetchall()]

    if 'challenge_slug' in columns:
        print("Skipping Challenge Name Migration (Column 'challenge_slug' already exists)")
        return

    if 'challenge_name' not in columns:
        print("Warning: Column 'challenge_name' not found. Skipping.")
        return

    print("Starting Challenge Name -> Slug Migration...")

    # 2. Load Challenge Reference Map
    # Map Name -> Slug and create a set of valid slugs
    cursor.execute("SELECT name, slug FROM challenges")
    challenges = cursor.fetchall()
    name_to_slug = {row[0]: row[1] for row in challenges}
    valid_slugs = {row[1] for row in challenges}

    # 3. Load All Logs
    # We fetch ID to identify rows for update/delete
    cursor.execute("""
        SELECT id, username, domain, challenge_name, timestamp, 
               course_id, course_instance, helper 
        FROM challenge_logs
    """)
    logs = cursor.fetchall()

    # Map column indices for readability
    COL_ID, COL_USER, COL_DOMAIN, COL_NAME, COL_TIME, COL_CID, COL_CINST, COL_HELPER = range(8)

    updates = {}  # Map id -> {column: value}
    deletes = set()

    # Group logs by (username, domain, target_slug) to find duplicates
    # Key: (username, domain, slug) -> Value: List of log_rows (as mutable lists)
    grouped_logs = defaultdict(list)

    # 4. Normalize Data (Name -> Slug)
    for row in logs:
        log_id = row[COL_ID]
        current_val = row[COL_NAME]

        target_slug = None

        # Determine the correct slug
        if current_val in valid_slugs:
            target_slug = current_val
        elif current_val in name_to_slug:
            target_slug = name_to_slug[current_val]
            # Mark for update since the DB has the Name, we want the Slug
            if log_id not in updates: updates[log_id] = {}
            updates[log_id]['challenge_name'] = target_slug
        else:
            # Invalid: No matching slug or name found
            deletes.add(log_id)
            continue

        # Add to group for deduping
        # We store the row as a list so we can simulate the "merged" state in memory
        mutable_row = list(row)
        # Update the name in our temp row so grouping works on the SLUG
        mutable_row[COL_NAME] = target_slug

        group_key = (row[COL_USER], row[COL_DOMAIN], target_slug)
        grouped_logs[group_key].append(mutable_row)

    # 5. Process Duplicates
    print(f"Processing {len(grouped_logs)} unique challenge groups...")

    for key, group in grouped_logs.items():
        if len(group) < 2:
            continue

        # Sort by Timestamp DESC (newest first), then ID DESC
        group.sort(key=lambda x: (x[COL_TIME], x[COL_ID]), reverse=True)

        survivor = group[0]
        duplicates = group[1:]

        survivor_id = survivor[COL_ID]
        survivor_updates = {}

        for dup in duplicates:
            dup_id = dup[COL_ID]

            # Merge logic: If survivor is missing data, take from duplicate (older record)
            # check course_id
            if not survivor[COL_CID] and dup[COL_CID]:
                survivor[COL_CID] = dup[COL_CID]
                survivor_updates['course_id'] = dup[COL_CID]

            # check course_instance
            if not survivor[COL_CINST] and dup[COL_CINST]:
                survivor[COL_CINST] = dup[COL_CINST]
                survivor_updates['course_instance'] = dup[COL_CINST]

            # check helper
            if not survivor[COL_HELPER] and dup[COL_HELPER]:
                survivor[COL_HELPER] = dup[COL_HELPER]
                survivor_updates['helper'] = dup[COL_HELPER]

            # Mark duplicate for deletion
            deletes.add(dup_id)

        # If we merged data into survivor, record those updates
        if survivor_updates:
            if survivor_id not in updates: updates[survivor_id] = {}
            updates[survivor_id].update(survivor_updates)

    # 6. Execute SQL Changes
    print(f"Applying changes: {len(deletes)} deletes, {len(updates)} updates...")

    # A. Deletes
    if deletes:
        cursor.executemany(
            "DELETE FROM challenge_logs WHERE id = ?",
            [(x,) for x in deletes]
        )

    # B. Updates (Slug conversions + Merged data)
    for log_id, change_dict in updates.items():
        # dynamic update query construction
        set_clause = ", ".join([f"{k} = ?" for k in change_dict.keys()])
        values = list(change_dict.values())
        values.append(log_id)

        sql = f"UPDATE challenge_logs SET {set_clause} WHERE id = ?"
        cursor.execute(sql, values)

    conn.commit()

    # 7. Rename Column
    print("Renaming column 'challenge_name' to 'challenge_slug'...")
    try:
        cursor.execute("ALTER TABLE challenge_logs RENAME COLUMN challenge_name TO challenge_slug")
        conn.commit()
        print("Migration Successful.")
    except Exception as e:
        print(f"Error renaming column: {e}")
        print("Note: SQLite version 3.25.0+ is required for RENAME COLUMN.")