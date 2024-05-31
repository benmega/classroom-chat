

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
        print(f"Database error during commit: {e}")  # Optionally log the exception
        return False