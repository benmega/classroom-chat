import sqlite3
from application.config import Config

DATABASE_PATH = "C:\\Users\\Ben\\PycharmProjects\\groupChat2\\instance\\dev_users.db"  # Update this if needed

def list_users(db_path):
    """
    Fetch and list all users in the 'users' table.

    Parameters:
    - db_path (str): Path to the SQLite database file.

    Returns:
    - list: A list of user records (dictionaries with column names as keys).
    """
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row  # Enable dictionary-like row access
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM users;")
        return [dict(row) for row in cursor.fetchall()]
    except Exception as e:
        print(f"Error retrieving users: {e}")
        return []
    finally:
        conn.close()

def update_user_field(db_path, user_id, field_name, new_value):
    """
    Update a specific field for a user.

    Parameters:
    - db_path (str): Path to the SQLite database file.
    - user_id (int): ID of the user to update.
    - field_name (str): Name of the field to update.
    - new_value: New value for the field.

    Returns:
    - bool: True if update succeeded, False otherwise.
    """
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        update_sql = f"UPDATE users SET {field_name} = ? WHERE id = ?;"
        cursor.execute(update_sql, (new_value, user_id))
        conn.commit()
        return True
    except Exception as e:
        print(f"Error updating user {user_id}: {e}")
        return False
    finally:
        conn.close()

def delete_user(db_path, user_id):
    """
    Deletes a user from the database.

    Parameters:
    - db_path (str): Path to the SQLite database file.
    - user_id (int): ID of the user to delete.

    Returns:
    - bool: True if deletion succeeded, False otherwise.
    """
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        delete_sql = "DELETE FROM users WHERE id = ?;"
        cursor.execute(delete_sql, (user_id,))
        conn.commit()
        return True
    except Exception as e:
        print(f"Error deleting user {user_id}: {e}")
        return False
    finally:
        conn.close()

def get_table_columns(db_path, table_name):
    """
    Returns a list of column names for the given SQLite table.
    """
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(f"PRAGMA table_info({table_name})")
        return [row[1] for row in cursor.fetchall()]  # row[1] is column name

def interactive_edit_user():
    """
    Interactively allows editing user data or deleting a user.
    Dynamically detects table fields.
    """
    users = list_users(DATABASE_PATH)
    if not users:
        print("No users found in the database.")
        return

    print("Available users:")
    for user in users:
        # Print all fields dynamically
        print(", ".join([f"{k}: {v}" for k, v in user.items()]))

    try:
        user_id = int(input("Enter the ID of the user you want to edit or delete: "))
        selected_user = next((u for u in users if u['id'] == user_id), None)
        if not selected_user:
            print("Invalid user ID. Operation canceled.")
            return

        print(f"Selected User: {selected_user}")
        action = input("What would you like to do? (edit/delete): ").strip().lower()

        if action == "edit":
            # Dynamically get editable fields
            columns = get_table_columns(DATABASE_PATH, "users")
            print(f"Fields available for editing: {', '.join(columns)}")

            field_name = input("Enter the field you want to edit: ").strip()
            if field_name not in columns:
                print(f"Invalid field name '{field_name}'. Operation canceled.")
                return

            new_value = input(f"Enter the new value for '{field_name}': ").strip()

            # Auto-convert numbers where appropriate
            try:
                if isinstance(selected_user[field_name], int):
                    new_value = int(new_value)
            except KeyError:
                print(f"Field '{field_name}' not found in selected user. Operation canceled.")
                return
            except ValueError:
                print(f"Invalid value for '{field_name}'. Expected an integer.")
                return

            if update_user_field(DATABASE_PATH, user_id, field_name, new_value):
                print(f"User {user_id}'s {field_name} updated successfully to {new_value}.")
            else:
                print("Failed to update the user.")

        elif action == "delete":
            confirmation = input(f"Are you sure you want to delete user ID {user_id}? (yes/no): ").strip().lower()
            if confirmation == "yes":
                if delete_user(DATABASE_PATH, user_id):
                    print(f"User {user_id} deleted successfully.")
                else:
                    print("Failed to delete the user.")
            else:
                print("User deletion canceled.")

        else:
            print("Invalid action. Operation canceled.")
    except ValueError:
        print("Invalid input. Please enter a number.")

def delete_multiple_users(db_path, user_ids):
    """
    Deletes multiple users from the database.

    Parameters:
    - db_path (str): Path to the SQLite database file.
    - user_ids (list[int]): List of user IDs to delete.

    Returns:
    - bool: True if all deletions succeeded, False otherwise.
    """
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        placeholders = ",".join("?" for _ in user_ids)
        delete_sql = f"DELETE FROM users WHERE id IN ({placeholders});"
        cursor.execute(delete_sql, user_ids)
        conn.commit()
        return True
    except Exception as e:
        print(f"Error deleting users {user_ids}: {e}")
        return False
    finally:
        conn.close()

def interactive_delete_multiple_users():
    """
    Interactively allows deleting multiple users from the database.
    """
    users = list_users(DATABASE_PATH)
    if not users:
        print("No users found in the database.")
        return

    print("Available users:")
    for user in users:
        print(f"ID: {user['id']}, Username: {user['username']}, Ducks: {user['ducks']}, Online: {user['is_online']}")

    try:
        ids_to_delete = input("Enter the IDs of users you want to delete, separated by commas: ")
        user_ids = [int(user_id.strip()) for user_id in ids_to_delete.split(",") if user_id.strip().isdigit()]

        if not user_ids:
            print("No valid IDs entered. Operation canceled.")
            return

        confirmation = input(f"Are you sure you want to delete the following users: {user_ids}? (yes/no): ").strip().lower()
        if confirmation == "yes":
            if delete_multiple_users(DATABASE_PATH, user_ids):
                print(f"Users with IDs {user_ids} deleted successfully.")
            else:
                print("Failed to delete one or more users.")
        else:
            print("User deletion canceled.")
    except ValueError:
        print("Invalid input. Please enter valid user IDs separated by commas.")

if __name__ == "__main__":
    action = input('edit a single user (1) or delete multiple (2)?')
    while action != "1" and action != "2":
        action = input('edit a single user (1) or delete multiple (2)?')
    if action == "1":
        interactive_edit_user()
    elif action == "2":
        interactive_delete_multiple_users()
