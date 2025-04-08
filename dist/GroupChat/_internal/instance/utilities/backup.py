import sqlite3
import json

def backup_users_data(db_path, backup_file, tableName):
    # Connect to the SQLite database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Query to fetch all users data
    cursor.execute(f"SELECT * FROM {tableName}")
    users = cursor.fetchall()

    # Convert the data into a list of dictionaries
    column_names = [desc[0] for desc in cursor.description]
    users_data = [dict(zip(column_names, user)) for user in users]

    # Save to a JSON file (or you could use CSV if you prefer)
    with open(backup_file, 'w') as f:
        json.dump(users_data, f)

    # Close the connection
    conn.close()
    print("Users data backed up successfully.")




def restore_users_data(db_path, backup_file, tableName):
    # Load the backup data from the file
    with open(backup_file, 'r') as f:
        users_data = json.load(f)

    # Connect to the SQLite database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Insert the backed-up users data into the users table
    for user in users_data:
        columns = ', '.join(user.keys())
        placeholders = ', '.join('?' * len(user))
        sql = f"INSERT INTO {tableName} ({columns}) VALUES ({placeholders})"
        cursor.execute(sql, tuple(user.values()))

    conn.commit()
    conn.close()
    print(f"{tableName} data restored successfully.")

# Usage
if __name__ == "__main__":
    database_path = "C:\\Users\\Ben\\PycharmProjects\\groupChat2\\instance\\dev_users.db"
    backup_file = "backup_users_data.json"
    # backup_users_data(database_path, backup_file, "users")
    restore_users_data(database_path, backup_file)
