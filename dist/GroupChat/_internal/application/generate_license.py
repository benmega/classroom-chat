# generate_license.py
import json
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.backends import default_backend

def sign_license(data: dict, private_key_path: str):
    license_json = json.dumps(data, separators=(',', ':'), sort_keys=True).encode()

    with open(private_key_path, "rb") as key_file:
        private_key = serialization.load_pem_private_key(
            key_file.read(), password=None, backend=default_backend()
        )

    signature = private_key.sign(
        license_json,
        padding.PKCS1v15(),
        hashes.SHA256()
    )

    return {
        "license": data,
        "signature": signature.hex()
    }

# Example license data
license_data = {
    "licensee": "Ms. Garcia’s Class",
    "features": ["premium"],
    "expires": "2099-12-31"
}

signed = sign_license(license_data, "../license/private_key.pem")

with open("../license/license.lic", "w") as f:
    json.dump(signed, f)
