import csv
import os
import re
import sqlite3

# Import the new seeding module
from seed_challenges import seed_challenges_data

# ================= CONFIGURATION =================
DB_FILENAME = "dev_users.db"
SEED_FILENAME = "course_instances_seed.csv"
CHALLENGES_SEED_FILENAME = "level_seed_data.csv"  # Added config for new seed

# Resolve absolute paths based on the location of this script
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "..", DB_FILENAME)
SEED_FILE_PATH = os.path.join(BASE_DIR, SEED_FILENAME)
CHALLENGES_SEED_PATH = os.path.join(BASE_DIR, CHALLENGES_SEED_FILENAME)  # Added path

NEW_COLUMNS = {
    "projects": [
        ("video_transcript", "TEXT", None),
    ],
    "users": [
        ("slug", "TEXT", None),
    ]
}

# Add new tables here in the future
NEW_TABLES = {}


# ================= MIGRATION STEPS =================

def apply_schema_changes(conn):
    """Adds new columns to existing tables if they are missing."""
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
    base_slug = re.sub(r'[_\s]+', '-', nickname.lower())
    base_slug = re.sub(r'[^a-z0-9-]', '', base_slug)
    base_slug = re.sub(r'-+', '-', base_slug).strip('-')

    slug = base_slug
    counter = 1
    while slug in existing_slugs:
        slug = f"{base_slug}-{counter}"
        counter += 1

    return slug


def populate_user_slugs(conn):
    """Generate and populate slugs for all users that don't have one."""
    cursor = conn.cursor()

    cursor.execute("PRAGMA table_info(users);")
    columns = [row[1] for row in cursor.fetchall()]
    if 'slug' not in columns:
        print("Migration: 'slug' column doesn't exist yet, skipping slug population.")
        return

    cursor.execute("SELECT id, nickname, slug FROM users WHERE slug IS NULL OR slug = ''")
    users_without_slugs = cursor.fetchall()

    if not users_without_slugs:
        return

    cursor.execute("SELECT slug FROM users WHERE slug IS NOT NULL AND slug != ''")
    existing_slugs = {row[0] for row in cursor.fetchall()}

    for user_id, nickname, current_slug in users_without_slugs:
        new_slug = generate_slug(nickname, existing_slugs)
        existing_slugs.add(new_slug)
        cursor.execute("UPDATE users SET slug = ? WHERE id = ?", (new_slug, user_id))

    conn.commit()
    print(f"Data: Updated {len(users_without_slugs)} user(s) with slugs")


def migrate_classrooms_and_instances(conn):
    """Splits the old course_instances (classroom data) into separate classrooms and course_instances tables."""
    cursor = conn.cursor()

    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = {row[0] for row in cursor.fetchall()}

    if "classrooms" in tables:
        return

    if "course_instances" not in tables:
        print("Migration Error: 'course_instances' table not found to migrate from.")
        return

    try:
        print("Migration: Splitting 'course_instances' into Classrooms and Instances...")

        # Rename the old table to 'classrooms'
        cursor.execute("ALTER TABLE course_instances RENAME TO classrooms;")

        # Create the NEW 'course_instances' table
        cursor.execute("""
                       CREATE TABLE course_instances
                       (
                           id           TEXT PRIMARY KEY,
                           classroom_id TEXT NOT NULL,
                           course_id    TEXT,
                           created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
                           FOREIGN KEY (classroom_id) REFERENCES classrooms (id),
                           FOREIGN KEY (course_id) REFERENCES courses (id)
                       );
                       """)

        conn.commit()
        print("Migration: Successfully created 'classrooms' and reset 'course_instances'.")

    except Exception as e:
        conn.rollback()
        print(f"Migration Error: {e}")


def seed_course_instances(conn):
    """Seeds the new course_instances table from an external CSV file."""
    if not os.path.exists(SEED_FILE_PATH):
        print(f"Seed Notice: '{SEED_FILENAME}' not found at {SEED_FILE_PATH}. Skipping seed.")
        return

    cursor = conn.cursor()

    # Ensure the target table exists before seeding
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='course_instances';")
    if not cursor.fetchone():
        print("Seed Error: 'course_instances' table does not exist. Skipping seed.")
        return

    inserted_count = 0

    try:
        with open(SEED_FILE_PATH, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)

            for row in reader:
                # Expecting columns: id, classroom_id, course_id
                cursor.execute(
                    "INSERT OR IGNORE INTO course_instances (id, classroom_id, course_id) VALUES (?, ?, ?)",
                    (row.get('id'), row.get('classroom_id'), row.get('course_id'))
                )
                if cursor.rowcount > 0:
                    inserted_count += 1

        conn.commit()
        if inserted_count > 0:
            print(f"Seed: Inserted {inserted_count} rows into 'course_instances'.")
        else:
            print("Seed: Data already exists in 'course_instances', nothing new inserted.")

    except Exception as e:
        conn.rollback()
        print(f"Seed Error: {e}")

# Added wrapper for the new challenges seed
def seed_challenges(conn):
    """Wrapper to call the imported seed_challenges module."""
    seed_challenges_data(conn, CHALLENGES_SEED_PATH)

# ================= RUNNER =================

def run_migrations():
    if not os.path.exists(DB_PATH):
        print(f"Error: Database not found at {DB_PATH}")
        return

    # Define the order of operations here to keep the pipeline clean
    migration_pipeline = [
        create_missing_tables,
        apply_schema_changes,
        populate_user_slugs,
        migrate_classrooms_and_instances,
        seed_course_instances,
        seed_challenges, # Added new step to the pipeline
    ]

    try:
        with sqlite3.connect(DB_PATH) as conn:
            print(f"Connected to database at: {DB_PATH}")
            print("-" * 40)

            for step in migration_pipeline:
                step(conn)

            print("-" * 40)
            print("All Migrations Complete.")
    except Exception as e:
        print(f"Critical Error during migration: {e}")


if __name__ == "__main__":
    run_migrations()