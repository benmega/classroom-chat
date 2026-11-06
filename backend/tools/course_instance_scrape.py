import csv
import os
from pathlib import Path

import requests

# Teacher/owner id of the classes to scrape
OWNER_ID = "62d23d975dafd60025f8c520"

# Domains to iterate through
DOMAINS = ["codecombat.com", "www.ozaria.com"]

# Teacher session cookies, one per site, read from the environment so no session is ever stored
# in the repository. Copy the Cookie header from a logged-in browser tab and export it before
# running, e.g. CODECOMBAT_COOKIE='...' and OZARIA_COOKIE='...'. A site whose variable is unset
# is skipped.
COOKIE_ENV_VARS = {
    "codecombat.com": "CODECOMBAT_COOKIE",
    "www.ozaria.com": "OZARIA_COOKIE",
}

# Output path to your migration folder (anchored on this file, so the script
# writes to backend/instance/migration whatever the working directory is)
OUT_DIR = Path(__file__).resolve().parents[1] / "instance" / "migration"
FILENAME = OUT_DIR / "course_instances_seed.csv"

# Seconds to wait for a response before giving up on a request
REQUEST_TIMEOUT = 30

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
}


def fetch_json(url, description, cookie_string):
    print(f"Fetching {description}...")

    req_headers = HEADERS.copy()
    req_headers["Cookie"] = cookie_string

    try:
        response = requests.get(url, headers=req_headers, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"  -> Error fetching {description}: {e}")
        return []


def process_domain(domain):
    print("\n========================================================")
    print(f"Processing '{domain}'...")
    print("========================================================")

    env_var = COOKIE_ENV_VARS.get(domain, "")
    cookie_string = os.environ.get(env_var, "").replace("\n", "").strip()

    if not cookie_string:
        print(f"  -> Skipping {domain}: no cookie in the {env_var or 'cookie'} environment variable.")
        return []

    url_teacher_instances = f"https://{domain}/db/course_instance?ownerID={OWNER_ID}"
    teacher_instances = fetch_json(
        url_teacher_instances, "Teacher Class List", cookie_string
    )

    if not teacher_instances:
        print(f"  -> No classes found or API error for {domain}.")
        return []

    classroom_ids = set()
    for item in teacher_instances:
        if "classroomID" in item:
            classroom_ids.add(item["classroomID"])

    print(f"  -> Found {len(classroom_ids)} unique classrooms on {domain}.")

    all_rows = []

    for idx, cid in enumerate(classroom_ids, 1):
        print(f"\n--- Classroom {idx}/{len(classroom_ids)}: {cid} ---")
        url = f"https://{domain}/db/course_instance?classroomID={cid}"

        instances_data = fetch_json(url, "Course Instances", cookie_string)

        if not instances_data:
            print("  -> No data found.")
            continue

        for item in instances_data:
            all_rows.append(
                {
                    "id": item.get("_id"),
                    "classroom_id": item.get("classroomID"),
                    "course_id": item.get("courseID"),
                    # created_at is filled in by the model default
                }
            )

    return all_rows


def main():
    total_rows = []

    for domain in DOMAINS:
        domain_rows = process_domain(domain)
        total_rows.extend(domain_rows)

    if total_rows:
        os.makedirs(OUT_DIR, exist_ok=True)

        fields = ["id", "classroom_id", "course_id"]

        with open(FILENAME, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fields)
            writer.writeheader()
            writer.writerows(total_rows)

        print(
            f"\nSUCCESS! Extracted a total of {len(total_rows)} instances across all domains."
        )
        print(f"File ready for seeding: {FILENAME}")
    else:
        print("\nNo data retrieved across any domains. Nothing to save.")


if __name__ == "__main__":
    main()
