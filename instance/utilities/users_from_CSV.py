import logging

from application import create_app
from application.extensions import db
from application.models.user import User

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)

import csv
import logging
from sqlalchemy.exc import SQLAlchemyError


def insert_users_from_csv(csv_file_path, overwrite=True):
    try:
        # Open the CSV file with 'utf-8-sig' encoding to handle BOM
        with open(csv_file_path, mode="r", encoding="utf-8-sig") as file:
            csv_reader = csv.DictReader(file)
            users_to_insert = []
            existing_users = {user.username: user for user in User.query.all()}

            for row in csv_reader:
                username = row.get("username", "").strip()
                password = row.get("password", "").strip()
                ip_address = row.get("ip_address", None)

                if not username or not password:
                    logging.warning(f"Row skipped: Missing required fields. Row: {row}")
                    continue

                if username in existing_users:
                    if overwrite:
                        existing_user = existing_users[username]
                        existing_user.ip_address = ip_address
                        existing_user.set_password(password)  # Update password
                        logging.info(f"User {username} updated.")
                    else:
                        logging.info(f"Duplicate found: {username}. Skipping.")
                    continue

                # Create a new User instance if not overwriting
                user = User(username=username, ip_address=ip_address, is_online=False)
                user.set_password(password)  # Hash the password
                users_to_insert.append(user)

        # Insert new users in bulk
        if users_to_insert:
            db.session.bulk_save_objects(users_to_insert)

        db.session.commit()
        logging.info(f"{len(users_to_insert)} users successfully inserted.")

    except SQLAlchemyError as e:
        logging.error(f"Database error: {e}")
        db.session.rollback()
    except Exception as e:
        logging.error(f"Unexpected error: {e}")


# def insert_users_from_csv(csv_file_path):
#     try:
#         # Open the CSV file with 'utf-8-sig' encoding to handle BOM
#         with open(csv_file_path, mode='r', encoding='utf-8-sig') as file:
#             csv_reader = csv.DictReader(file)
#             users_to_insert = []
#
#             # Fetch existing usernames to minimize DB hits
#             existing_usernames = {user.username for user in User.query.with_entities(User.username).all()}
#
#             # Iterate over the rows in the CSV
#             for row in csv_reader:
#                 username = row.get('username', '').strip()
#                 password = row.get('password', '').strip()
#                 ip_address = row.get('ip_address', None)
#
#                 # Validate required fields
#                 if not username or not password:
#                     logging.warning(f"Row skipped: Missing required fields. Row: {row}")
#                     continue
#
#                 # Skip if the username already exists
#                 if username in existing_usernames:
#                     logging.info(f"Duplicate found: {username}. Skipping.")
#                     continue
#
#                 # Create a new User instance
#                 user = User(username=username, ip_address=ip_address, is_online=False)
#                 user.set_password(password)  # Hash the password
#                 users_to_insert.append(user)
#
#         # Insert users into the database in bulk
#         if users_to_insert:
#             db.session.bulk_save_objects(users_to_insert)
#             db.session.commit()
#             logging.info(f"{len(users_to_insert)} users successfully inserted.")
#         else:
#             logging.info("No valid users found in the CSV.")
#
#     except SQLAlchemyError as e:
#         logging.error(f"Database error: {e}")
#         db.session.rollback()
#     except Exception as e:
#         logging.error(f"Unexpected error: {e}")


if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        csv_file_path = "../usersFromExcel.csv"
        insert_users_from_csv(csv_file_path)
