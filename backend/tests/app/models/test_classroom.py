"""
File: test_classroom.py
Type: py
Summary: Unit tests for Classroom model methods.
"""

from application.extensions import db
from application.models.classroom import Classroom


def test_classroom_methods(app):
    with app.app_context():
        clsroom = Classroom(
            id="test-room-123",
            name="Test Classroom",
            language="Python",
        )
        db.session.add(clsroom)
        db.session.commit()

        assert repr(clsroom) == "<Classroom(id=test-room-123, name=Test Classroom)>"

        code = clsroom.get_join_code()
        assert len(code) == 5
        assert clsroom.join_code == code

        # Calling again returns cached join_code
        assert clsroom.get_join_code() == code

        d = clsroom.to_dict()
        assert d["id"] == "test-room-123"
        assert d["name"] == "Test Classroom"
        assert d["language"] == "Python"
        assert d["student_count"] == 0
