import requests

url = "http://localhost:8000/user/login"
data = {"username": "ben", "password": "rK@76E6P7z7E"}

try:
    response = requests.post(url, json=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
