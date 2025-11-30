"""
File: helper_functions.py
Type: py
Summary: General utility helpers for file uploads and database commits.
"""

from application.config import Config


def request_database_commit():
    from application import db
    """
    Attempts to commit changes to the database session.

    Returns:
    bool: True if the commit was successful, False if an exception occurred.
    """
    try:
        db.session.commit()
        return True
    except Exception as e:
        db.session.rollback()
        print(f"Database error during commit: {e}")
        return False

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in Config.ALLOWED_EXTENSIONS
