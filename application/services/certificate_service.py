import os
import requests
from flask import current_app

CERT_SAVE_PATH = "certificates"

def download_certificate(url, user, achievement):
    os.makedirs(CERT_SAVE_PATH, exist_ok=True)
    print("yes")
    filename = f"{user.username}_{achievement.slug}.pdf"
    filepath = os.path.join(CERT_SAVE_PATH, filename)

    resp = requests.get(url, stream=True, timeout=10)
    if resp.status_code == 200 and resp.headers.get("Content-Type") == "application/pdf":
        with open(filepath, "wb") as f:
            for chunk in resp.iter_content(chunk_size=8192):
                f.write(chunk)
        return filepath
    return None
