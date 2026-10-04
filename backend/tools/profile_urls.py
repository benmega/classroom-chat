"""
File: profile_urls.py
Path: backend/tools/profile_urls.py
Type: py
Summary: Shared builder for the public profile links printed on QR codes and student cards.
"""

import os

DEFAULT_PROFILE_BASE_URL = "https://blossom.benmega.com"


def default_base_url():
    """Frontend base URL; override with the PROFILE_BASE_URL environment variable."""
    return os.getenv("PROFILE_BASE_URL") or DEFAULT_PROFILE_BASE_URL


def build_profile_url(slug, base_url=None):
    """Return the public profile page URL for a user slug.

    The page lives at /profile/<slug> in the frontend. /user/profile/<slug> is
    the API endpoint and is not served as a page.
    """
    base = (base_url or default_base_url()).rstrip("/")
    return f"{base}/profile/{slug}"
