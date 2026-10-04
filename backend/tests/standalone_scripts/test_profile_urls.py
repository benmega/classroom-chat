"""Tests for the shared profile link builder used by the QR code and card scripts."""

from tools.profile_urls import DEFAULT_PROFILE_BASE_URL, build_profile_url, default_base_url


def test_default_base_url_is_production_site():
    assert default_base_url() == "https://blossom.benmega.com"
    assert DEFAULT_PROFILE_BASE_URL == "https://blossom.benmega.com"


def test_default_base_url_can_be_overridden_by_env(monkeypatch):
    monkeypatch.setenv("PROFILE_BASE_URL", "https://staging.example.test")
    assert default_base_url() == "https://staging.example.test"


def test_empty_env_falls_back_to_default(monkeypatch):
    monkeypatch.setenv("PROFILE_BASE_URL", "")
    assert default_base_url() == DEFAULT_PROFILE_BASE_URL


def test_profile_url_points_at_the_spa_page_not_the_api():
    url = build_profile_url("jane-doe")
    assert url == "https://blossom.benmega.com/profile/jane-doe"
    assert "/user/profile/" not in url


def test_profile_url_strips_trailing_slash_from_base():
    assert build_profile_url("jane", "https://example.test/") == "https://example.test/profile/jane"


def test_explicit_base_url_beats_env(monkeypatch):
    monkeypatch.setenv("PROFILE_BASE_URL", "https://env.example.test")
    assert build_profile_url("jane", "https://arg.example.test") == "https://arg.example.test/profile/jane"
    assert build_profile_url("jane") == "https://env.example.test/profile/jane"
