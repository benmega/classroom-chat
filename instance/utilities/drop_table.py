import sqlite3


def drop_table(db_path, table_name):
    # Connect to the SQLite database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # SQL to drop the specified table
    drop_table_sql = f"DROP TABLE IF EXISTS {table_name};"

    try:
        cursor.execute(drop_table_sql)
        conn.commit()
        print(f"Table '{table_name}' dropped successfully.")
    except Exception as e:
        print("Error occurred:", e)
    finally:
        conn.close()


if __name__ == "__main__":
    # Path to your database
    database_path = "C:\\Users\\Ben\\PycharmProjects\\groupChat2\\instance\\users.db"

    # Name of the table to drop
    table_name = "challenges"

    drop_table(database_path, table_name)
