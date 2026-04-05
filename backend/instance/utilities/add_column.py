import sqlite3


def get_tables(db_path):
    """Fetches and returns a list of all tables in the database."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [row[0] for row in cursor.fetchall()]
    conn.close()
    return tables


def get_columns(db_path, table_name):
    """Fetches and returns a list of columns in a given table."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute(f"PRAGMA table_info({table_name});")
    columns = [row[1] for row in cursor.fetchall()]
    conn.close()
    return columns


def determine_column_type(default_value):
    """Determines the SQLite column type based on the given default value."""
    if isinstance(default_value, str):
        return "TEXT", f"'{default_value}'"
    elif isinstance(default_value, bool):
        return "BOOLEAN", int(default_value)
    elif isinstance(default_value, int):
        return "INTEGER", default_value
    elif isinstance(default_value, float):
        return "REAL", default_value
    elif default_value is None:
        return "TEXT", "NULL"
    else:
        raise ValueError("Unsupported default value type.")


def add_column(db_path, table_name, column_name, default_value=None):
    """Adds a new column to the given table with a default value."""
    column_type, default_sql_value = determine_column_type(default_value)

    alter_table_sql = f"""
    ALTER TABLE {table_name}
    ADD COLUMN {column_name} {column_type} DEFAULT {default_sql_value};
    """

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute(alter_table_sql)
        conn.commit()
        print(f"Column '{column_name}' added successfully to table '{table_name}'.")
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

    # Let user select a table
    print("Available tables:", tables)
    table_name = input("Enter the table name to modify: ").strip()
    if table_name not in tables:
        print("Invalid table name.")
        exit()

    # Get current columns
    columns = get_columns(database_path, table_name)
    print("Current columns in table:", columns)

    # Ask for new column details
    column_name = input("Enter the new column name: ").strip()
    if column_name in columns:
        print("Column already exists.")
        exit()

    default_value = input("Enter a default value (leave blank for NULL): ").strip()
    if default_value.isdigit():
        default_value = int(default_value)
    elif default_value.replace(".", "", 1).isdigit():
        default_value = float(default_value)
    elif default_value.lower() in ["true", "false"]:
        default_value = default_value.lower() == "true"
    elif default_value == "":
        default_value = None

    # Add column
    add_column(database_path, table_name, column_name, default_value)
