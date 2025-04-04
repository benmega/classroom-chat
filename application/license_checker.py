# license_checker.py
import json
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.exceptions import InvalidSignature

def load_license(public_key_path="public_key.pem", license_path="license.lic"):
    try:
        with open(license_path) as f:
            data = json.load(f)
        license_json = json.dumps(data["license"], separators=(',', ':'), sort_keys=True).encode()
        signature = bytes.fromhex(data["signature"])
    except Exception as e:
        print(f"License load failed: {e}")
        return {"is_premium": False}

    try:
        with open(public_key_path, "rb") as key_file:
            public_key = serialization.load_pem_public_key(key_file.read())
        public_key.verify(
            signature,
            license_json,
            padding.PKCS1v15(),
            hashes.SHA256()
        )
        return {
            "is_premium": "premium" in data["license"].get("features", []),
            "licensee": data["license"].get("licensee")
        }
    except InvalidSignature:
        print("Invalid license signature")
        return {"is_premium": False}
