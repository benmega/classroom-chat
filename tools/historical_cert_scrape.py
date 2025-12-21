import csv
import os
import time

import requests

# --------------------------------------------------------------------------------
# 1. CONFIGURATION
# --------------------------------------------------------------------------------
YOUR_COOKIE = """__stripe_mid=1ebd10bd-7567-4df5-816f-79a9b780842852846f; _fbp=fb.1.1699689886954.171100771; cf_clearance=_RJjbBs.CVgd42U1MO1ZKjKuTD.GNdDOVgzwpbDpooA-1746367538-1.2.1.1-9jqn.40lzWGvjocpB2ne1Z7IAWofVjqtuHrd4LYso32hZrN5Ri4ZJqE8nJFCsyZJGvzRmWB9t2WgydqSbzPQXINuNBt96YNSCAs6LIxbRXQnfqDBxaFLdIyQQgDorw_ckX1lgMQ0u8fZm82pMQTZGEdokVgLMMtyZkUrHHvI18M3RlTPA_Vda.NVdh5Ow_Zd477nSREgoYYn2LeePfSBPiK78Z8zx9bxvesYdaoE36RN1_hlWxuD_sPev4R3SS.MWaHLIMIVpOKsW9Ybsp4XL3uE7DmvRJOn2vEdlYdw0NbcOkzcIBb3OJ8YBmSMrHJQeXHZwuKp.qqlyiJZJASLtd76vgcO4Qgh1FVSf4lnRHlNSmftqVLs0STLWgdTy262; _ga_CLTH4TL5L8=deleted; _gid=GA1.2.590278429.1765512323; shaTagVal=production-2025-12-11-09-35-36; g_state={"i_l":0,"i_ll":1765612960132}; _ga=GA1.1.1923261573.1699063009; fs_lua=1.1765613059660; fs_uid=#RQW5S#ee6f16b5-763c-410a-9ab0-03a5dde36753:59948c97-fcdd-42df-a99b-5540ff238a79:1765612957311::3#8d074e9c#/1790492809; _gat=1; codecombat.sess=eyJwYXNzcG9ydCI6eyJ1c2VyIjp7ImlkIjoiNjJkMjNkOTc1ZGFmZDYwMDI1ZjhjNTIwIiwiY3JlYXRlZCI6IjIwMjUtMTItMTNUMDg6MDQ6NTgrMDA6MDAiLCJleHBpcmVzIjoiMjAyNi0wMS0xM1QwODowNDo1OCswMDowMCJ9fX0=; codecombat.sess.sig=0jr8Ykuo2KAq3Dj8b4NsyQcWeXI; _ga_CLTH4TL5L8=GS2.1.s1765611399$o401$g1$t1765613112$j6$l0$h0"""

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Cookie": YOUR_COOKIE.replace("\n", ""),
    "Accept": "application/json",
}

OWNER_ID = "62d23d975dafd60025f8c520"
FILENAME = "../instance/migration/certificate_log.csv"


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
        return []


def build_student_map(members_data):
    s_map = {}
    for s in members_data:
        # Some objects use 'name', others 'firstName'/'lastName'
        name = s.get("name", "").strip()
        if not name:
            f = s.get("firstName", "")
            l = s.get("lastName", "")
            name = f"{f} {l}".strip()
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


# --------------------------------------------------------------------------------
# 3. MAIN EXECUTION LOOP
# --------------------------------------------------------------------------------
def main(DOMAIN, URL_LEVELS):
    # 1. Fetch Classrooms (via Teacher's Course Instances)
    # This endpoint lists all instances belonging to the teacher, which allows us to find all classroom IDs.
    url_teacher_instances = f"https://{DOMAIN}/db/course_instance?ownerID={OWNER_ID}"
    teacher_instances = fetch_json(url_teacher_instances, "Teacher Class List")

    if not teacher_instances:
        print("No classes found or API error.")
        return

    # Create a map of Classroom ID -> Classroom Name
    classroom_map = {}
    for item in teacher_instances:
        if "classroomID" in item and "classroomName" in item:
            classroom_map[item["classroomID"]] = item["classroomName"]
        elif "classroomID" in item:
            classroom_map[item["classroomID"]] = "Unknown Class Name"

    unique_classrooms = list(classroom_map.keys())
    print(f"Found {len(unique_classrooms)} unique classrooms.")

    # 2. Fetch Global Course Data (To get course names like 'CS1', 'Game Dev 2')
    levels_data = fetch_json(URL_LEVELS, "Global Course Data")
    course_name_map = build_course_name_map(levels_data)

    all_rows = []

    # 3. Iterate Through Each Classroom
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

    # 4. Save to CSV
    if all_rows:
        os.makedirs(os.path.dirname(FILENAME), exist_ok=True)
        fields = [
            "student_name",
            "class_name",
            "course_name",
            "certificate_url",
            "domain",
            "completion_date",
        ]

        # Append mode
        file_exists = os.path.isfile(FILENAME)
        with open(FILENAME, "a", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fields)
            if not file_exists:
                writer.writeheader()
            writer.writerows(all_rows)

        print(f"\nSUCCESS! Appended {len(all_rows)} certificates to {FILENAME}")
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
