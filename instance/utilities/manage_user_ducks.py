# manage_user_ducks.py
import sys
from sqlalchemy import func
from application.extensions import db
from application.models.user import User
from application.models.challenge import Challenge
from application.models.challenge_log import ChallengeLog


def update_user_ducks():
    users = User.query.all()
    if not users:
        print("No users found.")
        return

    updated = 0
    for user in users:
        total_ducks = (
            db.session.query(func.coalesce(func.sum(Challenge.value), 0))
            .join(ChallengeLog, Challenge.name == ChallengeLog.challenge_name)
            .filter(ChallengeLog.username == user.username)
            .scalar()
***REMOVED*** or 0

        user.earned_ducks = total_ducks
        user.packets = total_ducks / (2**14)
        updated += 1

        print(f"Updated {user.username}: earned_ducks={user.earned_ducks}, packets={user.packets}")

    db.session.commit()
    print(f"Updated {updated} users.")


def main():
    while True:
        print("\nUser Ducks Manager")
        print("1. Update earned_ducks and packets for all users")
        print("2. Exit")
        choice = input("Choose an option: ").strip()

        if choice == "1":
            update_user_ducks()
        elif choice == "2":
            sys.exit(0)
        else:
            print("Invalid choice.")


if __name__ == "__main__":
    from application import create_app

    app = create_app()
    with app.app_context():
        main()
