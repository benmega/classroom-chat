import sqlite3

def update_column_values(db_path, table_name, column_name, transform_function):
    """
    Update values in a specified column for all rows in a SQLite table using a transformation function.

    :param db_path: Path to the SQLite database file.
    :param table_name: Name of the table to update.
    :param column_name: Name of the column to update.
    :param transform_function: A function that takes a value and returns the transformed value.
    """
    # Connect to the SQLite database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Fetch current values from the specified column
        cursor.execute(f"SELECT rowid, {column_name} FROM {table_name}")
        rows = cursor.fetchall()

        # Apply the transformation function and update the table
        for rowid, value in rows:
            new_value = transform_function(value)
            cursor.execute(f"""
                UPDATE {table_name}
                SET {column_name} = ?
                WHERE rowid = ?
            """, (new_value, rowid))

        # Commit the changes
        conn.commit()
        print(f"Updated values in column '{column_name}' of table '{table_name}'.")
    except Exception as e:
        print("Error occurred:", e)
    finally:
        conn.close()

if __name__ == "__main__":
    database_path = "C:\\Users\\Ben\\PycharmProjects\\groupChat2\\instance\\dev_users.db"

    # Function to convert string to lowercase
    to_lowercase = lambda x: x.lower() if isinstance(x, str) else x
    divide_10 = lambda x: x/10

    # Update 'username' column in the 'user' table
    update_column_values(database_path, table_name="challenges", column_name="value", transform_function=divide_10)
