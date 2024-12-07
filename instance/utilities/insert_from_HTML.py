from bs4 import BeautifulSoup
from application import db, create_app  # Import your Flask app factory
from application.models.challenge import Challenge
from urllib.parse import urlparse, parse_qs






def parse_and_store_challenges(url, html_content):
    """
    Parses HTML to extract challenge data and stores it in the database.

    Args:
        url (str): The URL of the CodeCombat page.
        html_content (str): The HTML content of the page.

    Returns:
        None
    """
    # Parse HTML content
    soup = BeautifulSoup(html_content, "html.parser")

    # Extract key values from URL
    parsed_url = urlparse(url)
    domain = parsed_url.netloc  # Extract domain, e.g., "codecombat.com"
    query_params = parse_qs(parsed_url.query)
    course_id = query_params.get("course", [""])[0]  # Extract course_id if present
    count = 0
    # Use the app context to interact with the database
    with app.app_context():
        levels = soup.find_all("div", class_="level-info-container")

        for level in levels:
            name = level.get("data-level-name")
            if not name:
                continue
            slug = level.get("data-level-slug")
            description_tag = level.find("div", class_="level-description")
            description = description_tag.text.strip() if description_tag else "No description provided."

            # Create and add challenge to the database
            challenge = Challenge(
                name=name,
                domain=domain,  # Pulled from URL
                course_id=course_id,
                description=description,
                difficulty='medium',  # Default; adjust as needed
                value=1  # Default value
            )

            db.session.add(challenge)
            count += 1
        # Commit changes to the database
        db.session.commit()
    print(f"{count} challenges imported successfully.")

# Parse HTML
# soup = BeautifulSoup(html_content, "html.parser")
#
# # Use the app context to interact with the database
# with app.app_context():
#     levels = soup.find_all("div", class_="level-info-container")
#
#     for level in levels:
#         name = level.get("data-level-name")
#         if not name:
#             continue
#         slug = level.get("data-level-slug")
#         course_id = "" #pull from url
#         description_tag = level.find("div", class_="level-description")
#         description = description_tag.text.strip() if description_tag else "No description provided."
#
#         # Create and add challenge to the database
#         challenge = Challenge(
#             name=name,
#             domain="CodeCombat", #should pull from url
#             course_id=course_id,
#             description=description,
#             difficulty='medium',  # Default; adjust as needed
#             value=1  # Default value
#         )
#
#         db.session.add(challenge)
#
#     # Commit changes to the database
#     db.session.commit()






import os

# def process_html_files_in_folder(folder_path):
#     """
#     Processes each HTML file in the specified folder by prompting the user for a URL
#     and calling the parse_and_store_challenges function.
#
#     Args:
#         folder_path (str): Path to the folder containing HTML files.
#
#     Returns:
#         None
#     """
#     # List all HTML files in the folder
#     html_files = [f for f in os.listdir(folder_path) if f.endswith(".html")]
#
#     if not html_files:
#         print("No HTML files found in the specified folder.")
#         return
#
#     # Process each HTML file
#     for html_file in html_files:
#         file_path = os.path.join(folder_path, html_file)
#
#         print(f"\nProcessing file: {html_file}")
#         # Get the URL from the user
#         url = input("Enter the URL corresponding to this file: ")
#
#         try:
#             # Read the HTML content from the file
#             with open(file_path, "r", encoding="utf-8") as file:
#                 html_content = file.read()
#
#             # Call the parse_and_store_challenges function
#             parse_and_store_challenges(url, html_content)
#
#             print(f"Successfully processed: {html_file}")
#         except Exception as e:
#             print(f"An error occurred while processing {html_file}: {e}")


import os
import csv

def process_html_files_with_csv(folder_path):
    """
    Processes each HTML file in the specified folder by retrieving the corresponding URL
    from a CSV file and calling the parse_and_store_challenges function.

    Args:
        folder_path (str): Path to the folder containing HTML files and the CSV file.

    Returns:
        None
    """
    # Define the expected CSV file path
    csv_file_path = os.path.join(folder_path, "CodeCombat_Courses.csv")

    # Check if the CSV file exists
    if not os.path.exists(csv_file_path):
        print(f"CSV file not found in folder: {csv_file_path}")
        return

    # Load the URL mappings from the CSV file
    url_mapping = {}
    try:
        with open(csv_file_path, mode="r", encoding="utf-8") as csv_file:
            csv_reader = csv.DictReader(csv_file)
            for row in csv_reader:
                url_mapping[row["File Name"]] = row["URL"]
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
        url = url_mapping.get(html_file)

        if not url:
            print(f"No URL found for file: {html_file}")
            continue

        print(f"\nProcessing file: {html_file}")
        try:
            # Read the HTML content from the file
            with open(file_path, "r", encoding="utf-8") as file:
                html_content = file.read()

            # Call the parse_and_store_challenges function
            parse_and_store_challenges(url, html_content)

            print(f"Successfully processed: {html_file}")
        except Exception as e:
            print(f"An error occurred while processing {html_file}: {e}")


# Initialize Flask app
app = create_app()

# Example usage
folder_path = r"C:\Users\Ben\OneDrive\Career\Teaching\Blossom\Computer Science\Code Combat\Map HTML"
process_html_files_with_csv(folder_path)
