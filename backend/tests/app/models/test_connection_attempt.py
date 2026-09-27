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

        for i in range(5):
            ConnectionAttempt.log_attempt(user.id, f"CODE{i}", success=False)

        allowed, msg = ConnectionAttempt.check_rate_limits(user.id)
        assert allowed is False
        assert "15 minutes" in msg
