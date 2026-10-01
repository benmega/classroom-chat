"""
File: test_classroom.py
Type: py
Summary: Unit tests for Classroom model methods.
"""

import sqlalchemy as sa
from application.extensions import db
from application.models.classroom import Classroom, user_classrooms
from tests.factories import ClassroomFactory, UserFactory


def test_classroom_methods(app):
    with app.app_context():
        clsroom = ClassroomFactory(
            id="test-room-123",
            name="Test Classroom",
            language="Python",
        )

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


def _enroll(user, classroom):
    db.session.execute(
        sa.insert(user_classrooms).values(user_id=user.id, classroom_id=classroom.id)
    )
    db.session.commit()


def test_student_count_counts_enrolments_without_loading_the_roster(init_db):
    classroom = ClassroomFactory()
    for _ in range(3):
        _enroll(UserFactory(), classroom)
    db.session.expire_all()

    assert classroom.to_dict()["student_count"] == 3
    assert "users" in sa.inspect(classroom).unloaded


def test_student_count_follows_a_roster_that_is_already_loaded(init_db):
    classroom = ClassroomFactory()
    classroom.users.append(UserFactory())
    classroom.users.append(UserFactory())

    # Not flushed yet: the in-memory roster is what is counted
    assert classroom.to_dict()["student_count"] == 2


def test_student_count_sees_an_enrolment_made_from_the_student_side(init_db):
    classroom = ClassroomFactory()
    student = UserFactory()
    student.classrooms.append(classroom)
    db.session.commit()

    assert classroom.to_dict()["student_count"] == 1


def test_to_dicts_matches_to_dict_for_every_classroom(init_db):
    empty = ClassroomFactory(name="Empty")
    small = ClassroomFactory(name="Small")
    large = ClassroomFactory(name="Large")
    _enroll(UserFactory(), small)
    for _ in range(4):
        _enroll(UserFactory(), large)
    classrooms = [large, empty, small]

    batch = Classroom.to_dicts(classrooms)

    assert batch == [c.to_dict() for c in classrooms]
    assert [d["student_count"] for d in batch] == [4, 0, 1]


def test_to_dicts_counts_in_one_statement(init_db, count_queries):
    classrooms = [ClassroomFactory() for _ in range(5)]
    for classroom in classrooms:
        _enroll(UserFactory(), classroom)
    db.session.expire_all()
    # load the rows first so only the counting is measured
    classrooms = Classroom.query.all()

    with count_queries() as statements:
        Classroom.to_dicts(classrooms)

    assert len(statements) == 1


def test_to_dicts_of_nothing(init_db):
    assert Classroom.to_dicts([]) == []


def test_to_dict_uses_a_count_it_is_given(init_db):
    classroom = ClassroomFactory()

    assert classroom.to_dict(student_count=42)["student_count"] == 42
