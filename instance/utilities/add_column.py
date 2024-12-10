import sqlite3


def add_column(db_path, tableName, columnName, defaultValue=None):
    """
    Add a column to an SQLite table with a default value.
    The column type and default value are determined based on the type of defaultValue.
    """
    # Determine column type based on defaultValue
    if isinstance(defaultValue, str):
        column_type = "TEXT"
        default_value = f"'{defaultValue}'"  # Strings need quotes in SQL
    elif isinstance(defaultValue, bool):
        column_type = "BOOLEAN"
        default_value = int(defaultValue)  # Convert boolean to 0 or 1
    elif isinstance(defaultValue, int):
        column_type = "INTEGER"
        default_value = defaultValue
    elif isinstance(defaultValue, float):
        column_type = "REAL"
        default_value = defaultValue
    elif defaultValue is None:
        column_type = "TEXT"  # Default to TEXT if no value provided
        default_value = "NULL"
    else:
        raise ValueError("Unsupported default value type.")

    # SQL to add the new column
    alter_table_sql = f"""
    ALTER TABLE {tableName}
    ADD COLUMN {columnName} {column_type} DEFAULT {default_value};
    """

    # Connect to the SQLite database and execute the SQL
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute(alter_table_sql)
        conn.commit()
        print(f"Column '{columnName}' added successfully to table '{tableName}'.")
    except Exception as e:
        print("Error occurred:", e)
    finally:
        conn.close()


if __name__ == "__main__":
    # Path to your database
    database_path = "C:\\Users\\Ben\\PycharmProjects\\groupChat2\\instance\\users.db"

    add_column(database_path, tableName="users", columnName="profile_picture", defaultValue="Default_pfp.jpg")
