"""
Unit tests for helper_functions.py
"""
from datetime import datetime

from application.extensions import db
from application.models.user import User
from application.utilities.helper_functions import (
    allowed_file,
    cleanup_missing_user_pfps,
    format_file_size,
    format_number,
    get_s3_client,
    request_database_commit,
    safe_parse_datetime,
)


def test_request_database_commit_success(app):
    with app.app_context():
        u = User(username="commit_user_test")
        u.set_password("pass123")
        db.session.add(u)
        res = request_database_commit()
        assert res is True


def test_allowed_file():
    assert allowed_file("test.png", {"png", "jpg"}) is True
    assert allowed_file("test.exe", {"png", "jpg"}) is False
    assert allowed_file("noextension", {"png"}) is False


def test_get_s3_client(monkeypatch):
    monkeypatch.setenv("AWS_REGION", "us-east-1")
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "fake_id")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "fake_key")
    client = get_s3_client()
    assert client is not None


def test_format_file_size():
    assert format_file_size(500) == "500.00 B"
    assert format_file_size(1024) == "1.00 KB"
    assert format_file_size(1048576) == "1.00 MB"


def test_format_number():
    assert format_number(None) == "0"
    assert format_number(1234567) == "1,234,567"
    assert format_number(1234.5678, precision=2) == "1,234.57"
    assert format_number("invalid") == "invalid"


def test_safe_parse_datetime():
    dt_now = datetime.now()
    assert safe_parse_datetime(None) is None
    assert safe_parse_datetime(dt_now) == dt_now
    parsed = safe_parse_datetime("2026-08-01T12:00:00Z")
    assert parsed is not None
    assert parsed.year == 2026
    assert safe_parse_datetime("not-a-date") is None


def test_cleanup_missing_user_pfps(app, tmp_path, monkeypatch):
    with app.app_context():
        u1 = User(username="pfp_user_1_test", profile_picture="nonexistent.png")
        u1.set_password("pass123")
        u2 = User(username="pfp_user_2_test", profile_picture="Default_pfp.jpg")
        u2.set_password("pass123")
        db.session.add_all([u1, u2])
        db.session.commit()

        # Monkeypatch Config.UPLOAD_FOLDER to tmp_path
        from application.config import Config
        monkeypatch.setattr(Config, "UPLOAD_FOLDER", str(tmp_path))

        fixed = cleanup_missing_user_pfps()
        assert fixed >= 1
        assert u1.profile_picture == "Default_pfp.jpg"
