"""
File: test_user_certificate.py
Type: py
Summary: Unit tests for UserCertificate model methods and properties.
"""

from datetime import datetime

from application.extensions import db
from application.models.achievements import Achievement
from application.models.user import User
from application.models.user_certificate import UserCertificate


def test_user_certificate_to_dict_and_attributes(app):
    with app.app_context():
        user = User(
            username="cert_test_user",
            nickname="Cert User",
            email="certuser@example.com",
            role="student",
        )
        user.set_password("Password123!")
        db.session.add(user)
        db.session.flush()

        ach = Achievement(
            slug="cert-test-ach",
            name="Cert Test Achievement",
            type="certificate",
            description="Test achievement",
        )
        db.session.add(ach)
        db.session.flush()

        cert = UserCertificate(
            user_id=user.id,
            achievement_id=ach.id,
            url="https://example.com/cert.pdf",
            file_path="/uploads/cert.pdf",
            reviewed=True,
            reviewed_at=datetime.utcnow(),
            is_auto_recommended=True,
            recommendation_reason="Matched title",
        )
        db.session.add(cert)
        db.session.commit()

        d = cert.to_dict()
        assert d["id"] == cert.id
        assert d["user_id"] == user.id
        assert d["user"]["username"] == "cert_test_user"
        assert d["user"]["nickname"] == "Cert User"
        assert d["achievement"]["name"] == "Cert Test Achievement"
        assert d["url"] == "https://example.com/cert.pdf"
        assert d["file_path"] == "/uploads/cert.pdf"
        assert d["reviewed"] is True
        assert d["reviewed_at"] is not None
        assert d["is_auto_recommended"] is True
        assert d["recommendation_reason"] == "Matched title"
