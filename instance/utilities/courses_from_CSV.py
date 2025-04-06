import csv
import os

from application import db, create_app
from application.models.course import Course


def populate_courses_from_csv(folder_path):
    """
    Reads a CSV file in the given folder and creates Course entries in the database.

    Args:
        folder_path (str): Path to the folder containing the CSV file.

    Returns:
        None
    """
    csv_file_path = os.path.join(folder_path, "courses.csv")

    if not os.path.exists(csv_file_path):
        print(f"CSV file not found in folder: {csv_file_path}")
        return

    try:
        with open(csv_file_path, mode="r", encoding="utf-8") as csv_file:
            csv_reader = csv.DictReader(csv_file)
            courses = []

            for row in csv_reader:
                course_id = row["URL"].split("course=")[-1].split("&")[0]
                domain = row["URL"].split("//")[-1].split("/")[0]
                name = row["File Name"].replace(".html", "")
                description = row.get("Description", "No description provided.")
                default_challenge_value = row["challenge_value"]
                # Use the new Session.get() method
                course = db.session.get(Course, course_id)
                if course:
                    print(f"Course with ID {course_id} already exists. Skipping.")
                    continue

                # Create Course instance
                course = Course(
                    id=course_id,
                    name=name,
                    domain=domain,
                    description=description,
                    is_active=True,
                    default_challenge_value=default_challenge_value
        ***REMOVED***
                courses.append(course)

            # Add courses and commit changes
            if courses:
                db.session.add_all(courses)
                db.session.commit()
                print(f"{len(courses)} courses imported successfully.")
            else:
                print("No new courses to import.")

    except Exception as e:
        db.session.rollback()
        print(f"An error occurred while processing the CSV file: {e}")

if __name__ == "__main__":
    # Initialize Flask app
    app = create_app()

    folder_path = r"C:\Users\Ben\OneDrive\Career\Teaching\Blossom\Computer Science\Ozaria\Map HTML"

    with app.app_context():
        populate_courses_from_csv(folder_path)
