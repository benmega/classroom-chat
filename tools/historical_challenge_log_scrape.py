import requests
import csv
import os
import re
import json
import time

# --------------------------------------------------------------------------------
# 1. CONFIGURATION
# --------------------------------------------------------------------------------
# PASTE YOUR COOKIE HERE
YOUR_COOKIE = """_ga=GA1.2.1818552674.1665805079; _fbp=fb.1.1665805090786.306764578; __stripe_mid=3291438a-ab74-4a95-81de-083406d17536128861; cf_clearance=hRI_WhIEPkZTlnEFl1Epd83ilpf.LQgn0zUQksuHu3A-1746342968-1.2.1.1-h.o9x1I4k1pRqSONn66lo6oPTH588wxXUV7GWliEzUEpncLGVsAqXGakcPMZPFkVTq0b1TdsgSPxOH3OZb899XLzBRqV.7KyzKsvJHsMwBpUMfJydmzzHr1uYW2h7667M0T76nYtDHIJq.aAQFvvoZwWsbulwqqVba8E46I8F93X6RzO8.kuzwKAZ8O8C_AW.Bulp9ub8SAw3vIH6c1akg7mmQTv_Cc6DXfBzNHopHn4uicVoNDlImOxTrT2ib6ye.cKjiXyqiG9tgD6a0.EECQyWPQ25YporprSESSjESyh20qtAJ3GPT3Cpk4a2LhPzP4jIe1x0h6PgK0ETUPsSo9iexrLFZOOszBxRBDX_W4l4xOJje3MmUEhHE_JjSUQ; _gcl_au=1.1.462457496.1761962615; g_state={"i_l":0,"i_ll":1765088852115}; shaTagVal=production-2025-12-05-08-10-20; _gid=GA1.2.1240164609.1765378129; codecombat.sess=eyJwYXNzcG9ydCI6eyJ1c2VyIjp7ImlkIjoiNjJkMjNkOTc1ZGFmZDYwMDI1ZjhjNTIwIiwiY3JlYXRlZCI6IjIwMjUtMTItMTBUMTQ6NTY6MDcrMDA6MDAiLCJleHBpcmVzIjoiMjAyNi0wMS0xMFQxNDo1NjowNyswMDowMCJ9fX0=; codecombat.sess.sig=bPj6gzsM_4BYzOtl1AGeKY-f6mg; fs_lua=1.1765378568744; fs_uid=#RQW5S#1d9cf541-7531-42eb-8f75-c5ef2280d761:e9962044-7e56-4741-b520-586330a04f76:1765378132171::2#e29d7b99#/1787464886; _gat=1; _ga_6D0ZC7L5M1=GS2.2.s1765378132$o528$g1$t1765378569$j60$l0$h0; _dd_s=logs=1&id=71bfbfd9-c19a-4008-acab-a92d8519a9a9&created=1765378129054&expire=1765379469374"""

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Cookie": YOUR_COOKIE.replace('\n', ''),
    "Accept": "application/json"
}

# ENTER THE TEACHER/OWNER ID HERE
# (This ID was extracted from the URL you provided in the previous prompt)
OWNER_ID = "62d23d975dafd60025f8c520"


FILENAME = '../instance/migration/master_challenge_log.csv'


# --------------------------------------------------------------------------------
# 2. HELPER FUNCTIONS
# --------------------------------------------------------------------------------
def fetch_json(url, description):
    print(f"Fetching {description}...")
    try:
        response = requests.get(url, headers=HEADERS)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching {description}: {e}")
        if 'response' in locals() and response.status_code == 401:
            print("(!) AUTH ERROR: Cookie expired.")
        return []


def build_student_map(members_data):
    s_map = {}
    for s in members_data:
        name = s.get('name', '').strip()
        if not name: name = s.get('name', 'Unknown')
        s_map[s['_id']] = name
    return s_map


def build_level_map(levels_data):
    l_map = {}
    for campaign in levels_data:
        for level in campaign.get('levels', []):
            if 'original' in level and 'slug' in level:
                l_map[level['original']] = level['slug']
    return l_map


def get_context(url):
    domain = "CodeCombat" if "codecombat" in url else "www.ozaria.com" if "ozaria" in url else "Studio.Code"
    match = re.search(r'/classroom/([a-fA-F0-9]{24})', url)
    instance = match.group(1) if match else None
    return domain, instance


# --------------------------------------------------------------------------------
# 3. MAIN EXECUTION LOOP
# --------------------------------------------------------------------------------
def main(DOMAIN, URL_LEVELS):
    # 1. Fetch Course Instances Dynamically
    url_course_instances = f"https://{DOMAIN}/db/course_instance?ownerID={OWNER_ID}"
    course_instances = fetch_json(url_course_instances, "Course Instances List")

    if not course_instances:
        print("No course instances found or API error occurred.")
        return

    # Extract unique classroom IDs to avoid duplicate API calls
    unique_classrooms = set(item['classroomID'] for item in course_instances if 'classroomID' in item)
    print(f"Found {len(course_instances)} course instances across {len(unique_classrooms)} unique classrooms.")

    # 2. Fetch Global Level Data (Once)
    levels_data = fetch_json(URL_LEVELS, "Global Course Data")
    level_map = build_level_map(levels_data)

    all_rows = []

    # 3. Iterate Through Each Classroom
    for index, class_id in enumerate(unique_classrooms):
        print(f"\n--- Processing Classroom {index + 1}/{len(unique_classrooms)} (ID: {class_id}) ---")

        # Build URLs dynamically
        url_members = f"https://{DOMAIN}/db/classroom/{class_id}/members?project=firstName,lastName,name&memberLimit=100"
        url_sessions = f"https://{DOMAIN}/db/classroom/{class_id}/member-sessions?memberLimit=100"

        # Fetch Data
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
            if not entry.get('state', {}).get('complete', False):
                continue

            uid = entry.get('creator')
            lid = entry.get('level', {}).get('original')

            all_rows.append({
                'username': student_map.get(uid, f"Unknown_Student_{uid}"),
                'domain': domain,
                'challenge_name': level_map.get(lid, f"Unknown_Level_{lid}"),
                'timestamp': entry.get('changed', '').replace('Z', ''),
                'course_id': '',
                'course_instance': instance,  # This is the Classroom ID
                'helper': ''
            })
            count += 1
        print(f"Added {count} completed levels from this class.")

        # Sleep briefly to be nice to the API
        time.sleep(1)

        # 4. Save Master CSV
        if all_rows:
            # Ensure directory exists
            os.makedirs(os.path.dirname(FILENAME), exist_ok=True)

            fields = ['username', 'domain', 'challenge_name', 'timestamp', 'course_id', 'course_instance', 'helper']

            # Check if the file already exists to avoid duplicate headers
            file_exists = os.path.isfile(FILENAME)

            # Open in 'a' (append) mode instead of 'w' (write)
            with open(FILENAME, 'a', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=fields)

                # Only write the header if the file is brand new
                if not file_exists:
                    writer.writeheader()

                writer.writerows(all_rows)

            print(f"\nSUCCESS! Appended {len(all_rows)} rows to {FILENAME}")
        else:
            print("\nNo data found.")


if __name__ == "__main__":
    DOMAINS = ["www.ozaria.com", "codecombat.com"]
    for DOMAIN in DOMAINS:
        URL_LEVELS = f"https://{DOMAIN}/db/classroom-courses-data?language=python"
        main(DOMAIN,URL_LEVELS)