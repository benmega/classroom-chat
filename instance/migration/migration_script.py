import sqlite3
import csv
import os

DB_PATH = r"C:\Users\Ben\PycharmProjects\groupChat2\instance\dev_users.db"
CSV_PATH = "oldProjects.csv"

MIGRATIONS = {
    "achievement": [
        ("icon_class", "VARCHAR(50)", None)
    ],
    "projects": [
        ("teacher_comment", "TEXT", None),
        ("code_snippet", "TEXT", None),
        ("github_link", "VARCHAR(255)", None),
        ("video_url", "VARCHAR(255)", None),
        ("image_url", "VARCHAR(255)", None)
    ],
    "users": [
        ("is_admin", "BOOLEAN", 0)
    ]
}


def column_exists(conn, table, column):
    """Check if a column already exists in a table."""
    cursor = conn.cursor()
    cursor.execute(f"PRAGMA table_info({table});")
    return any(row[1] == column for row in cursor.fetchall())


def add_column(conn, table, column, column_type, default_value):
    """Add a column to a table with a default value."""
    cursor = conn.cursor()
    sql = f"ALTER TABLE {table} ADD COLUMN {column} {column_type}"
    if default_value is not None:
        sql += f" DEFAULT {default_value}"
    sql += ";"
    cursor.execute(sql)
    conn.commit()
    print(f"Added '{column}' to '{table}'")


def promote_user_to_admin(conn, user_id):
    """Sets is_admin = 1 for a specific user ID."""
    cursor = conn.cursor()
    try:
        cursor.execute(f"UPDATE users SET is_admin = 1 WHERE id = ?", (user_id,))
        if cursor.rowcount > 0:
            conn.commit()
            print(f"Successfully promoted User ID {user_id} to Admin.")
        else:
            print(f"User ID {user_id} not found. No admin promoted.")
    except sqlite3.Error as e:
        print(f"Error promoting user {user_id}: {e}")


def import_csv_data(conn):
    """Imports project data from adjacent CSV file."""
    if not os.path.exists(CSV_PATH):
        print(f"Skipping import: '{CSV_PATH}' not found.")
        return

    print("Importing projects from CSV...")
    cursor = conn.cursor()

    try:
        # Changed to utf-8-sig to handle potential BOM
        # Removed delimiter='\t' (defaults to comma)
        with open(CSV_PATH, 'r', encoding='utf-8-sig', newline='') as f:
            reader = csv.DictReader(f)  # Standard CSV reader

            count = 0
            for row in reader:
                name = row.get('name')

                # Skip empty rows
                if not name or not name.strip():
                    continue

                cursor.execute("""
                    INSERT INTO projects (
                        name, description, link, user_id, 
                        teacher_comment, code_snippet, github_link, 
                        video_url, image_url
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    name,
                    row.get('description'),
                    row.get('link'),
                    row.get('user_id'),
                    row.get('teacher_comment'),
                    row.get('code_snippet'),
                    row.get('github_link'),
                    row.get('video_url'),
                    row.get('image_url')
                ))
                count += 1

            conn.commit()
            print(f"Successfully imported {count} projects.")

    except Exception as e:
        print(f"Error importing CSV: {e}")
        if 'row' in locals():
            print(f"Failed on row keys: {row.keys()}")



def run_migrations():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
    except sqlite3.Error as e:
        print(f"Error connecting to database at {DB_PATH}: {e}")
        return

    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    existing_tables = {row[0] for row in cursor.fetchall()}

    # 1. Run Schema Changes
    for table, columns in MIGRATIONS.items():
        if table not in existing_tables:
            print(f"Skipping '{table}' — table not found.")
            continue

        for column_name, column_type, default_value in columns:
            if column_exists(conn, table, column_name):
                # print(f"'{table}.{column_name}' already exists — skipped.")
                continue
            try:
                add_column(conn, table, column_name, column_type, default_value)
            except Exception as e:
                print(f"Error adding '{column_name}' to '{table}':", e)

    # 2. Run Data Updates
    if "users" in existing_tables:
        promote_user_to_admin(conn, 2)

    # 3. Import CSV Data
    if "projects" in existing_tables:
        import_csv_data(conn)


    conn.close()
    print("Migration complete.")


if __name__ == "__main__":
    run_migrations()