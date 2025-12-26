# Filename: update_challenge_logs.py
# Description: Script to bulk insert challenge logs into the database.
from application import create_app, DevelopmentConfig
from application.extensions import db
from application.models.challenge import Challenge
from application.models.challenge_log import ChallengeLog


def add_challenge_logs(username, domain, challenge_names, course_id=None, course_instance=None):
    """
    Adds multiple challenge logs to the database.

    :param username: The username of the student completing challenges.
    :param domain: The platform where the challenge was completed (e.g., CodeCombat, LeetCode).
    :param challenge_names: A list of challenge names to log.
    :param course_id: (Optional) The course ID associated with the challenges.
    :param course_instance: (Optional) The instance of the course associated with the challenges.
    """
    if not challenge_names:
        print("No challenges provided. Exiting.")
        return

    logs = []
    for challenge_name in challenge_names:
        log_entry = ChallengeLog(
            username=username,
            domain=domain,
            challenge_name=challenge_name,
            course_id=course_id,
            course_instance=course_instance
        )
        logs.append(log_entry)

    try:
        db.session.bulk_save_objects(logs)
        db.session.commit()
        print(f"Successfully added {len(logs)} challenge logs for user '{username}'.")
    except Exception as e:
        db.session.rollback()
        print(f"Error inserting challenge logs: {e}")


def add_course_challenge_logs(username, domain, course_id):
    """
    Queries all challenges for a given course_id and logs them for the specified user.

    :param username: The username of the student completing challenges.
    :param domain: The platform where the challenge was completed (e.g., CodeCombat, LeetCode).
    :param course_id: The course ID associated with the challenges.
    """
    try:
        # Query all active challenges for the given course_id
        challenges = (
            db.session.query(Challenge.name)
            .filter(Challenge.course_id == course_id, Challenge.is_active)
            .all()
        )

        # Convert to a list of challenge names
        challenge_names = [challenge.name for challenge in challenges]

        if not challenge_names:
            print(f"No active challenges found for course_id: {course_id}")
            return

        # Call add_challenge_logs with the retrieved challenges
        try:
            add_challenge_logs(username, domain, challenge_names, course_id=course_id)
            print(f"Successfully logged {len(challenge_names)} challenges for {username}.")
        except Exception as e:
            print(f"Error while logging challenges: {e}")

    except Exception as e:
        print(f"Database query failed: {e}")


def userSelectDomain():
    """
    Queries the database for all unique challenge domains and lets the user select one.
    Returns the selected domain as a string.
    """
    domains = db.session.query(Challenge.domain).distinct().all()
    domains = [d.domain for d in domains]

    if not domains:
        print("No domains found in the database.")
        return None

    print("\nSelect a domain:")
    for i, domain in enumerate(domains, start=1):
        print(f"{i}. {domain}")

    while True:
        try:
            choice = int(input("Enter the number corresponding to the domain: "))
            if 1 <= choice <= len(domains):
                return domains[choice - 1]
            else:
                print("Invalid selection. Please enter a valid number.")
        except ValueError:
            print("Invalid input. Please enter a number.")

def userSelectCourse(domain):
    """
    Queries the database for all unique courses associated with a given domain and lets the user select one.
    Returns the selected course_id as a string.
    """
    from application.models.course import Course
    courses = db.session.query(Course.id, Course.name).filter(Course.domain == domain).distinct().all()

    if not courses:
        print(f"No courses found for domain: {domain}")
        return None

    print("\nSelect a course:")
    for i, (course_id, course_name) in enumerate(courses, start=1):
        print(f"{i}. {course_name} ({course_id})")  # Show name, but ID in parentheses

    while True:
        try:
            choice = int(input("Enter the number corresponding to the course: "))
            if 1 <= choice <= len(courses):
                return courses[choice - 1][0]  # Return the course_id
            else:
                print("Invalid selection. Please enter a valid number.")
        except ValueError:
            print("Invalid input. Please enter a number.")


def main():
    app = create_app(DevelopmentConfig)
    with app.app_context():
        username = input("Please enter the username -> ")

        while True:
            domain = userSelectDomain()
            if not domain:
                return

            course_id = userSelectCourse(domain)
            if not course_id:
                return

            add_course_challenge_logs(username, domain, course_id)

            another = input("Would you like to add another submission? (y/n) -> ").strip().lower()
            if another != 'y':
                break

if __name__ == "__main__":
    main()