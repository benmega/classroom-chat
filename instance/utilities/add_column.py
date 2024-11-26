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



if __name__ == "__main__":
    # Path to your database
    database_path = "C:\\Users\\Ben\\PycharmProjects\\groupChat2\\instance\\users.db"

    add_column(database_path, tableName="conversations", columnName="is_struck", defaultValue="FALSE")