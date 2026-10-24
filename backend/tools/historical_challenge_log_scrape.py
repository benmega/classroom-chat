import csv
import os
import re
import time
from pathlib import Path
from urllib.parse import urlparse

import requests

# 1. CONFIGURATION
# Teacher session cookies, one per site, read from the environment so no session is ever stored
# in the repository. Copy the Cookie header from a logged-in browser tab and export it before
# running, e.g. CODECOMBAT_COOKIE='...' and OZARIA_COOKIE='...'. Requests to a site whose
# variable is unset are sent without a cookie and the API answers 401.
COOKIE_ENV_VARS = {
    "codecombat.com": "CODECOMBAT_COOKIE",
    "ozaria.com": "OZARIA_COOKIE",
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
}

# ENTER THE TEACHER/OWNER ID HERE
# (This ID was extracted from the URL you provided in the previous prompt)
OWNER_ID = "62d23d975dafd60025f8c520"


# Anchored on this file, so the CSV lands in backend/instance/migration
# whatever the working directory is
OUT_DIR = Path(__file__).resolve().parents[1] / "instance" / "migration"
FILENAME = OUT_DIR / "master_challenge_log.csv"

CSV_FIELDS = [
    "username",
    "domain",
    "challenge_name",
    "timestamp",
    "course_id",
    "course_instance",
    "helper",
]

# Seconds to wait for a response before giving up on a request
REQUEST_TIMEOUT = 30


# 2. HELPER FUNCTIONS
def request_headers(url):
    """HEADERS plus the session cookie of the site that url points at, if one is set."""
    headers = dict(HEADERS)
    host = urlparse(url).hostname or ""
    for site, env_var in COOKIE_ENV_VARS.items():
        if host == site or host.endswith("." + site):
            cookie = os.environ.get(env_var, "").replace("\n", "").strip()
            if cookie:
                headers["Cookie"] = cookie
    return headers


def fetch_json(url, description):
    print(f"Fetching {description}...")
    try:
        response = requests.get(url, headers=request_headers(url), timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching {description}: {e}")
        # e.response is None for connection errors and timeouts
        if e.response is not None and e.response.status_code == 401:
            print("(!) AUTH ERROR: Cookie expired or not set (see COOKIE_ENV_VARS).")
        return []


def append_new_rows(rows):
    """Append rows not already in FILENAME, keyed on (username, challenge_name, timestamp).

    Re-running the scraper therefore never duplicates rows. Returns the number
    of rows added.
    """
    os.makedirs(OUT_DIR, exist_ok=True)

    def row_key(row):
        return (row.get("username"), row.get("challenge_name"), row.get("timestamp"))

    has_content = os.path.isfile(FILENAME) and os.path.getsize(FILENAME) > 0
    seen = set()
    if has_content:
        with open(FILENAME, newline="", encoding="utf-8") as f:
            seen = {row_key(row) for row in csv.DictReader(f)}

    new_rows = []
    for row in rows:
        if row_key(row) in seen:
            continue
        seen.add(row_key(row))
        new_rows.append(row)

    with open(FILENAME, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        if not has_content:
            writer.writeheader()
        writer.writerows(new_rows)
    return len(new_rows)


def build_student_map(members_data):
    s_map = {}
    for s in members_data:
        name = s.get("name", "").strip()
        if not name:
            name = s.get("name", "Unknown")
        s_map[s["_id"]] = name
    return s_map


def build_level_map(levels_data):
    l_map = {}
    for campaign in levels_data:
        for level in campaign.get("levels", []):
            if "original" in level and "slug" in level:
                l_map[level["original"]] = level["slug"]
    return l_map


def get_context(url):
    domain = (
        "CodeCombat"
        if "codecombat" in url
        else "www.ozaria.com"
        if "ozaria" in url
        else "Studio.Code"
    )
    match = re.search(r"/classroom/([a-fA-F0-9]{24})", url)
    instance = match.group(1) if match else None
    return domain, instance


# 3. MAIN EXECUTION LOOP
def main(DOMAIN, URL_LEVELS):
    url_course_instances = f"https://{DOMAIN}/db/course_instance?ownerID={OWNER_ID}"
    course_instances = fetch_json(url_course_instances, "Course Instances List")

    if not course_instances:
        print("No course instances found or API error occurred.")
        return

    # Extract unique classroom IDs to avoid duplicate API calls
    unique_classrooms = {item["classroomID"] for item in course_instances if "classroomID" in item}
    print(
        f"Found {len(course_instances)} course instances across {len(unique_classrooms)} unique classrooms."
    )

    levels_data = fetch_json(URL_LEVELS, "Global Course Data")
    level_map = build_level_map(levels_data)

    all_rows = []

    for index, class_id in enumerate(unique_classrooms):
        print(
            f"\n--- Processing Classroom {index + 1}/{len(unique_classrooms)} (ID: {class_id}) ---"
        )

        # Build URLs dynamically
        url_members = f"https://{DOMAIN}/db/classroom/{class_id}/members?project=firstName,lastName,name&memberLimit=100"
        url_sessions = (
            f"https://{DOMAIN}/db/classroom/{class_id}/member-sessions?memberLimit=100"
        )

        members_data = fetch_json(url_members, "Members")
        sessions_data = fetch_json(url_sessions, "Sessions")

        if not members_data or not sessions_data:
            print(f"Skipping classroom {class_id} (No data returned)")
            continue

        # Build Student Map for this class
        student_map = build_student_map(members_data)
        domain, instance = get_context(url_sessions)

        # Process Sessions
        count = 0
        for entry in sessions_data:
            if not entry.get("state", {}).get("complete", False):
                continue

            uid = entry.get("creator")
            lid = entry.get("level", {}).get("original")

            all_rows.append(
                {
                    "username": student_map.get(uid, f"Unknown_Student_{uid}"),
                    "domain": domain,
                    "challenge_name": level_map.get(lid, f"Unknown_Level_{lid}"),
                    "timestamp": entry.get("changed", "").replace("Z", ""),
                    "course_id": "",
                    "course_instance": instance,  # This is the Classroom ID
                    "helper": "",
                }
            )
            count += 1
        print(f"Added {count} completed levels from this class.")

        # Sleep briefly to be nice to the API
        time.sleep(1)

    # Write once, after every classroom has been collected
    if all_rows:
        added = append_new_rows(all_rows)

        print(
            f"\nSUCCESS! Appended {added} rows to {FILENAME} "
            f"({len(all_rows) - added} already present)"
        )
    else:
        print("\nNo data found.")


if __name__ == "__main__":
    DOMAINS = ["www.ozaria.com", "codecombat.com"]
    for DOMAIN in DOMAINS:
        URL_LEVELS = f"https://{DOMAIN}/db/classroom-courses-data?language=python"
        main(DOMAIN, URL_LEVELS)
