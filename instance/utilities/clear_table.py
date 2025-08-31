import sqlite3
from application.config import Config
from sqlalchemy import create_engine

SQLALCHEMY_DATABASE_URI = Config.SQLALCHEMY_DATABASE_URI
engine = create_engine(SQLALCHEMY_DATABASE_URI)
database_path = "C:\\Users\\Ben\\PycharmProjects\\groupChat2\\instance\\dev_users.db"

def clear_table(table_name):
    conn = sqlite3.connect(database_path)
    cursor = conn.cursor()
    try:
        # Delete all rows
        cursor.execute(f"DELETE FROM {table_name}")

        # Try resetting autoincrement counter safely
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='sqlite_sequence'")
        if cursor.fetchone():
            cursor.execute("DELETE FROM sqlite_sequence WHERE name=?", (table_name,))

        conn.commit()
        print(f"All rows cleared from table '{table_name}'.")
    except Exception as e:
        print(f"Error occurred while clearing table '{table_name}': {e}")
    finally:
        conn.close()


def interactive_clear_table():
    """
    Interactively prompts the user to select a table to clear.
    """

    conn = sqlite3.connect(database_path)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [table[0] for table in cursor.fetchall()]
    finally:
        conn.close()

    if not tables:
        print("No tables found in the database.")
        return

    print("Available tables:")
    for i, table in enumerate(tables, start=1):
        print(f"{i}. {table}")

    try:
        choice = int(input("Select a table to clear (enter the number): "))
        if 1 <= choice <= len(tables):
            table_name = tables[choice - 1]
            clear_table(table_name)
        else:
            print("Invalid selection. Operation canceled.")
    except ValueError:
        print("Invalid input. Please enter a number.")


if __name__ == "__main__":
    interactive_clear_table()
