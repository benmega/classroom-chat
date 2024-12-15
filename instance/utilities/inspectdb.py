import sqlite3


def list_tables(cursor):
    """Fetch and list all tables in the database."""
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    return [table[0] for table in cursor.fetchall()]


def display_table_schema(cursor, table_name):
    """Display the schema of a specific table."""
    cursor.execute(f"PRAGMA table_info({table_name})")
    return cursor.fetchall()


def summarize_table(cursor, table_name, limit=5):
    """Fetch the first few rows of a table for summary."""
    cursor.execute(f"SELECT * FROM {table_name} LIMIT {limit}")
    rows = cursor.fetchall()
    return rows


def search_in_table(cursor, table_name, column, search_value):
    """Search for specific entries in a table."""
    cursor.execute(f"SELECT * FROM {table_name} WHERE {column} LIKE ?", (f"%{search_value}%",))
    return cursor.fetchall()


def main():
    db_path = '../users.db'  # Adjust your database path as needed
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # List all tables
        tables = list_tables(cursor)
        if not tables:
            print("No tables found in the database.")
            return

        print("Available tables:")
        for idx, table in enumerate(tables, 1):
            print(f"{idx}. {table}")

        # Select a table
        table_choice = int(input("\nEnter the number of the table to inspect: ")) - 1
        table_name = tables[table_choice]

        # Display table schema
        print(f"\nSchema of '{table_name}':")
        schema = display_table_schema(cursor, table_name)
        for column in schema:
            print(column)

        # Display table summary
        print(f"\nSummary of '{table_name}': (First 5 rows)")
        rows = summarize_table(cursor, table_name)
        for row in rows:
            print(row)

        # Search or custom SQL
        while True:
            action = input("\nChoose an action: (1) Search (2) Run custom SQL (3) Exit: ")
            if action == "1":
                column = input(f"Enter the column name to search in '{table_name}': ")
                search_value = input("Enter the value to search for: ")
                results = search_in_table(cursor, table_name, column, search_value)
                print(f"\nSearch results for '{search_value}' in column '{column}':")
                for result in results:
                    print(result)
            elif action == "2":
                custom_query = input("Enter your custom SQL query: ")
                try:
                    cursor.execute(custom_query)
                    results = cursor.fetchall()
                    print("\nQuery Results:")
                    for result in results:
                        print(result)
                except Exception as e:
                    print(f"Error executing query: {e}")
            elif action == "3":
                print("Exiting...")
                break
            else:
                print("Invalid choice. Please try again.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
