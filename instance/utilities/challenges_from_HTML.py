from application import db, create_app, ProductionConfig, DevelopmentConfig
from application.models.challenge import Challenge
import os
import csv
from bs4 import BeautifulSoup
from urllib.parse import urlparse, parse_qs
import tkinter as tk
from tkinter import filedialog


from bs4 import BeautifulSoup
from urllib.parse import urlparse, parse_qs
import warnings
warnings.filterwarnings("ignore", message="Using the in-memory storage for tracking rate limits")


def get_challenge_data(domain, soup):
    """
    Extracts challenge data from the parsed HTML based on the domain.

    Args:
        domain (str): The domain of the challenge platform.
        soup (BeautifulSoup): Parsed HTML content.

    Returns:
        list of dict: A list of challenge data dictionaries.
    """
    challenge_data = []

    if "codecombat.com" in domain:
        challenge_elements = soup.find_all("div", class_="level-info-container")
        for elem in challenge_elements:
            name = elem.get("data-level-name")
            slug = elem.get("data-level-slug")
            description = elem.find("div", class_="level-description")
            challenge_data.append({
                "name": name,
                "slug": slug,
                "description": description.text.strip() if description else "No description provided."
            })

    elif "studio.code.org" in domain:
        challenge_elements = soup.find_all("a", class_="progress-bubble-link")
        for elem in challenge_elements:
            name = elem.get("title")
            # slug = elem.get("href")
            # if slug:
            #     slug = slug.split("/")[-1]  # Extract last part of the URL
            # else:
            slug = name
            challenge_data.append({
                "name": name,
                "slug": slug,
                "description": "No description provided."
            })

    elif "ozaria.com" in domain:
        challenge_elements = soup.find_all("a", class_="level-dot-link")
        for elem in challenge_elements:
            name = elem.get("title")
            slug = elem.get("href")
            if slug:
                slug = urlparse(slug).path.split("/")[-1]  # Extract last part of the path
            challenge_data.append({
                "name": name,
                "slug": slug,
                "description": "No description provided."
            })

    return challenge_data

from sqlalchemy.exc import IntegrityError, SQLAlchemyError

def store_challenges(app, challenges, domain, course_id, default_difficulty, default_value, replace_existing=True):
    """
    Stores extracted challenge data into the database, optionally replacing existing entries.

    Args:
        app: The Flask application instance.
        challenges (list): A list of extracted challenge data.
        domain (str): The domain of the challenge platform.
        course_id (str): The course identifier.
        default_difficulty (str): Default difficulty for challenges.
        default_value (int): Default point value for challenges.
        replace_existing (bool, optional): Whether to replace existing challenges. Defaults to True.

    Returns:
        int: Number of challenges successfully stored or updated.
    """
    count = 0
    with app.app_context():
        for challenge in challenges:
            try:
                name = challenge["name"].strip()
                slug = challenge["slug"].strip()

                # Check for existing challenge
                existing_challenge = Challenge.query.filter_by(name=name, domain=domain).first()

                if existing_challenge:
                    if replace_existing:
                        existing_challenge.slug = slug or existing_challenge.slug  # Avoid empty slugs
                        existing_challenge.course_id = course_id
                        existing_challenge.description = challenge["description"]
                        existing_challenge.difficulty = default_difficulty
                        existing_challenge.value = default_value
                        print(f"Updated existing challenge: {existing_challenge.name}")
                    else:
                        print(f"Skipping existing challenge (exists): {existing_challenge.name}")
                        continue
                else:
                    new_challenge = Challenge(
                        name=name,
                        slug=slug,
                        domain=domain,
                        course_id=course_id,
                        description=challenge["description"],
                        difficulty=default_difficulty,
                        value=default_value
                    )
                    db.session.add(new_challenge)
                    print(f"Added new challenge: {new_challenge.name}")

                count += 1

            except IntegrityError as e:
                db.session.rollback()  # Prevent corruption of DB state
                print(f"ERROR: Integrity error for challenge '{challenge.get('name', 'UNKNOWN')}': {e}")
                continue  # Skip to the next challenge

            except SQLAlchemyError as e:
                db.session.rollback()  # Rollback on unexpected database errors
                print(f"ERROR: Database error for challenge '{challenge.get('name', 'UNKNOWN')}': {e}")
                continue  # Skip to the next challenge

            except Exception as e:
                print(f"ERROR: Unexpected error for challenge '{challenge.get('name', 'UNKNOWN')}': {e}")
                continue  # Skip to the next challenge

        db.session.commit()  # Commit all successfully processed challenges

    print(f"Successfully processed {count} challenges.")
    return count



