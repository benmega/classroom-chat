"""Quick test: get ben's report (id=2) which should have real progress data."""
import requests
import json

s = requests.Session()
s.post("http://localhost:8000/user/login", json={"username": "test_parent", "password": "parent123"})
r = s.get("http://localhost:8000/api/parents/student/2/report")
data = r.json().get("data", {})

print(f"Student: {data.get('username')} ({data.get('nickname')})")
print(f"Course Progress: {json.dumps(data.get('course_progress', {}), indent=2)}")
print(f"Achievements: {len(data.get('unlocked_achievements', []))}")
for a in data.get("unlocked_achievements", [])[:5]:
    print(f"  - {a['name']} ({a['slug']}): {a.get('description', 'N/A')}")
print(f"Contribution data months: {len(data.get('contribution_data', {}).get('months', []))}")
