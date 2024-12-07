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
    # Define the expected CSV file path
    csv_file_path = os.path.join(folder_path, "CodeCombat_Courses.csv")

    # Check if the CSV file exists
    if not os.path.exists(csv_file_path):
        print(f"CSV file not found in folder: {csv_file_path}")
        return

    # Parse the CSV and create Course entries
    try:
        with open(csv_file_path, mode="r", encoding="utf-8") as csv_file:
            csv_reader = csv.DictReader(csv_file)
            courses = []

            for row in csv_reader:
                # Extract data for Course model
                course_id = row["URL"].split("course=")[-1].split("&")[0]
                domain = "codecombat.com"  # Assuming all courses are from CodeCombat
                name = row["File Name"].replace(".html", "")  # Name inferred from file name
                description = row.get("Description", "No description provided.")  # Optional column

                # Avoid duplicates
                if Course.query.get(course_id):
                    print(f"Course with ID {course_id} already exists. Skipping.")
                    continue

                # Create a new Course instance
                course = Course(
                    id=course_id,
                    name=name,
                    domain=domain,
                    description=description,
                    is_active=True
        ***REMOVED***
                courses.append(course)

            # Add all courses to the database
            with db.session.begin():
                db.session.add_all(courses)

            print(f"{len(courses)} courses imported successfully.")

    except Exception as e:
        print(f"An error occurred while processing the CSV file: {e}")


# Initialize Flask app
app = create_app()

# Example usage
folder_path = r"C:\Users\Ben\OneDrive\Career\Teaching\Blossom\Computer Science\Code Combat\Map HTML"

with app.app_context():
    populate_courses_from_csv(folder_path)
