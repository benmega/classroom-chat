import sqlite3
import os

# Import the new function
try:
    from seed_ben import seed_ben_data
except ImportError:
    print("Warning: seed_ben.py not found. Skipping seed.")
    seed_ben_data = None

# ================= CONFIGURATION =================

DB_FILENAME = "dev_users.db"
CSV_FILENAME = "projects.csv"

NEW_COLUMNS = {
    "skills": [
        ("category", "VARCHAR(50)", "concept"),
        ("icon", "VARCHAR(50)", "fas fa-code"),
        ("proficiency", "INTEGER", 1)
    ]
}

# =================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "..", DB_FILENAME)


def apply_schema_changes(conn):
    """Adds new columns if they are missing."""
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    existing_tables = {row[0] for row in cursor.fetchall()}

    for table, columns in NEW_COLUMNS.items():
        if table not in existing_tables: continue

        for col_name, col_type, default_val in columns:
            cursor.execute(f"PRAGMA table_info({table});")
            existing_cols = [row[1] for row in cursor.fetchall()]

            if col_name not in existing_cols:
                try:
                    sql = f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}"
                    if default_val is not None:
                        val = f"'{default_val}'" if isinstance(default_val, str) else default_val
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
                # 1. Apply Schema Changes
                apply_schema_changes(conn)

                # 2. Run the separated seed script
                if seed_ben_data:
                    seed_ben_data(conn)

                print("Migration Complete.")
        except Exception as e:
            print(f"Critical Error: {e}")