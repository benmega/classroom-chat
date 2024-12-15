import sqlite3
from application.config import Config
from sqlalchemy import create_engine

SQLALCHEMY_DATABASE_URI = Config.SQLALCHEMY_DATABASE_URI  # Replace with your actual database URI
engine = create_engine(SQLALCHEMY_DATABASE_URI)

def list_tables(db_path):
    """
    Fetch and list all tables in the SQLite database.

    Parameters:
    - db_path (str): Path to the SQLite database file.

    Returns:
    - list: A list of table names.
    """
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [table[0] for table in cursor.fetchall()]
        return tables
    finally:
        conn.close()

def drop_table(db_path, table_name, confirm=False):
    """
    Drops a table from the SQLite database.

    Parameters:
    - db_path (str): Path to the SQLite database file.
    - table_name (str): Name of the table to drop.
    - confirm (bool): If True, prompts for confirmation before dropping the table.
    """
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        if confirm:
            user_input = input(f"Are you sure you want to drop the table '{table_name}'? (yes/no): ")
            if user_input.lower() != 'yes':
                print("Operation canceled.")
                return

        drop_table_sql = f"DROP TABLE IF EXISTS {table_name};"
        cursor.execute(drop_table_sql)
        conn.commit()
        print(f"Table '{table_name}' dropped successfully.")
    except Exception as e:
        print(f"Error occurred while dropping table '{table_name}': {e}")
    finally:
        conn.close()

def drop_all():
    """Drops all tables in the database."""
    with engine.connect() as conn:
        conn.execute("DROP TABLE IF EXISTS alembic_version;")
        print("Dropped 'alembic_version' table if it existed.")

def interactive_drop_table():
    """
    Interactively prompts the user to select a table to drop.
    """
    database_path = "C:\\Users\\Ben\\PycharmProjects\\groupChat2\\instance\\users.db"

    # List all tables
    tables = list_tables(database_path)
    if not tables:
        print("No tables found in the database.")
        return

    print("Available tables:")
    for i, table in enumerate(tables, start=1):
        print(f"{i}. {table}")

    try:
        choice = int(input("Select a table to drop (enter the number): "))
        if 1 <= choice <= len(tables):
            table_name = tables[choice - 1]
            drop_table(database_path, table_name, confirm=True)
        else:
            print("Invalid selection. Operation canceled.")
    except ValueError:
        print("Invalid input. Please enter a number.")

if __name__ == "__main__":
    interactive_drop_table()
