import csv

from application import create_app
from application.extensions import db
from application.models.user import User


def insert_users_from_csv(csv_file_path):
    # Open the CSV file with 'utf-8-sig' encoding to handle BOM
    with open(csv_file_path, mode='r', encoding='utf-8-sig') as file:
        csv_reader = csv.DictReader(file)
        users_to_insert = []

        # Iterate over the rows in the CSV
        for row in csv_reader:
            # Ensure the row has the necessary columns
            if 'username' in row and 'password' in row:
                username = row['username']
                password = row['password']

                # Check if the user already exists
                existing_user = User.query.filter_by(username=username).first()
                if existing_user:
                    print(f"Duplicate found: {username}. Skipping.")
                    continue  # Skip the insertion of this user if they already exist

                # Get ip_address if present, otherwise set it to None
                ip_address = row.get('ip_address', None)

                # Create a new User instance
                user = User(username=username, ip_address=ip_address, is_online=False)
                user.set_password(password)  # Hash the password

                users_to_insert.append(user)

        # Insert users into the database in bulk
        if users_to_insert:
            db.session.bulk_save_objects(users_to_insert)
            db.session.commit()
            print(f"{len(users_to_insert)} users successfully inserted.")
        else:
            print("No valid users found in the CSV.")


if __name__ == "__main__":
    app = create_app()  # Assuming this is your app factory function
    with app.app_context():
        csv_file_path = '../usersFromExcel.csv'  # Replace with the path to your CSV file
        insert_users_from_csv(csv_file_path)
