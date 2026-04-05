import csv
import os
import tkinter as tk
from tkinter import filedialog
from urllib.parse import urlparse, parse_qs

from bs4 import BeautifulSoup


def get_challenge_data(domain, soup):
    """
    Extracts challenge data from the parsed HTML based on the domain.
    """
    challenge_data = []

    if "codecombat.com" in domain:
        challenge_elements = soup.find_all("div", class_="level-info-container")
        for elem in challenge_elements:
            name = elem.get("data-level-name", "")
            slug = elem.get("data-level-slug", "")
            description = elem.find("div", class_="level-description")
            challenge_data.append({
                "name": name,
                "slug": slug,
                "description": description.text.strip() if description else "No description provided."
            })

    elif "studio.code.org" in domain:
        challenge_elements = soup.find_all("a", class_="progress-bubble-link")
        for elem in challenge_elements:
            name = elem.get("title", "")
            slug = name
            challenge_data.append({
                "name": name,
                "slug": slug,
                "description": "No description provided."
            })

    elif "ozaria.com" in domain:
        challenge_elements = soup.find_all("a", class_="level-dot-link")
        for elem in challenge_elements:
            name = elem.get("title", "")
            slug = elem.get("href", "")
            if slug:
                slug = urlparse(slug).path.split("/")[-1]
            challenge_data.append({
                "name": name,
                "slug": slug,
                "description": "No description provided."
            })

    return challenge_data


def extract_challenges_from_html(url, html_content, difficulty, challenge_value):
    """
    Parses HTML, extracts challenge data, and enriches it with URL and CSV metadata.
    """
    soup = BeautifulSoup(html_content, "html.parser")

    # Extract key values from URL
    parsed_url = urlparse(url)
    domain = parsed_url.netloc
    query_params = parse_qs(parsed_url.query)

    course_id = query_params.get("course", [""])[0]
    if not course_id:
        course_id = parsed_url.path.split("/")[-1]

        # Get raw challenge data
    challenges = get_challenge_data(domain, soup)

    # Enrich and format for the final CSV
    enriched_challenges = []
    for challenge in challenges:
        enriched_challenges.append({
            "name": challenge.get("name", "").strip(),
            "slug": challenge.get("slug", "").strip(),
            "domain": domain,
            "course_id": course_id,
            "description": challenge.get("description", ""),
            "difficulty": difficulty,
            "value": challenge_value
        })

    return enriched_challenges


def process_files_and_generate_seed(folder_path):
    """
    Processes HTML/CSV files in the folder and outputs a master seed data CSV.
    """
    output_filename = "seed_data_output.csv"
    input_csv_path = None

    # Find the input CSV (ignore the output CSV if it already exists from a previous run)
    for file in os.listdir(folder_path):
        if file.lower().endswith(".csv") and file.lower() != output_filename:
            input_csv_path = os.path.join(folder_path, file)
            break

    if not input_csv_path:
        print("❌ No input CSV found in the folder.")
        return

    # Load URL mappings from the input CSV
    file_data = {}
    try:
        with open(input_csv_path, mode="r", encoding="utf-8") as csv_file:
            csv_reader = csv.DictReader(csv_file)
            for row in csv_reader:
                file_name = row["File Name"]
                file_data[file_name] = {
                    "url": row["URL"],
                    "difficulty": row["difficulty"],
                    "challenge_value": row["challenge_value"],
                }
    except Exception as e:
        print(f"❌ Error reading input CSV: {e}")
        return

    # Process HTML files
    html_files = [f for f in os.listdir(folder_path) if f.endswith(".html")]
    if not html_files:
        print("❌ No HTML files found in the specified folder.")
        return

    all_seed_data = []

    for html_file in html_files:
        file_path = os.path.join(folder_path, html_file)
        file_info = file_data.get(html_file)

        if not file_info:
            print(f"⚠️  Skipping {html_file}: No corresponding entry in input CSV.")
            continue

        try:
            with open(file_path, "r", encoding="utf-8") as file:
                html_content = file.read()

            extracted_data = extract_challenges_from_html(
                url=file_info["url"],
                html_content=html_content,
                difficulty=file_info["difficulty"],
                challenge_value=file_info["challenge_value"]
            )

            all_seed_data.extend(extracted_data)
            print(f"✅ Extracted {len(extracted_data)} challenges from {html_file}")

        except Exception as e:
            print(f"❌ Error processing {html_file}: {e}")

    # Generate the final output CSV
    if all_seed_data:
        output_path = os.path.join(folder_path, output_filename)
        headers = ["name", "slug", "domain", "course_id", "description", "difficulty", "value"]

        try:
            with open(output_path, mode="w", encoding="utf-8", newline="") as out_file:
                writer = csv.DictWriter(out_file, fieldnames=headers)
                writer.writeheader()
                writer.writerows(all_seed_data)
            print(f"\n🎉 Success! Seed data saved to: {output_path}")
        except Exception as e:
            print(f"❌ Error writing output CSV: {e}")
    else:
        print("\n⚠️  No challenges were extracted. Output CSV was not created.")


def select_folder():
    """Opens a dialog for the user to select a folder."""
    tk.Tk().withdraw()
    return filedialog.askdirectory()


def main():
    print("Select the folder containing your HTML files and input CSV.")
    folder_path = select_folder()

    if folder_path:
        print(f"\nProcessing folder: {folder_path}\n" + "-" * 40)
        process_files_and_generate_seed(folder_path)
    else:
        print("No folder selected. Aborted.")


if __name__ == "__main__":
    main()