import os
import re
import sqlite3


# ================= CONFIGURATION =================
DB_FILENAME = "dev_users.db"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "..", DB_FILENAME)


NEW_COLUMNS = {
    "projects": [
        ("video_transcript", "TEXT", None),
    ]
}

NEW_TABLES = {
    "notes": """
    CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );
    """
}

# =================================================


def apply_schema_changes(conn):
    """Adds new columns if they are missing."""
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    existing_tables = {row[0] for row in cursor.fetchall()}

    for table, columns in NEW_COLUMNS.items():
        if table not in existing_tables:
            continue

        for col_name, col_type, default_val in columns:
            cursor.execute(f"PRAGMA table_info({table});")
            existing_cols = [row[1] for row in cursor.fetchall()]

            if col_name not in existing_cols:
                try:
                    sql = f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}"
                    if default_val is not None:
                        val = (
                            f"'{default_val}'"
                            if isinstance(default_val, str)
                            else default_val
                        )
                        sql += f" DEFAULT {val}"
                    cursor.execute(sql)
                    print(f"Schema: Added '{col_name}' to '{table}'")
                except Exception as e:
                    print(f"Schema Error: {e}")
    conn.commit()

def create_missing_tables(conn):
    """Creates new tables if they do not exist."""
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    existing_tables = {row[0] for row in cursor.fetchall()}

    for table_name, create_sql in NEW_TABLES.items():
        if table_name not in existing_tables:
            try:
                cursor.execute(create_sql)
                print(f"Schema: Created table '{table_name}'")
            except Exception as e:
                print(f"Schema Error (create {table_name}): {e}")

    conn.commit()


def generate_slug(nickname, existing_slugs):
    """Generate a unique kebab-case slug from a nickname."""
    # Convert to lowercase and replace spaces/underscores with hyphens
    base_slug = re.sub(r'[_\s]+', '-', nickname.lower())
    # Remove any characters that aren't alphanumeric or hyphens
    base_slug = re.sub(r'[^a-z0-9-]', '', base_slug)
    # Remove leading/trailing hyphens and collapse multiple hyphens
    base_slug = re.sub(r'-+', '-', base_slug).strip('-')

    # Ensure uniqueness by appending a number if necessary
    slug = base_slug
    counter = 1
    while slug in existing_slugs:
        slug = f"{base_slug}-{counter}"
        counter += 1

    return slug


def populate_user_slugs(conn):
    """Generate and populate slugs for all users that don't have one."""
    cursor = conn.cursor()

    # Check if slug column exists
    cursor.execute("PRAGMA table_info(users);")
    columns = [row[1] for row in cursor.fetchall()]
    if 'slug' not in columns:
        print("Slug column doesn't exist yet, skipping slug population")
        return

    # Get all users without slugs
    cursor.execute("SELECT id, nickname, slug FROM users WHERE slug IS NULL OR slug = ''")
    users_without_slugs = cursor.fetchall()

    if not users_without_slugs:
        print("Data: All users already have slugs")
        return

    # Get existing slugs to ensure uniqueness
    cursor.execute("SELECT slug FROM users WHERE slug IS NOT NULL AND slug != ''")
    existing_slugs = {row[0] for row in cursor.fetchall()}

    # Generate and update slugs
    for user_id, nickname, current_slug in users_without_slugs:
        new_slug = generate_slug(nickname, existing_slugs)
        existing_slugs.add(new_slug)

        cursor.execute("UPDATE users SET slug = ? WHERE id = ?", (new_slug, user_id))
        print(f"Data: Generated slug '{new_slug}' for user ID {user_id} (nickname: {nickname})")

    conn.commit()
    print(f"Data: Updated {len(users_without_slugs)} user(s) with slugs")


if __name__ == "__main__":
    if not os.path.exists(DB_PATH):
        print(f"Error: Database not found at {DB_PATH}")
    else:
        try:
            with sqlite3.connect(DB_PATH) as conn:
                print(f"Connected to {DB_PATH}")

                # 1. Create new tables
                create_missing_tables(conn)

                # 2. Apply column-level schema changes
                apply_schema_changes(conn)

                # 3. Populate slugs for existing users
                populate_user_slugs(conn)

                print("\nAll Migrations Complete.")
        except Exception as e:
            print(f"Critical Error: {e}")








