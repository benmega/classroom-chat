import csv
import os

import requests

# --------------------------------------------------------------------------------
# 1. CONFIGURATION
# --------------------------------------------------------------------------------
YOUR_COOKIE = """__stripe_mid=1ebd10bd-7567-4df5-816f-79a9b780842852846f; _fbp=fb.1.1699689886954.171100771; cf_clearance=_RJjbBs.CVgd42U1MO1ZKjKuTD.GNdDOVgzwpbDpooA-1746367538-1.2.1.1-9jqn.40lzWGvjocpB2ne1Z7IAWofVjqtuHrd4LYso32hZrN5Ri4ZJqE8nJFCsyZJGvzRmWB9t2WgydqSbzPQXINuNBt96YNSCAs6LIxbRXQnfqDBxaFLdIyQQgDorw_ckX1lgMQ0u8fZm82pMQTZGEdokVgLMMtyZkUrHHvI18M3RlTPA_Vda.NVdh5Ow_Zd477nSREgoYYn2LeePfSBPiK78Z8zx9bxvesYdaoE36RN1_hlWxuD_sPev4R3SS.MWaHLIMIVpOKsW9Ybsp4XL3uE7DmvRJOn2vEdlYdw0NbcOkzcIBb3OJ8YBmSMrHJQeXHZwuKp.qqlyiJZJASLtd76vgcO4Qgh1FVSf4lnRHlNSmftqVLs0STLWgdTy262; _ga_CLTH4TL5L8=deleted; shaTagVal=production-2026-01-02-07-30-35; _gid=GA1.2.1071606917.1767505397; g_state={"i_l":0,"i_ll":1767505400853}; _ga=GA1.1.1923261573.1699063009; fs_uid=#RQW5S#ee6f16b5-763c-410a-9ab0-03a5dde36753:bdeab0a7-4924-4657-8009-6f34e454bcbf:1767511148402::1#8d074e9c#/1790492865; fs_lua=1.1767511148106; codecombat.sess=eyJwYXNzcG9ydCI6eyJ1c2VyIjp7ImlkIjoiNjJkMjNkOTc1ZGFmZDYwMDI1ZjhjNTIwIiwiY3JlYXRlZCI6IjIwMjYtMDEtMDRUMDc6Mjk6MTIrMDA6MDAiLCJleHBpcmVzIjoiMjAyNi0wMi0wNFQwNzoyOToxMiswMDowMCJ9fX0=; codecombat.sess.sig=f-Z5CyL6jsxdFGRqJOeclGxjkvg; _gat=1; _ga_CLTH4TL5L8=GS2.1.s1767511129$o420$g1$t1767511764$j60$l0$h0"""

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Cookie": YOUR_COOKIE.replace("\n", ""),
    "Accept": "application/json",
}

# The classroom ID you provided
CLASSROOM_ID = "675576077a41df06bfccf725"
DOMAIN = "codecombat.com"

# Output path to your migration folder
FILENAME = "../instance/migration/course_instances_seed.csv"


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


# --------------------------------------------------------------------------------
# 3. MAIN EXECUTION
# --------------------------------------------------------------------------------
def main():
    url = f"https://{DOMAIN}/db/course_instance?classroomID={CLASSROOM_ID}"

    # Fetch data from CodeCombat API
    instances_data = fetch_json(url, f"Course Instances for Classroom {CLASSROOM_ID}")

    if not instances_data:
        print("No data found or request failed.")
        return

    # Prepare rows to match the SQLAlchemy CourseInstance model
    all_rows = []
    for item in instances_data:
        all_rows.append({
            "id": item.get("_id"),  # Maps to id (primary key)
            "classroom_id": item.get("classroomID"),  # Maps to classroom_id (FK)
            "course_id": item.get("courseID"),  # Maps to course_id (FK)
            # created_at is handled by SQLAlchemy default=datetime.utcnow
        })

    # Save to CSV
    if all_rows:
        os.makedirs(os.path.dirname(FILENAME), exist_ok=True)

        # Columns must match the keys in the dict above
        fields = ["id", "classroom_id", "course_id"]

        with open(FILENAME, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fields)
            writer.writeheader()
            writer.writerows(all_rows)

        print(f"\nSUCCESS! Extracted {len(all_rows)} instances.")
        print(f"File ready for seeding: {FILENAME}")
    else:
        print("\nNo data to save.")


if __name__ == "__main__":
    main()