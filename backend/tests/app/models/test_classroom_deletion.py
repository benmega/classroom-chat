"""
File: test_classroom_deletion.py
Type: py
Summary: Deleting a classroom deletes its course instances and leaves no row that
         still points at it, on every path an admin can delete a classroom through.
"""

import pytest
from application.extensions import db
from application.models.challenge import Challenge
from application.models.classroom import Classroom
from application.models.course_instance import CourseInstance
from application.models.message import Message
from application.models.submission import Submission
from application.models.user import User
from sqlalchemy import func, select
from tests.factories import (
    AdminFactory,
    ChallengeFactory,
    ClassroomFactory,
    CourseFactory,
    CourseInstanceFactory,
    UserFactory,
)


def _classroom_references():
    """Every column with a foreign key to classrooms.id, as (label, table, column)."""
    return sorted(
        (f"{table.name}.{fk.parent.name}", table, fk.parent)
        for table in db.metadata.tables.values()
        for fk in table.foreign_keys
        if fk.column.table.name == "classrooms"
    )


def _rows_pointing_at(classroom_id):
    """{table.column: number of rows whose foreign key holds classroom_id}, zeros left out."""
    counts = {}
    for label, table, column in _classroom_references():
        count = db.session.scalar(
            select(func.count()).select_from(table).where(column == classroom_id)
        )
        if count:
            counts[label] = count
    return counts


def _fill(classroom, student, course):
    """One row in every table a classroom's id can appear in (two course instances)."""
    for _ in range(2):
        CourseInstanceFactory(classroom_id=classroom.id, course_id=course.id)
    challenge = ChallengeFactory(classroom_id=classroom.id, course_id=course.id)
    message = Message(user_id=student.id, content="to the class")
    submission = Submission(
        user_id=student.id,
        classroom_id=classroom.id,
        original_filename="work.pdf",
        stored_path=f"submissions/{classroom.id}.pdf",
        file_size=1,
    )
    db.session.add_all([message, submission])
    message.target_classrooms.append(classroom)
    classroom.users.append(student)
    db.session.commit()
    return {"challenge": challenge.id, "message": message.id, "submission": submission.id}


@pytest.fixture
def world(init_db):
    """A classroom with a row behind every foreign key to classrooms.id, and a
    second classroom with the same rows that must not be touched."""
    student = UserFactory()
    course = CourseFactory()
    classroom, bystander = ClassroomFactory(), ClassroomFactory()
    rows = _fill(classroom, student, course)
    _fill(bystander, student, course)
    return {
        "classroom": classroom.id,
        "bystander": bystander.id,
        "student": student.id,
        "admin": AdminFactory().id,
        **rows,
    }


def _assert_deleted_cleanly(world, bystander_rows):
    db.session.expire_all()
    classroom_id = world["classroom"]
    assert db.session.get(Classroom, classroom_id) is None
    assert _rows_pointing_at(classroom_id) == {}

    # Its course instances went with it
    assert CourseInstance.query.filter_by(classroom_id=classroom_id).count() == 0
    assert CourseInstance.query.count() == 2
    # What only referred to it stays, without the reference
    assert db.session.get(Challenge, world["challenge"]).classroom_id is None
    assert db.session.get(Submission, world["submission"]).classroom_id is None
    assert db.session.get(Message, world["message"]) is not None
    student = db.session.get(User, world["student"])
    assert [c.id for c in student.classrooms] == [world["bystander"]]

    # The other classroom has everything it had
    assert db.session.get(Classroom, world["bystander"]) is not None
    assert _rows_pointing_at(world["bystander"]) == bystander_rows


def test_the_world_has_a_row_for_every_reference_to_a_classroom(world):
    """A new foreign key to classrooms.id must be given a row in the world above,
    or the tests below say nothing about it."""
    assert set(_rows_pointing_at(world["classroom"])) == {
        label for label, _table, _column in _classroom_references()
    }
    assert _rows_pointing_at(world["classroom"])["course_instances.classroom_id"] == 2


def test_deleting_a_classroom_deletes_its_course_instances(world):
    bystander_rows = _rows_pointing_at(world["bystander"])

    db.session.delete(db.session.get(Classroom, world["classroom"]))
    db.session.commit()

    _assert_deleted_cleanly(world, bystander_rows)


@pytest.mark.parametrize(
    "url", ["/api/admin/classrooms/{id}", "/api/admin/crud/classroom/{id}"]
)
def test_every_admin_delete_path_removes_a_classroom_with_course_instances(
    client, world, url
):
    bystander_rows = _rows_pointing_at(world["bystander"])
    with client.session_transaction() as sess:
        sess["_user_id"] = str(world["admin"])
        sess["_fresh"] = True
        sess["user"] = world["admin"]

    response = client.delete(url.format(id=world["classroom"]))

    assert response.status_code == 200, response.get_data(as_text=True)
    _assert_deleted_cleanly(world, bystander_rows)


def test_a_course_instance_taken_out_of_its_classroom_is_deleted(world):
    classroom = db.session.get(Classroom, world["classroom"])
    instance = classroom.course_assignments[0]
    instance_id = instance.id

    classroom.course_assignments.remove(instance)
    db.session.commit()

    assert db.session.get(CourseInstance, instance_id) is None
    assert len(db.session.get(Classroom, world["classroom"]).course_assignments) == 1
