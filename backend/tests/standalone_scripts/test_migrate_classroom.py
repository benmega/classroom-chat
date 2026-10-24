"""Tests for backend/tools/migrate_classroom.py, which is retired and must do nothing."""

import runpy

import pytest
from application.extensions import db
from application.models.user import User
from sqlalchemy.engine import Engine
from tests.factories import ChallengeLogFactory, ClassroomFactory, UserFactory
from tools import migrate_classroom


@pytest.fixture
def opened_connections(monkeypatch):
    """Record every database connection opened from here on."""
    connections = []
    real_connect = Engine.connect

    def spy_connect(self, *args, **kwargs):
        conn = real_connect(self, *args, **kwargs)
        connections.append(conn)
        return conn

    # Release the fixture session's connection first, so only new work is recorded
    db.session.commit()
    db.session.remove()
    monkeypatch.setattr(Engine, "connect", spy_connect)
    return connections


def test_run_opens_no_database_connection(opened_connections):
    migrate_classroom.run()

    assert opened_connections == []


def test_running_the_file_as_a_script_succeeds(opened_connections):
    """`python -m tools.migrate_classroom` must keep working until the file is deleted."""
    runpy.run_path(migrate_classroom.__file__, run_name="__main__")

    assert opened_connections == []


def test_run_leaves_enrolments_and_roles_alone():
    """A student removed from a class stays removed, whatever their challenge logs say."""
    classroom = ClassroomFactory()
    student = UserFactory()
    student_id = student.id
    ChallengeLogFactory(user_id=student_id, course_instance=classroom.id)

    migrate_classroom.run()

    db.session.expire_all()
    student = db.session.get(User, student_id)
    assert student.classrooms == []
    assert student.role == "student"
