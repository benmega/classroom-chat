import os
import sqlite3

# --- IMPORTS ---
try:
    from migrate_classrooms import migrate_classrooms_and_instances
except ImportError:
    migrate_classrooms_and_instances = None

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


if __name__ == "__main__":
    if not os.path.exists(DB_PATH):
        print(f"Error: Database not found at {DB_PATH}")
    else:
        try:
            with sqlite3.connect(DB_PATH) as conn:
                print(f"Connected to {DB_PATH}")

                # 0. RUN THE TABLE SPLIT FIRST
                if migrate_classrooms_and_instances:
                    migrate_classrooms_and_instances(conn)

                # 1. Create new tables
                create_missing_tables(conn)

                # 2. Apply column-level schema changes
                apply_schema_changes(conn)

                print("\nAll Migrations Complete.")
        except Exception as e:
            print(f"Critical Error: {e}")
