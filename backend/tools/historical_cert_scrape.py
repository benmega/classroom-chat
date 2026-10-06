import csv
import os
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

OWNER_ID = "62d23d975dafd60025f8c520"

# Anchored on this file, so the CSV lands in backend/instance/migration
# whatever the working directory is
OUT_DIR = Path(__file__).resolve().parents[1] / "instance" / "migration"
FILENAME = OUT_DIR / "certificate_log.csv"

CSV_FIELDS = [
    "student_name",
    "class_name",
    "course_name",
    "certificate_url",
    "domain",
    "completion_date",
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
        return []


def append_new_rows(rows):
    """Append rows whose certificate_url is not already in FILENAME.

    Re-running the scraper therefore never duplicates rows. Returns the number
    of rows added.
    """
    os.makedirs(OUT_DIR, exist_ok=True)

    has_content = os.path.isfile(FILENAME) and os.path.getsize(FILENAME) > 0
    seen = set()
    if has_content:
        with open(FILENAME, newline="", encoding="utf-8") as f:
            seen = {row.get("certificate_url") for row in csv.DictReader(f)}

    new_rows = []
    for row in rows:
        if row["certificate_url"] in seen:
            continue
        seen.add(row["certificate_url"])
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
        # Some objects use 'name', others 'firstName'/'lastName'
        name = s.get("name", "").strip()
        if not name:
            first_name = s.get("firstName", "")
            last_name = s.get("lastName", "")
            name = f"{first_name} {last_name}".strip()
        if not name:
            name = "Unknown Student"
        s_map[s["_id"]] = name
    return s_map


def build_course_name_map(levels_data):
    # Maps Course ID -> Course Name (e.g., "560f1a9f..." -> "Introduction to Computer Science")
    c_map = {}
    for course in levels_data:
        if "_id" in course and "name" in course:
            c_map[course["_id"]] = course["name"]
    return c_map


# 3. MAIN EXECUTION LOOP
def main(DOMAIN, URL_LEVELS):
    # This endpoint lists all instances belonging to the teacher, which allows us to find all classroom IDs.
    url_teacher_instances = f"https://{DOMAIN}/db/course_instance?ownerID={OWNER_ID}"
    teacher_instances = fetch_json(url_teacher_instances, "Teacher Class List")

    if not teacher_instances:
        print("No classes found or API error.")
        return

    classroom_map = {}
    for item in teacher_instances:
        if "classroomID" in item and "classroomName" in item:
            classroom_map[item["classroomID"]] = item["classroomName"]
        elif "classroomID" in item:
            classroom_map[item["classroomID"]] = "Unknown Class Name"

    unique_classrooms = list(classroom_map.keys())
    print(f"Found {len(unique_classrooms)} unique classrooms.")

    levels_data = fetch_json(URL_LEVELS, "Global Course Data")
    course_name_map = build_course_name_map(levels_data)

    all_rows = []

    for index, class_id in enumerate(unique_classrooms):
        class_name = classroom_map.get(class_id, class_id)
        print(
            f"\n--- Processing {index + 1}/{len(unique_classrooms)}: {class_name} ---"
        )

        # A. Fetch Students (Members)
        url_members = f"https://{DOMAIN}/db/classroom/{class_id}/members?project=firstName,lastName,name"
        members_data = fetch_json(url_members, "Members")
        if not members_data:
            print("No members found, skipping.")
            continue

        student_map = build_student_map(members_data)

        # B. Fetch Student Course Progress (Course Instances)
        # This endpoint returns the status of every course for every student in this specific classroom
        url_student_instances = (
            f"https://{DOMAIN}/db/course_instance?classroomID={class_id}"
        )
        student_instances = fetch_json(url_student_instances, "Course Progress")

        count = 0
        for entry in student_instances:
            # We only want COMPLETED courses
            if not entry.get("complete"):
                continue

            user_id = entry.get("userID")
            course_id = entry.get("courseID")
            instance_id = entry.get("_id")  # The ID of this completion record

            # If the user is not in our member list (e.g. deleted user), skip
            student_name = student_map.get(user_id)
            if not student_name:
                continue

            # Construct Certificate URL
            # The pattern is /certificates/{CourseInstanceID}
            # We add query params just to be safe, though the ID is usually sufficient
            cert_url = f"https://{DOMAIN}/certificates/{instance_id}?class={class_id}&course={course_id}"

            all_rows.append(
                {
                    "student_name": student_name,
                    "class_name": class_name,
                    "course_name": course_name_map.get(course_id, "Unknown Course"),
                    "certificate_url": cert_url,
                    "domain": DOMAIN,
                    "completion_date": entry.get("updated", "").replace("Z", ""),
                }
            )
            count += 1

        print(f"Found {count} certificates in this class.")
        time.sleep(1)  # Be nice to API

    if all_rows:
        added = append_new_rows(all_rows)

        print(
            f"\nSUCCESS! Appended {added} certificates to {FILENAME} "
            f"({len(all_rows) - added} already present)"
        )
    else:
        print("\nNo certificates found.")


if __name__ == "__main__":
    # Ozaria and CodeCombat share structure, but certificates might be domain specific
    DOMAINS = ["codecombat.com", "ozaria.com"]
    for DOMAIN in DOMAINS:
        print(f"\nScanning {DOMAIN}...")
        # URL to get the definitions of courses (names)
        URL_LEVELS = f"https://{DOMAIN}/db/classroom-courses-data"
        main(DOMAIN, URL_LEVELS)
