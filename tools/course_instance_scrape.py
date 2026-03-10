import csv
import os

import requests

# --------------------------------------------------------------------------------
# 1. CONFIGURATION
# --------------------------------------------------------------------------------
# Replace with your actual teacher/owner ID
OWNER_ID = "62d23d975dafd60025f8c520"

# Domains to iterate through
DOMAINS = ["codecombat.com", "www.ozaria.com"]

# Paste your copied cookie strings here.
# You can leave one as "YOUR_..._HERE" if you only want to scrape the other.
MANUAL_COOKIES = {
    "codecombat.com": r"""__stripe_mid=1ebd10bd-7567-4df5-816f-79a9b780842852846f; _fbp=fb.1.1699689886954.171100771; cf_clearance=_RJjbBs.CVgd42U1MO1ZKjKuTD.GNdDOVgzwpbDpooA-1746367538-1.2.1.1-9jqn.40lzWGvjocpB2ne1Z7IAWofVjqtuHrd4LYso32hZrN5Ri4ZJqE8nJFCsyZJGvzRmWB9t2WgydqSbzPQXINuNBt96YNSCAs6LIxbRXQnfqDBxaFLdIyQQgDorw_ckX1lgMQ0u8fZm82pMQTZGEdokVgLMMtyZkUrHHvI18M3RlTPA_Vda.NVdh5Ow_Zd477nSREgoYYn2LeePfSBPiK78Z8zx9bxvesYdaoE36RN1_hlWxuD_sPev4R3SS.MWaHLIMIVpOKsW9Ybsp4XL3uE7DmvRJOn2vEdlYdw0NbcOkzcIBb3OJ8YBmSMrHJQeXHZwuKp.qqlyiJZJASLtd76vgcO4Qgh1FVSf4lnRHlNSmftqVLs0STLWgdTy262; _ga_CLTH4TL5L8=deleted; _twpid=tw.1772528320333.958884590705396585; cookieconsent_status=allow; shaTagVal=production-2026-03-06-08-18-29; _gid=GA1.2.1991773930.1773112496; g_state={"i_l":0,"i_ll":1773112500568,"i_e":{"enable_itp_optimization":0}}; _ga=GA1.2.1923261573.1699063009; codecombat.sess=eyJwYXNzcG9ydCI6eyJ1c2VyIjp7ImlkIjoiNjJkMjNkOTc1ZGFmZDYwMDI1ZjhjNTIwIiwiY3JlYXRlZCI6IjIwMjYtMDMtMTBUMDQ6MTc6MDErMDA6MDAiLCJleHBpcmVzIjoiMjAyNi0wNC0xMFQwNDoxNzowMSswMDowMCJ9fX0=; codecombat.sess.sig=KVpgSBEgfEJ6_BJzKfY0kuJWMq0; _gat=1; fs_lua=1.1773116221876; fs_uid=#RQW5S#6539f0ac-4aa7-43b1-9d1e-56856a6879b6:3bad88fc-2bb6-4f34-b757-145ea8c957c8:1773116221876::1#b4a47c99#/1800267938; _ga_CLTH4TL5L8=GS2.1.s1773115109$o495$g0$t1773116233$j60$l0$h0""",
    "www.ozaria.com": r"""_ga=GA1.2.1818552674.1665805079; _fbp=fb.1.1665805090786.306764578; __stripe_mid=3291438a-ab74-4a95-81de-083406d17536128861; cf_clearance=hRI_WhIEPkZTlnEFl1Epd83ilpf.LQgn0zUQksuHu3A-1746342968-1.2.1.1-h.o9x1I4k1pRqSONn66lo6oPTH588wxXUV7GWliEzUEpncLGVsAqXGakcPMZPFkVTq0b1TdsgSPxOH3OZb899XLzBRqV.7KyzKsvJHsMwBpUMfJydmzzHr1uYW2h7667M0T76nYtDHIJq.aAQFvvoZwWsbulwqqVba8E46I8F93X6RzO8.kuzwKAZ8O8C_AW.Bulp9ub8SAw3vIH6c1akg7mmQTv_Cc6DXfBzNHopHn4uicVoNDlImOxTrT2ib6ye.cKjiXyqiG9tgD6a0.EECQyWPQ25YporprSESSjESyh20qtAJ3GPT3Cpk4a2LhPzP4jIe1x0h6PgK0ETUPsSo9iexrLFZOOszBxRBDX_W4l4xOJje3MmUEhHE_JjSUQ; _gcl_au=1.1.99809955.1769825755; cookieconsent_status=allow; _twpid=tw.1772528315223.234607693917789933; fs_uid=#RQW5S#a3bde662-d2c5-4d95-97f0-27efdd8fd933:223dff5f-562d-4513-b10c-b3a3bb3847e0:1772855920207::1#b4a47c99#/1801462981; g_state={"i_l":0,"i_ll":1772949191588,"i_e":{"enable_itp_optimization":0},"i_b":"ueRFpjxy+mRQ/nj4ANVr4oeRI7KdT5J0YMOK/dIAFnA"}; shaTagVal=production-2026-03-06-08-18-26; _gid=GA1.2.170334120.1773112752; __stripe_sid=01c1d180-1aff-4ef0-b662-8086d3e29b438cefd7; _ga_6D0ZC7L5M1=GS2.2.s1773115083$o579$g1$t1773115204$j60$l0$h0; codecombat.sess=eyJwYXNzcG9ydCI6eyJ1c2VyIjp7ImlkIjoiNjJkMjNkOTc1ZGFmZDYwMDI1ZjhjNTIwIiwiY3JlYXRlZCI6IjIwMjYtMDMtMTBUMDQ6MTE6MTErMDA6MDAiLCJleHBpcmVzIjoiMjAyNi0wNC0xMFQwNDoxMToxMSswMDowMCJ9fX0=; codecombat.sess.sig=py_y-vsLhi6Q6JeJcfUXDKeaClM; _dd_s=logs=1&id=7343db7a-09f7-4dc7-bcd5-18147f484fb8&created=1773112751474&expire=1773116776795; _gat=1"""
}

