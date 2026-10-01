"""
File: helper_functions.py
Type: py
Summary: General utility helpers for file uploads and formatting.
"""


def allowed_file(filename, allowed_extensions=None):
    if allowed_extensions is None:
        from application.config import Config

        allowed_extensions = Config.ALLOWED_EXTENSIONS

    return "." in filename and filename.rsplit(".", 1)[1].lower() in allowed_extensions


def get_s3_client():
    import os

    import boto3

    try:
        kwargs = {"region_name": os.environ.get("AWS_REGION", "ap-southeast-1")}
        if os.environ.get("AWS_ACCESS_KEY_ID") and os.environ.get(
            "AWS_SECRET_ACCESS_KEY"
        ):
            kwargs["aws_access_key_id"] = os.environ.get("AWS_ACCESS_KEY_ID")
            kwargs["aws_secret_access_key"] = os.environ.get("AWS_SECRET_ACCESS_KEY")

        return boto3.client("s3", **kwargs)
    except Exception:
        import traceback

        traceback.print_exc()
        return None


def format_file_size(size_bytes):
    """Format file size in human-readable format"""
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if size_bytes < 1024.0:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.2f} PB"


def format_number(value, precision=0):
    """Format a number with thousand separators and optional precision."""
    try:
        if value is None:
            return "0"
        if precision > 0:
            return f"{float(value):,.{precision}f}"
        return f"{int(float(value)):,}"
    except (ValueError, TypeError):
        return str(value)


def safe_parse_datetime(val):
    """
    Robustly parse a datetime value that might be a string or already a datetime object.
    Fixes TypeError: fromisoformat: argument must be str
    """
    from datetime import datetime

    if val is None:
        return None
    if isinstance(val, datetime):
        return val
    if isinstance(val, str):
        try:
            return datetime.fromisoformat(val.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            return None
    return None
