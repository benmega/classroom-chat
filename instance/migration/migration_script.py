import os
import sqlite3

# --- IMPORTS ---
try:
    from cleanup_logs import cleanup_invalid_logs
except ImportError:
    cleanup_invalid_logs = None

    migrate_codecombat_domains = None

# ================= CONFIGURATION =================
DB_FILENAME = "dev_users.db"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "..", DB_FILENAME)

NEW_COLUMNS = {
    "projects": [
        ("video_transcript", "TEXT", None),
    ]
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


if __name__ == "__main__":
    if not os.path.exists(DB_PATH):
        print(f"Error: Database not found at {DB_PATH}")
    else:
        try:
            with sqlite3.connect(DB_PATH) as conn:
                print(f"Connected to {DB_PATH}")

                # 1. Apply Schema Changes
                apply_schema_changes(conn)

                # 5. Cleanup orphan challenge logs
                if cleanup_invalid_logs:
                    cleanup_invalid_logs(conn)
                else:
                    print("Skipping Cleanup (Script not found)")

                print("\nAll Migrations Complete.")
        except Exception as e:
            print(f"Critical Error: {e}")
