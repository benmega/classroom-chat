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
    """
    Stubbed license loader. Feature is not needed at this stage.
    Always returns premium status to avoid logic breaks.
    """
    return {
        "is_premium": True,
        "licensee": "Development User",
    }

