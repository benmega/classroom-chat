"""
File: test_user_deletion.py
Type: py
Summary: Deleting a user leaves no row that still points at it, on every path an
         admin can delete a user through.
"""

import pytest
from application.extensions import db
from application.models.achievements import UserAchievement
from application.models.challenge_log import ChallengeLog
from application.models.classroom_join_attempt import ClassroomJoinAttempt
from application.models.connection_attempt import ConnectionAttempt
from application.models.course_instance_request import CourseInstanceRequest
from application.models.duck_trade import DuckTradeLog
from application.models.duck_transaction import DuckTransaction
from application.models.message import Message
from application.models.note import Note
from application.models.parent_message import ParentMessage
from application.models.project import Project
from application.models.session_log import SessionLog
from application.models.skill import Skill
from application.models.store_item import StoreItem
from application.models.submission import Submission
from application.models.user import User
from application.models.user_certificate import UserCertificate
from application.models.user_item_purchase import UserItemPurchase
from sqlalchemy import func, select
from tests.factories import (
    AchievementFactory,
    AdminFactory,
    ClassroomFactory,
    ParentFactory,
    UserFactory,
)


def _user_references():
    """Every column with a foreign key to users.id, as (label, table, column)."""
    return sorted(
        (f"{table.name}.{fk.parent.name}", table, fk.parent)
        for table in db.metadata.tables.values()
        for fk in table.foreign_keys
        if fk.column.table.name == "users"
    )


def _rows_pointing_at(user_id):
    """{table.column: number of rows whose foreign key holds user_id}, zeros left out."""
    counts = {}
    for label, table, column in _user_references():
        count = db.session.scalar(
            select(func.count()).select_from(table).where(column == user_id)
        )
        if count:
            counts[label] = count
    return counts


def _give_everything_a_student_has(student, classroom, achievement, item):
    """One row in every table a student's id can appear in."""
    message = Message(user_id=student.id, content="hello")
    db.session.add(message)
    message.target_classrooms.append(classroom)
    db.session.add_all(
        [
            ChallengeLog(user_id=student.id, domain="codecombat.com", challenge_slug="a"),
            ChallengeLog(
                user_id=student.id,
                domain="codecombat.com",
                challenge_slug="a",
                course_instance="instance-1",
            ),
            ClassroomJoinAttempt(student_id=student.id, code_attempted="ABCDE"),
            CourseInstanceRequest(
                student_id=student.id, course_instance_id="instance-9", url="https://x"
            ),
            DuckTradeLog(
                user_id=student.id, digital_ducks=1, bit_ducks=[], byte_ducks=[]
            ),
            DuckTransaction(user_id=student.id, amount=1.0, reason="test"),
            Note(user_id=student.id, filename="note.png"),
            Project(user_id=student.id, name="project"),
            SessionLog(user_id=student.id),
            Skill(user_id=student.id, name="python"),
            Submission(
                user_id=student.id,
                classroom_id=classroom.id,
                original_filename="work.pdf",
                stored_path=f"submissions/{student.id}.pdf",
                file_size=1,
            ),
            UserAchievement(user_id=student.id, achievement_id=achievement.id),
            UserCertificate(
                user_id=student.id, achievement_id=achievement.id, url="https://x"
            ),
            UserItemPurchase(user_id=student.id, item_id=item.id, times_purchased=1),
        ]
    )
    classroom.users.append(student)
    db.session.commit()


@pytest.fixture
def world(init_db):
    """A student, a parent and an admin with a row in every table that refers to a
    user, next to a bystander of each role with the same rows."""
    classroom = ClassroomFactory()
    achievement = AchievementFactory()
    item = StoreItem(name="deletion test item", description="d", base_price=1.0)
    db.session.add(item)
    db.session.commit()

    admin, other_admin = AdminFactory(), AdminFactory(_username="other_admin")
    students = [UserFactory(), UserFactory()]
    parents = [ParentFactory(), ParentFactory()]
    for student in students:
        _give_everything_a_student_has(student, classroom, achievement, item)
    for parent, student, resolver in zip(
        parents, students, (admin, other_admin), strict=True
    ):
        parent.children.append(student)
        # A message from the admin to this student and this parent
        note = Message(user_id=resolver.id, content="note")
        db.session.add_all(
            [
                note,
                ConnectionAttempt(parent_id=parent.id, code_attempted="ABC123"),
                ParentMessage(
                    parent_id=parent.id,
                    body="question",
                    status="resolved",
                    resolved_by_id=resolver.id,
                ),
            ]
        )
        note.target_users.extend([student, parent])
    db.session.commit()

    return {
        "student": students[0].id,
        "parent": parents[0].id,
        "admin": admin.id,
        "bystanders": [students[1].id, parents[1].id, other_admin.id],
    }