# Output path to your migration folder
FILENAME = "../instance/migration/course_instances_seed.csv"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
}


# --------------------------------------------------------------------------------
# 2. HELPER FUNCTIONS
# --------------------------------------------------------------------------------
def fetch_json(url, description, cookie_string):
    print(f"Fetching {description}...")

    # Copy headers so we can inject the specific cookie for this request
    req_headers = HEADERS.copy()
    req_headers["Cookie"] = cookie_string

    try:
        response = requests.get(url, headers=req_headers)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"  -> Error fetching {description}: {e}")
        return []


# --------------------------------------------------------------------------------
# 3. MAIN EXECUTION
# --------------------------------------------------------------------------------
def process_domain(domain):
    print(f"\n========================================================")
    print(f"Processing '{domain}'...")
    print(f"========================================================")

    # 1. Grab the manual cookie string from our config dictionary
    cookie_string = MANUAL_COOKIES.get(domain, "")

    if not cookie_string or "YOUR_" in cookie_string:
        print(f"  -> Skipping {domain}: No manual cookie provided in config.")
        return []

    # 2. Fetch Classrooms dynamically via Teacher's Course Instances
    url_teacher_instances = f"https://{domain}/db/course_instance?ownerID={OWNER_ID}"
    teacher_instances = fetch_json(url_teacher_instances, "Teacher Class List", cookie_string)

    if not teacher_instances:
        print(f"  -> No classes found or API error for {domain}.")
        return []

    # Extract unique classroom IDs
    classroom_ids = set()
    for item in teacher_instances:
        if "classroomID" in item:
            classroom_ids.add(item["classroomID"])

    print(f"  -> Found {len(classroom_ids)} unique classrooms on {domain}.")

    all_rows = []

    # 3. Loop through every dynamically found classroom ID
    for idx, cid in enumerate(classroom_ids, 1):
        print(f"\n--- Classroom {idx}/{len(classroom_ids)}: {cid} ---")
        url = f"https://{domain}/db/course_instance?classroomID={cid}"

        # Fetch data from API
        instances_data = fetch_json(url, f"Course Instances", cookie_string)

        if not instances_data:
            print(f"  -> No data found.")
            continue

        # Prepare rows to match the SQLAlchemy CourseInstance model
        for item in instances_data:
            all_rows.append({
                "id": item.get("_id"),  # Maps to id (primary key)
                "classroom_id": item.get("classroomID"),  # Maps to classroom_id (FK)
                "course_id": item.get("courseID"),  # Maps to course_id (FK)
                # created_at is handled by SQLAlchemy default=datetime.utcnow
            })

    return all_rows


def main():
    total_rows = []

    # 1. Iterate over both domains
    for domain in DOMAINS:
        domain_rows = process_domain(domain)
        total_rows.extend(domain_rows)

    # 2. Save all collected data to a single CSV
    if total_rows:
        os.makedirs(os.path.dirname(FILENAME), exist_ok=True)

        # Columns must exactly match the keys in the dict above
        fields = ["id", "classroom_id", "course_id"]

        with open(FILENAME, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fields)
            writer.writeheader()
            writer.writerows(total_rows)

        print(f"\nSUCCESS! Extracted a total of {len(total_rows)} instances across all domains.")
        print(f"File ready for seeding: {FILENAME}")
    else:
        print("\nNo data retrieved across any domains. Nothing to save.")


if __name__ == "__main__":
    main()