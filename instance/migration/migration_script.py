import sqlite3
import csv
import os

# ================= CONFIGURATION =================

DB_FILENAME = "dev_users.db"
CSV_FILENAME = "projects.csv"  # Ensure this file is next to the script

# 1. New Columns (Optional)
NEW_COLUMNS = {
    # "projects": [("new_field", "TEXT", None)]
}

# 2. SQL Updates (Optional)
RAW_SQL_UPDATES = [
    # "UPDATE users SET is_admin = 1 WHERE id = 1"
]

# =================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "..", DB_FILENAME)
CSV_PATH = os.path.join(BASE_DIR, CSV_FILENAME)


def replace_projects_with_csv(conn):
    """
    Clears the 'projects' table and refills it from the CSV.
    Dynamically builds the INSERT statement based on CSV headers.
    """
    if not os.path.exists(CSV_PATH):
        print(f"Skipping CSV import: '{CSV_FILENAME}' not found.")
        return

    print(f"--- Replacing 'projects' table with data from {CSV_FILENAME} ---")
    cursor = conn.cursor()

    try:
        # 1. Clear existing data
        cursor.execute("DELETE FROM projects;")
        print("Existing project data cleared.")

        # 2. Read and Insert CSV
        with open(CSV_PATH, 'r', encoding='utf-8-sig', newline='') as f:
            reader = csv.DictReader(f)

            # Get headers from the file to build the query dynamically
            headers = reader.fieldnames
            if not headers:
                print("CSV is empty.")
                return

            # Prepare the SQL statement: INSERT INTO projects (col1, col2) VALUES (?, ?)
            columns_str = ", ".join(headers)
            placeholders_str = ", ".join(["?"] * len(headers))
            sql = f"INSERT INTO projects ({columns_str}) VALUES ({placeholders_str})"

            count = 0
            for row in reader:
                # Create a tuple of values in the same order as headers
                values = tuple(row[col] for col in headers)
                cursor.execute(sql, values)
                count += 1

            conn.commit()
            print(f"Successfully inserted {count} projects.")

    except sqlite3.OperationalError as e:
        print(f"Database Error: {e}")
        print("Hint: Do the CSV headers match your database column names exactly?")
    except Exception as e:
        print(f"Error during import: {e}")


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
                apply_schema_changes(conn)
                replace_projects_with_csv(conn)
                print("\nMigration Complete.")
        except Exception as e:
            print(f"Critical Error: {e}")