import sqlite3

DB_PATH = r"C:\Users\Ben\PycharmProjects\groupChat2\instance\dev_users.db"

# Define all desired schema updates here
# Each key = table name, value = list of (column_name, type, default_value)
MIGRATIONS = {}


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
    print(f"Added '{column}' to '{table}' with default {default_value}")


def run_migrations():
    """Run all defined migrations on the target database."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    existing_tables = {row[0] for row in cursor.fetchall()}

    for table, columns in MIGRATIONS.items():
        if table not in existing_tables:
            print(f"Skipping '{table}' — table not found.")
            continue

        for column_name, column_type, default_value in columns:
            if column_exists(conn, table, column_name):
                print(f"'{table}.{column_name}' already exists — skipped.")
                continue
            try:
                add_column(conn, table, column_name, column_type, default_value)
            except Exception as e:
                print(f"Error adding '{column_name}' to '{table}':", e)

    conn.close()
    print("Migration complete.")


if __name__ == "__main__":
    run_migrations()
