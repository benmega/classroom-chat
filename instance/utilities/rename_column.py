import sqlite3


def get_tables(db_path):
    """Return a list of all tables in the database."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [row[0] for row in cursor.fetchall()]
    conn.close()
    return tables


def get_columns(db_path, table_name):
    """Return a list of column names in the given table."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute(f"PRAGMA table_info({table_name});")
    columns = [row[1] for row in cursor.fetchall()]
    conn.close()
    return columns


def rename_column(db_path, table_name, old_name, new_name):
    """Rename a column in the given table."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        sql = f"ALTER TABLE {table_name} RENAME COLUMN {old_name} TO {new_name};"
        cursor.execute(sql)
        conn.commit()
        print(f"Column '{old_name}' renamed to '{new_name}' in table '{table_name}'.")
    except Exception as e:
        print("Error occurred:", e)
    finally:
        conn.close()


if __name__ == "__main__":
    # Path to your database
    database_path = (
        "C:\\Users\\Ben\\PycharmProjects\\groupChat2\\instance\\dev_users.db"
    )

    # Get tables
    tables = get_tables(database_path)
    if not tables:
        print("No tables found in the database.")
        exit()

    print("Available tables:", tables)
    table_name = input("Enter the table name to modify: ").strip()
    if table_name not in tables:
        print("Invalid table name.")
        exit()

    # Get current columns
    columns = get_columns(database_path, table_name)
    print("Current columns:", columns)

    old_name = input("Enter the column name to rename: ").strip()
    if old_name not in columns:
        print("Column does not exist.")
        exit()

    new_name = input("Enter the new column name: ").strip()
    if new_name in columns:
        print("Column with that name already exists.")
        exit()

    # Rename column
    rename_column(database_path, table_name, old_name, new_name)
