import requests
import os

BASE_URL = "http://localhost:8000"
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
IMAGE_PATH = os.path.normpath(os.path.join(BACKEND_DIR, "..", "frontend", "static", "images", "rubber_duck.png"))

def test_pfp_upload():
    session = requests.Session()
    
    # 1. Login
    login_data = {
        "username": "blossomstudent01",
        "password": "Bls01"
    }
    print(f"Logging in to {BASE_URL}/user/login...")
    r = session.post(f"{BASE_URL}/user/login", json=login_data)
    if r.status_code != 200:
        print(f"Login failed: {r.status_code} {r.text}")
        return

    print("Login successful!")

    # 2. Upload Profile Picture
    if not os.path.exists(IMAGE_PATH):
        print(f"Test image NOT found: {IMAGE_PATH}")
        return

    print(f"Uploading {IMAGE_PATH} to /user/api/profile-picture...")
    with open(IMAGE_PATH, 'rb') as f:
        files = {'profile_picture': ('rubber_duck.png', f, 'image/png')}
        r = session.post(f"{BASE_URL}/user/api/profile-picture", files=files)
    
    if r.status_code != 200:
        print(f"Upload failed: {r.status_code} {r.text}")
    else:
        print("Upload request successful!")
        print(r.json())

if __name__ == "__main__":
    test_pfp_upload()
