import requests

# Test adjustments
url = "http://localhost:5173/api/admin/adjust_ducks" # Proxy to backend
data = {
    'username': 'blossomstudent01',
    'amount': 5.0
}
# Since we removed the JSON header, we should send it as form data
response = requests.post(url, data=data) 
print(f"Status: {response.status_code}")
print(f"Response: {response.text}")
