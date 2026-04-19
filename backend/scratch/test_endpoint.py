import requests

try:
    response = requests.get('http://localhost:8000/api/admin/advanced-panel')
    print(f"Status Code: {response.status_code}")
    print(f"Response JSON: {response.json()}")
except Exception as e:
    print(f"Error: {e}")
