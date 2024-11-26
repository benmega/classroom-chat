# from application import db
# db.drop_all()
#
import sqlite3

from application.config import Config
from sqlalchemy import create_engine, MetaData, Table

SQLALCHEMY_DATABASE_URI = Config.SQLALCHEMY_DATABASE_URI  # Replace with your actual database URI
engine = create_engine(SQLALCHEMY_DATABASE_URI)

def drop_table(db_path, table_name, confirm=False):
    """
    Drops a table from the SQLite database.

    Parameters:
    - db_path (str): Path to the SQLite database file.
    - table_name (str): Name of the table to drop.
    - confirm (bool): If True, prompts for confirmation before dropping the table.
    """
    # Connect to the SQLite database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # If confirmation is required, prompt the user
        if confirm:
            user_input = input(f"Are you sure you want to drop the table '{table_name}'? (yes/no): ")
            if user_input.lower() != 'yes':
                print("Operation canceled.")
                return

        # SQL to drop the table
        drop_table_sql = f"DROP TABLE IF EXISTS {table_name};"
        cursor.execute(drop_table_sql)
        conn.commit()
        print(f"Table '{table_name}' dropped successfully.")
    except Exception as e:
        print(f"Error occurred while dropping table '{table_name}': {e}")
    finally:
        conn.close()

def dropAll():
    with engine.connect() as conn:
        # Drop the alembic_version table if it exists
        conn.execute("DROP TABLE IF EXISTS alembic_version")


if __name__ == "__main__":
    # Path to your database
    database_path = "C:\\Users\\Ben\\PycharmProjects\\groupChat2\\instance\\users.db"

    drop_table(database_path, table_name="messages", confirm=True)