"""
File: generate_user_qr_codes.py
Type: py
Summary: Generate QR codes for all users linking to their profile pages.
"""

import os
import sys

# Add parent directory to path to import application modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import qrcode
from application import create_app
from application.models.user import User


def generate_qr_codes():
    """Query all users and generate QR codes linking to their profile pages."""
    app = create_app()

    with app.app_context():
        # Query all users
        users = User.query.all()

        if not users:
            print("No users found in the database.")
            return

        # Create output directory for QR codes
        output_dir = os.path.join(os.path.dirname(__file__), '..', 'userData', 'qr_codes')
        os.makedirs(output_dir, exist_ok=True)

        print(f"Generating QR codes for {len(users)} users...")
        print(f"Output directory: {output_dir}\n")

        for user in users:
            # Use slug for profile URL
            if not user.slug:
                print(f"Warning: User '{user.username}' has no slug. Skipping...")
                continue

            # Generate profile URL
            profile_url = f"https://blossom.benmega.com/user/profile/{user.slug}"

            # Create QR code
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            qr.add_data(profile_url)
            qr.make(fit=True)

            # Generate image
            img = qr.make_image(fill_color="black", back_color="white")

            # Save QR code
            filename = f"{user.slug}_qr.png"
            filepath = os.path.join(output_dir, filename)
            img.save(filepath)

            print(f"✓ Generated QR code for {user.nickname} (@{user.username})")
            print(f"  Slug: {user.slug}")
            print(f"  URL: {profile_url}")
            print(f"  File: {filename}\n")

        print(f"Done! Generated {len(users)} QR codes in {output_dir}")


if __name__ == "__main__":
    generate_qr_codes()
