"""
File: generate_user_qr_codes.py
Type: py
Summary: Generate QR codes for approved students linking to their profile pages.
"""

import argparse
import os
import sys
from datetime import date, timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import qrcode
from application import create_app
from application.models.user import User
from tools.profile_urls import build_profile_url, default_base_url


def get_qr_users(include_admins=False, active_days=None):
    """Users to generate QR codes for (needs an app context).

    By default only approved students. include_admins also returns admins,
    parents and unapproved accounts. active_days keeps only users who earned a
    daily duck within that many days.
    """
    query = User.query
    if not include_admins:
        query = query.filter(User.role == "student", User.is_approved.is_(True))
    if active_days is not None:
        cutoff = date.today() - timedelta(days=active_days)
        query = query.filter(User.last_daily_duck >= cutoff)
    return query.all()


def generate_qr_codes(
    base_url=None, include_admins=False, active_days=None, output_dir=None
):
    """Query the matching users and generate QR codes linking to their profile pages."""
    app = create_app()

    with app.app_context():
        users = get_qr_users(include_admins=include_admins, active_days=active_days)

        if not users:
            print("No matching users found in the database.")
            return

        if output_dir is None:
            output_dir = os.path.join(
                os.path.dirname(__file__), "..", "userData", "qr_codes"
            )
        os.makedirs(output_dir, exist_ok=True)

        print(f"Generating QR codes for {len(users)} users...")
        print(f"Output directory: {output_dir}\n")

        generated = 0
        for user in users:
            # Use slug for profile URL
            if not user.slug:
                print(f"Warning: User '{user.username}' has no slug. Skipping...")
                continue

            # Generate profile URL
            profile_url = build_profile_url(user.slug, base_url)

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
            generated += 1

        print(f"Done! Generated {generated} QR codes in {output_dir}")


def parse_args(argv=None):
    parser = argparse.ArgumentParser(
        description="Generate QR codes linking to student profile pages."
    )
    parser.add_argument(
        "--base-url",
        default=default_base_url(),
        help="Frontend base URL (default: $PROFILE_BASE_URL or %(default)s)",
    )
    parser.add_argument(
        "--active-days",
        type=int,
        default=None,
        metavar="N",
        help="Only users who earned a daily duck in the last N days (default: all)",
    )
    parser.add_argument(
        "--include-admins",
        action="store_true",
        help="Also generate codes for admins, parents and unapproved users",
    )
    return parser.parse_args(argv)


if __name__ == "__main__":
    args = parse_args()
    generate_qr_codes(
        base_url=args.base_url,
        include_admins=args.include_admins,
        active_days=args.active_days,
    )
