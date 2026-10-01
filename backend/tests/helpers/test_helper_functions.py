"""
Unit tests for helper_functions.py
"""
from datetime import datetime, timedelta, timezone

from application.utilities.helper_functions import (
    allowed_file,
    format_file_size,
    format_number,
    get_s3_client,
    safe_parse_datetime,
    utcnow_naive,
)


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


def test_get_s3_client_region_defaults_to_config(monkeypatch):
    from unittest.mock import patch

    from application.config import Config

    monkeypatch.delenv("AWS_REGION", raising=False)
    with patch("boto3.client") as mock_client:
        get_s3_client()
    assert mock_client.call_args.kwargs["region_name"] == Config.AWS_REGION

    monkeypatch.setenv("AWS_REGION", "us-east-1")
    with patch("boto3.client") as mock_client:
        get_s3_client()
    assert mock_client.call_args.kwargs["region_name"] == "us-east-1"


def test_utcnow_naive_is_naive_utc():
    before = datetime.now(timezone.utc).replace(tzinfo=None)
    now = utcnow_naive()
    after = datetime.now(timezone.utc).replace(tzinfo=None)

    assert now.tzinfo is None
    assert before <= now <= after
    # Same clock as the deprecated utcnow() it replaces, so stored rows stay comparable
    assert abs(now - datetime.utcnow()) < timedelta(seconds=5)