def parse_and_store_challenges(app, url, html_content, default_difficulty="medium", default_value=1):
    """
    Parses HTML to extract challenge data and stores it in the database.

    Args:
        app: The Flask application instance.
        url (str): The URL of the challenge page.
        html_content (str): The HTML content of the page.
        default_difficulty (str, optional): Default difficulty level for challenges.
        default_value (int, optional): Default point value for challenges.

    Returns:
        bool: True if challenges were imported, False otherwise.
    """
    soup = BeautifulSoup(html_content, "html.parser")

    # Extract key values from URL
    parsed_url = urlparse(url)
    domain = parsed_url.netloc
    query_params = parse_qs(parsed_url.query)
    course_id = query_params.get("course", [""])[0]
    if not course_id:
        course_id = parsed_url.path.split("/")[-1]  # Extract last part of the path

    # Get challenge data
    challenges = get_challenge_data(domain, soup)
    if not challenges:
        print("Unsupported domain or no challenges found.")
        return False

    # Store extracted challenges
    count = store_challenges(app, challenges, domain, course_id, default_difficulty, default_value)

    print(f"{count} challenges imported successfully.")
    return count > 0





def process_html_files_with_csv(app, folder_path):
    """
    Processes each HTML file in the specified folder by retrieving the corresponding URL
    and challenge details from a CSV file and calling the parse_and_store_challenges function.

    Args:
        app: Application context.
        folder_path (str): Path to the folder containing HTML files and the CSV file.

    Returns:
        None
    """
    # Define the expected CSV file path
    csv_file_path = ""
    for file in os.listdir(folder_path):
        if file.lower().endswith(".csv"):
            csv_file_path = os.path.join(folder_path, file)

    # Check if the CSV file exists
    if not os.path.exists(csv_file_path):
        print(f"CSV file not found in folder: {csv_file_path}")
        return

    # Load the URL mappings and challenge details from the CSV file
    file_data = {}  # Dictionary to store file-related data
    try:
        with open(csv_file_path, mode="r", encoding="utf-8") as csv_file:
            csv_reader = csv.DictReader(csv_file)
            for row in csv_reader:
                file_name = row["File Name"]
                file_data[file_name] = {
                    "url": row["URL"],
                    "difficulty": row["difficulty"],
                    "challenge_value": row["challenge_value"],
                }
    except Exception as e:
        print(f"An error occurred while reading the CSV file: {e}")
        return

    # List all HTML files in the folder
    html_files = [f for f in os.listdir(folder_path) if f.endswith(".html")]

    if not html_files:
        print("No HTML files found in the specified folder.")
        return

    # Process each HTML file
    for html_file in html_files:
        file_path = os.path.join(folder_path, html_file)
        file_info = file_data.get(html_file)

        if not file_info:
            print(f"No data found for file: {html_file}")
            continue

        url = file_info["url"]
        difficulty = file_info["difficulty"]
        challenge_value = file_info["challenge_value"]

        print(f"\nProcessing file: {html_file}")
        try:
            # Read the HTML content from the file
            with open(file_path, "r", encoding="utf-8") as file:
                html_content = file.read()

            # Call the parse_and_store_challenges function with the correct values
            result = parse_and_store_challenges(app, url, html_content, difficulty, challenge_value)

            if result:
                print(f"Successfully processed: {html_file}")
            else:
                print(f"Could not process: {html_file}")
        except Exception as e:
            print(f"An error occurred while processing {html_file}: {e}")



def select_folder():
    """Opens a dialog for the user to select a folder and returns the selected path."""
    tk.Tk().withdraw()  # Hide the root window
    return filedialog.askdirectory()

def main():
    print("Select environment:")
    print("1. Development")
    print("2. Production")
    choice = input("Enter 1 or 2: ").strip()

    if choice == "1":
        config = DevelopmentConfig
    elif choice == "2":
        confirm = input("⚠️  You selected PRODUCTION. Type 'yes' to confirm: ").strip().lower()
        if confirm != "yes":
            print("Aborted.")
            return
        config = ProductionConfig
    else:
        print("Invalid selection. Aborted.")
        return

    app = create_app(config)
    folder_path = select_folder()
    process_html_files_with_csv(app, folder_path)

if __name__ == "__main__":
    main()