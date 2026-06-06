"""
Test the parent API endpoints end-to-end.
"""
import requests
import json

BASE = "http://localhost:8000"

s = requests.Session()

# 1. Login as parent
r = s.post(f"{BASE}/user/login", json={"username": "test_parent", "password": "parent123"})
print(f"1. Login: {r.status_code}")
login_data = r.json()
user = login_data.get("user", {})
print(f"   Role in login response: {user.get('role', 'NOT FOUND')}")

# 2. Check auth status returns role
r = s.get(f"{BASE}/user/api/auth/status")
auth = r.json()
print(f"\n2. Auth status: {r.status_code}")
auth_user = auth.get("data", {}).get("user", {})
print(f"   Role in auth: {auth_user.get('role', 'NOT FOUND')}")
print(f"   Has duck_balance: {'duck_balance' in auth_user}")

# 3. GET /api/parents/children
r = s.get(f"{BASE}/api/parents/children")
print(f"\n3. Children endpoint: {r.status_code}")
children_data = r.json()
print(f"   Response envelope: status={children_data.get('status')}")
children = children_data.get("data", {}).get("children", [])
print(f"   Number of children: {len(children)}")
for c in children:
    print(f"   - id={c['id']}, username={c['username']}, nickname={c.get('nickname')}")

# 4. GET /api/parents/student/<id>/report (using first child)
if children:
    student_id = children[0]["id"]
    r = s.get(f"{BASE}/api/parents/student/{student_id}/report")
    print(f"\n4. Report card for student {student_id}: {r.status_code}")
    report = r.json()
    print(f"   Status: {report.get('status')}")
    data = report.get("data", {})
    print(f"   Username: {data.get('username')}")
    print(f"   Has contribution_data: {'contribution_data' in data}")
    print(f"   Has course_progress: {'course_progress' in data}")
    print(f"   Course progress: {json.dumps(data.get('course_progress', {}), indent=2)}")
    print(f"   Achievements count: {len(data.get('unlocked_achievements', []))}")
    
    # CRITICAL: Verify gamification data is EXCLUDED
    print(f"\n   === GAMIFICATION EXCLUSION CHECK ===")
    print(f"   'duck_balance' in response: {'duck_balance' in data}")
    print(f"   'earned_ducks' in response: {'earned_ducks' in data}")
    print(f"   'packets' in response: {'packets' in data}")
    print(f"   'skills' in response: {'skills' in data}")
    print(f"   'projects' in response: {'projects' in data}")

# 5. Test unauthorized access - student 999 (not linked)
r = s.get(f"{BASE}/api/parents/student/999/report")
print(f"\n5. Unauthorized student access: {r.status_code}")
print(f"   Response: {r.json()}")

# 6. Logout and test that endpoints require auth
s.get(f"{BASE}/user/logout")
r = s.get(f"{BASE}/api/parents/children")
print(f"\n6. Children after logout: {r.status_code}")

print("\n=== ALL TESTS COMPLETE ===")
