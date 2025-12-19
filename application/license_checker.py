# license_checker.py
import json
import os
import sys

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import padding


def resource_path(relative_path):
    """Get absolute path to resource (compatible with PyInstaller)"""
    if hasattr(sys, "_MEIPASS"):
        return os.path.join(sys._MEIPASS, relative_path)
    return os.path.join(os.path.abspath("."), relative_path)


def load_license(public_key_path="public_key.pem", license_path="license.lic"):
    public_key_path = resource_path(os.path.join("license", public_key_path))
    license_path = resource_path(os.path.join("license", license_path))

    try:
        with open(license_path) as f:
            data = json.load(f)
        license_json = json.dumps(
            data["license"], separators=(",", ":"), sort_keys=True
        ).encode()
        signature = bytes.fromhex(data["signature"])
    except Exception as e:
        print(f"License load failed: {e}")
        return {"is_premium": False}

    try:
        with open(public_key_path, "rb") as key_file:
            public_key = serialization.load_pem_public_key(key_file.read())
        public_key.verify(signature, license_json, padding.PKCS1v15(), hashes.SHA256())
        return {
            "is_premium": "premium" in data["license"].get("features", []),
            "licensee": data["license"].get("licensee"),
        }
    except InvalidSignature:
        print("Invalid license signature")
        return {"is_premium": False}
