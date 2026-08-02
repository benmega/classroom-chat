"""
File: test_connection_attempt.py
Type: py
Summary: Unit tests for ConnectionAttempt model rate limit branches.
"""

from application.extensions import db
from application.models.connection_attempt import ConnectionAttempt
from application.models.user import User


def test_connection_attempt_rate_limits(app):
    with app.app_context():
        user = User(
            username="conn_user",
            nickname="Conn User",
            email="connuser@example.com",
            role="parent",
        )
        user.set_password("Password123!")
        db.session.add(user)
        db.session.commit()

        # Log 5 attempts
        for i in range(5):
            ConnectionAttempt.log_attempt(user.id, f"CODE{i}", success=False)

        allowed, msg = ConnectionAttempt.check_rate_limits(user.id)
        assert allowed is False
        assert "15 minutes" in msg
