import sqlite3

def add_column(db_path, tableName, columnName, defaultValue = 0):
    # Connect to the SQLite database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # SQL to add the new column with a default value
    alter_table_sql = f"""
    ALTER TABLE {tableName}
    ADD COLUMN {columnName} BOOLEAN DEFAULT {defaultValue};
    """

    try:
        cursor.execute(alter_table_sql)
        conn.commit()
        print("Column added successfully.")
    except Exception as e:
        print("Error occurred:", e)
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

if __name__ == "__main__":
    # Path to your database
    database_path = "C:\\Users\\Ben\\PycharmProjects\\groupChat2\\instance\\users.db"

    # add_column(database_path, tableName="conversations", columnName="is_struck", defaultValue="FALSE")
    drop_table(database_path, table_name="users", confirm=True)