def _delete(user_id):
    db.session.delete(db.session.get(User, user_id))
    db.session.commit()
    db.session.expire_all()


def test_the_world_has_a_row_for_every_reference_to_a_user(world):
    """A new foreign key to users.id must be given a row in the world above, or
    the tests below say nothing about it."""
    referenced = set()
    for user_id in (world["student"], world["parent"], world["admin"]):
        referenced |= set(_rows_pointing_at(user_id))

    assert referenced == {label for label, _table, _column in _user_references()}


@pytest.mark.parametrize("who", ["student", "parent", "admin"])
def test_deleting_a_user_leaves_no_row_pointing_at_it(world, who):
    user_id = world[who]
    assert _rows_pointing_at(user_id)
    bystanders = {i: _rows_pointing_at(i) for i in world["bystanders"]}
    assert all(bystanders.values())

    _delete(user_id)

    assert db.session.get(User, user_id) is None
    assert _rows_pointing_at(user_id) == {}
    # The rows of the unrelated student, parent and admin are all still there
    assert {i: _rows_pointing_at(i) for i in bystanders} == bystanders


def test_deleting_a_student_deletes_what_belonged_to_it(world):
    student_id = world["student"]
    kept_messages = Message.query.filter(Message.user_id != student_id).count()

    _delete(student_id)

    for model, column in (
        (ChallengeLog, ChallengeLog.user_id),
        (CourseInstanceRequest, CourseInstanceRequest.student_id),
        (DuckTradeLog, DuckTradeLog.user_id),
        (Submission, Submission.user_id),
    ):
        # The bystander's rows are all that is left
        assert db.session.scalars(select(column).select_from(model)).all() == [
            world["bystanders"][0]
        ] * (2 if model is ChallengeLog else 1)
    # Messages other people wrote stay, also the one that was addressed to the student
    assert Message.query.count() == kept_messages
    # The parent stays, without the child
    parent = db.session.get(User, world["parent"])
    assert parent is not None
    assert parent.children == []


def test_deleting_a_parent_deletes_its_messages_to_the_teacher(world):
    parent_id = world["parent"]
    assert ParentMessage.query.filter_by(parent_id=parent_id).count() == 1

    _delete(parent_id)

    assert ParentMessage.query.filter_by(parent_id=parent_id).count() == 0
    assert ParentMessage.query.count() == 1
    assert ConnectionAttempt.query.filter_by(parent_id=parent_id).count() == 0
    student = db.session.get(User, world["student"])
    assert student is not None
    assert student.parents == []


def test_deleting_the_admin_who_resolved_a_parent_message_keeps_the_message(world):
    message = ParentMessage.query.filter_by(resolved_by_id=world["admin"]).one()
    message_id = message.id

    _delete(world["admin"])

    message = db.session.get(ParentMessage, message_id)
    assert message.resolved_by_id is None
    assert message.status == "resolved"
    assert message.to_dict()["resolved_by"] is None
    assert ParentMessage.query.count() == 2


def test_a_new_user_does_not_inherit_the_rows_of_a_deleted_one(world):
    """SQLite hands the highest id out again once its row is gone."""
    newest = UserFactory()
    newest_id = newest.id
    _give_everything_a_student_has(
        newest,
        ClassroomFactory(),
        AchievementFactory(),
        StoreItem.query.first(),
    )
    _delete(newest_id)

    successor = UserFactory()

    assert successor.id == newest_id
    assert _rows_pointing_at(successor.id) == {}
    assert successor.challenge_logs.count() == 0


def _admin_session(client, admin_id):
    with client.session_transaction() as sess:
        sess["_user_id"] = str(admin_id)
        sess["_fresh"] = True
        sess["user"] = admin_id


@pytest.mark.parametrize(
    "path",
    ["reject_user", "remove_user", "crud"],
)
@pytest.mark.parametrize("who", ["student", "parent"])
def test_every_admin_delete_path_leaves_no_row_behind(client, world, path, who):
    user_id = world[who]
    username = db.session.get(User, user_id).username
    _admin_session(client, world["admin"])

    if path == "reject_user":
        response = client.post(f"/api/admin/reject_user/{user_id}")
    elif path == "remove_user":
        response = client.post("/api/admin/remove_user", data={"username": username})
    else:
        response = client.delete(f"/api/admin/crud/user/{user_id}")

    assert response.status_code == 200, response.get_data(as_text=True)
    db.session.expire_all()
    assert db.session.get(User, user_id) is None
    assert _rows_pointing_at(user_id) == {}
