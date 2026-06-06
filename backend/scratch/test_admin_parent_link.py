import requests
import json

BASE = "http://localhost:8000"

s = requests.Session()

# Login using dev-login bypass for the admin user
r = s.get(f"{BASE}/dev-login?username=ben")
print(f"1. Login as admin (ben): {r.status_code}")

# Get all users to find the parent and students
r = s.get(f"{BASE}/api/admin/users")
users = r.json().get("users", [])

test_parent = next((u for u in users if u["username"] == "test_parent"), None)
test_student = next((u for u in users if u["username"] == "ai teacher"), None)

if not test_parent or not test_student:
    print("Could not find test parent or student")
    exit(1)

parent_id = test_parent["id"]
student_id = test_student["id"]

print(f"\nParent: {test_parent['username']} (ID: {parent_id})")
print(f"Student: {test_student['username']} (ID: {student_id})")

# 2. Get parent children
r = s.get(f"{BASE}/api/admin/parents/{parent_id}/children")
print(f"\n2. GET children: {r.status_code}")
children = r.json().get("children", [])
print(f"   Children: {[c['username'] for c in children]}")

# 3. Unlink
r = s.post(f"{BASE}/api/admin/parents/{parent_id}/unlink/{student_id}")
print(f"\n3. POST unlink: {r.status_code}")
print(f"   Response: {r.json()}")

# 4. Get children again to verify unlink
r = s.get(f"{BASE}/api/admin/parents/{parent_id}/children")
children_after_unlink = r.json().get("children", [])
print(f"\n4. GET children after unlink: {r.status_code}")
print(f"   Children: {[c['username'] for c in children_after_unlink]}")

# 5. Link
r = s.post(f"{BASE}/api/admin/parents/{parent_id}/link/{student_id}")
print(f"\n5. POST link: {r.status_code}")
print(f"   Response: {r.json()}")

# 6. Get children again to verify link
r = s.get(f"{BASE}/api/admin/parents/{parent_id}/children")
children_after_link = r.json().get("children", [])
print(f"\n6. GET children after link: {r.status_code}")
print(f"   Children: {[c['username'] for c in children_after_link]}")
