"""
File: test_bounded_queries.py
Summary: Behaviour of the routes that were reworked so their queries stay bounded:
         the feed limit and unread count, the chat context, the admin dashboard,
         log tail, extended stats, certificate and project review lists, and the
         per-user listings that no longer load every User.
"""

import sys
from datetime import datetime, timedelta
from unittest.mock import MagicMock

import pytest
import sqlalchemy as sa
from application.extensions import db
from application.models.classroom import Classroom, user_classrooms
from application.models.course_instance_request import CourseInstanceRequest
from application.models.duck_trade import DuckTradeLog
from application.models.duck_transaction import DuckTransaction
from application.models.project import Project
from application.models.user_certificate import UserCertificate
from application.routes.admin import advanced_ops
from tests.factories import (
    AchievementFactory,
    ClassroomFactory,
    MessageFactory,
    ParentFactory,
    UserFactory,
)


def log_in(client, user):
    with client.session_transaction() as sess:
        sess["user"] = user.id


def enroll(user, classroom):
    db.session.execute(
        sa.insert(user_classrooms).values(user_id=user.id, classroom_id=classroom.id)
    )
    db.session.commit()


# --------------------------------------------------------------------------- #
# /message/api/unread-count
# --------------------------------------------------------------------------- #


@pytest.fixture
def room_with_traffic(init_db):
    """A student in a classroom with a mix of messages they can and cannot see."""
    student = UserFactory()
    other = UserFactory()
    mine = ClassroomFactory()
    theirs = ClassroomFactory()
    enroll(student, mine)
    enroll(other, theirs)

    visible, hidden = [], []
    for _ in range(6):
        visible.append(MessageFactory(user_id=other.id, is_global=True).id)
        visible.append(MessageFactory(user_id=other.id, target_classrooms=[mine]).id)
        hidden.append(MessageFactory(user_id=other.id, target_classrooms=[theirs]).id)
    removed = MessageFactory(user_id=other.id, is_global=True)
    removed.deleted_at = datetime.utcnow()
    db.session.commit()
    return student, sorted(visible)


def test_unread_count_counts_what_is_newer_than_the_marker(client, room_with_traffic):
    student, visible = room_with_traffic
    log_in(client, student)

    marker = visible[-4]  # three visible messages are newer
    response = client.get(f"/message/api/unread-count?last_read_id={marker}")

    assert response.status_code == 200
    assert response.json == {"success": True, "count": 3, "latest_id": visible[-1]}


def test_unread_count_is_zero_when_everything_is_read(client, room_with_traffic):
    student, visible = room_with_traffic
    log_in(client, student)

    response = client.get(f"/message/api/unread-count?last_read_id={visible[-1]}")

    assert response.json["count"] == 0
    assert response.json["latest_id"] == visible[-1]


def test_unread_count_without_a_marker_only_reports_the_newest_id(client, room_with_traffic):
    student, visible = room_with_traffic
    log_in(client, student)

    response = client.get("/message/api/unread-count")

    assert response.json == {"success": True, "count": 0, "latest_id": visible[-1]}


def test_unread_count_agrees_with_the_feed(client, room_with_traffic):
    student, _ = room_with_traffic
    log_in(client, student)
    feed_ids = [m["id"] for m in client.get("/message/api/feed?limit=50").json["messages"]]

    marker = feed_ids[5]
    expected = sum(1 for message_id in feed_ids if message_id > marker)

    response = client.get(f"/message/api/unread-count?last_read_id={marker}")
    assert response.json["count"] == expected
    assert response.json["latest_id"] == feed_ids[0]


def test_unread_count_looks_at_the_newest_window_only(client, init_db, sample_admin):
    for _ in range(60):
        MessageFactory(user_id=sample_admin.id, is_global=True)
    log_in(client, sample_admin)

    response = client.get("/message/api/unread-count?last_read_id=1")

    assert response.json["count"] == 50


def test_unread_count_with_no_messages(client, init_db, sample_user):
    log_in(client, sample_user)

    response = client.get("/message/api/unread-count?last_read_id=5")

    assert response.json == {"success": True, "count": 0, "latest_id": None}


def test_unread_count_ignores_a_marker_that_is_not_a_number(client, room_with_traffic):
    student, visible = room_with_traffic
    log_in(client, student)

    response = client.get("/message/api/unread-count?last_read_id=NaN")

    assert response.status_code == 200
    assert response.json["count"] == 0
    assert response.json["latest_id"] == visible[-1]


def test_unread_count_is_not_for_parents(client, init_db):
    parent = ParentFactory()
    log_in(client, parent)

    response = client.get("/message/api/unread-count")

    assert response.status_code == 403
    assert response.json["success"] is False


def test_unread_count_needs_a_login(client, init_db):
    response = client.get(
        "/message/api/unread-count", headers={"Accept": "application/json"}
    )

    assert response.status_code == 401


def test_unread_count_reports_a_failure_as_a_500(client, room_with_traffic, monkeypatch):
    student, _ = room_with_traffic
    log_in(client, student)

    def broken(*args, **kwargs):
        raise RuntimeError("database gone")

    monkeypatch.setattr("application.routes.message_routes._visible_message_ids", broken)

    response = client.get("/message/api/unread-count")

    assert response.status_code == 500
    assert response.json == {"success": False, "error": "Internal server error"}


# --------------------------------------------------------------------------- #
# /message/api/feed
# --------------------------------------------------------------------------- #


def test_feed_pages_with_before_id_in_both_roles(client, init_db, sample_admin, sample_user):
    ids = [
        MessageFactory(user_id=sample_user.id, is_global=True).id for _ in range(8)
    ]
    for who in (sample_user, sample_admin):
        log_in(client, who)
        page = client.get(f"/message/api/feed?limit=3&before_id={ids[5]}")
        assert [m["id"] for m in page.json["messages"]] == [ids[4], ids[3], ids[2]]


def test_feed_names_each_author(client, init_db, sample_admin):
    alice = UserFactory(nickname="Alice")
    bob = UserFactory(nickname="Bob")
    MessageFactory(user_id=alice.id, is_global=True)
    MessageFactory(user_id=bob.id, is_global=True)
    log_in(client, sample_admin)

    messages = client.get("/message/api/feed").json["messages"]

    assert [m["user_name"] for m in messages] == ["Bob", "Alice"]


# --------------------------------------------------------------------------- #
# /message/api/me/context
# --------------------------------------------------------------------------- #


def test_context_for_admin_lists_every_classroom_and_every_non_parent(
    client, init_db, sample_admin
):
    first = ClassroomFactory(name="Alpha")
    second = ClassroomFactory(name="Beta")
    zed = UserFactory(_username="zed", nickname="Zed")
    amy = UserFactory(_username="amy", nickname="Amy")
    ParentFactory(_username="someparent")
    log_in(client, sample_admin)

    response = client.get("/message/api/me/context")

    assert response.status_code == 200
    classrooms = response.json["classrooms"]
    assert {c["id"] for c in classrooms} >= {first.id, second.id}
    assert {"id", "name", "sandbox_active"} == set(classrooms[0])
    users = response.json["users"]
    names = [u["username"] for u in users]
    assert "someparent" not in names
    assert names.index("amy") < names.index("zed")
    assert {"id": amy.id, "username": "amy", "nickname": "Amy"} in users
    assert {"id": zed.id, "username": "zed", "nickname": "Zed"} in users


def test_context_for_a_student_lists_only_their_classrooms(client, init_db, sample_user):
    mine = ClassroomFactory(name="Mine")
    ClassroomFactory(name="Not mine")
    enroll(sample_user, mine)
    log_in(client, sample_user)

    response = client.get("/message/api/me/context")

    assert response.json["users"] == []
    assert response.json["classrooms"] == [
        {"id": mine.id, "name": "Mine", "sandbox_active": False}
    ]


@pytest.mark.parametrize("role", ["admin", "student"])
def test_context_expires_yesterdays_sandbox_and_saves_it(
    client, init_db, sample_admin, sample_user, role
):
    classroom = ClassroomFactory()
    classroom.sandbox_active = True
    classroom.sandbox_activated_at = datetime.utcnow() - timedelta(days=2)
    db.session.commit()
    classroom_id = classroom.id
    viewer = sample_admin if role == "admin" else sample_user
    enroll(sample_user, classroom)
    log_in(client, viewer)

    response = client.get("/message/api/me/context")

    reported = next(c for c in response.json["classrooms"] if c["id"] == classroom_id)
    assert reported["sandbox_active"] is False
    db.session.expire_all()
    stored = db.session.get(Classroom, classroom_id)
    assert stored.sandbox_active is False
    assert stored.sandbox_activated_at is None


# --------------------------------------------------------------------------- #
# Admin dashboard
# --------------------------------------------------------------------------- #


def dashboard(client, admin, query=""):
    log_in(client, admin)
    response = client.get(f"/api/admin/dashboard{query}")
    assert response.status_code == 200
    return response.json["data"]


def test_dashboard_no_longer_carries_the_lists_nothing_reads(client, init_db, sample_admin):
    data = dashboard(client, sample_admin)

    for key in ("users", "all_users", "classrooms", "banned_words"):
        assert key not in data
    for key in (
        "total_ducks",
        "active_users_count",
        "pending_trades_count",
        "pending_users_count",
        "ducks_earned_this_week",
        "total_users_count",
        "user_distribution",
        "top_earners",
        "config",
        "chart_data",
    ):
        assert key in data


def test_dashboard_roster_figures(client, init_db, sample_admin):
    UserFactory(is_online=True, duck_balance=10)
    UserFactory(is_online=True, duck_balance=5.5)
    UserFactory(is_online=False, duck_balance=0, is_approved=False)
    UserFactory(is_online=False, duck_balance=2, is_approved=False)
    ParentFactory(is_online=True, is_approved=False)
    sample_admin.is_online = True
    db.session.commit()

    data = dashboard(client, sample_admin)

    assert data["total_users_count"] == 6
    assert data["active_users_count"] == 4  # two students, the parent and the admin
    assert data["pending_users_count"] == 3  # unapproved non-admins
    assert data["total_ducks"] == pytest.approx(17.5)
    assert data["user_distribution"] == {
        "active_students": 2,
        "inactive_students": 2,
        "parents": 1,
        "admins": 1,
    }


def test_dashboard_with_nobody_else_around(client, init_db, sample_admin):
    data = dashboard(client, sample_admin)

    assert data["total_users_count"] == 1
    assert data["total_ducks"] == 0
    assert data["user_distribution"]["admins"] == 1
    assert data["ducks_earned_this_week"] == 0
    assert data["chart_data"]["max_history_days"] == 0


def test_dashboard_top_earners_are_the_five_richest_in_order(client, init_db, sample_admin):
    balances = [3, 40, 7, 40, 12, 1, 25]
    users = [UserFactory(duck_balance=b, nickname=f"n{i}") for i, b in enumerate(balances)]

    earners = dashboard(client, sample_admin)["top_earners"]

    assert [e["duck_balance"] for e in earners] == [40, 40, 25, 12, 7]
    # equal balances keep the older account first
    assert [e["id"] for e in earners[:2]] == [users[1].id, users[3].id]
    assert set(earners[0]) == {"id", "username", "nickname", "duck_balance"}
    assert earners[0]["nickname"] == "n1"


def test_dashboard_week_earnings_and_history(client, init_db, sample_admin, sample_user):
    now = datetime.utcnow()
    db.session.add_all(
        [
            DuckTransaction(user_id=sample_user.id, amount=4, timestamp=now - timedelta(days=1)),
            DuckTransaction(user_id=sample_user.id, amount=6, timestamp=now - timedelta(hours=2)),
            DuckTransaction(user_id=sample_user.id, amount=-3, timestamp=now - timedelta(days=1)),
            DuckTransaction(user_id=sample_user.id, amount=50, timestamp=now - timedelta(days=20)),
        ]
    )
    db.session.commit()

    data = dashboard(client, sample_admin)

    assert data["ducks_earned_this_week"] == 10
    assert data["chart_data"]["max_history_days"] == 21
    assert sum(data["chart_data"]["earned"]) == 10
    assert sum(data["chart_data"]["spent"]) == 3


def test_dashboard_counts_pending_trades(client, init_db, sample_admin, sample_user):
    for status in ("pending", "pending", "approved"):
        db.session.add(
            DuckTradeLog(
                user_id=sample_user.id,
                digital_ducks=1,
                bit_ducks=[0] * 7,
                byte_ducks=[0] * 7,
                status=status,
            )
        )
    db.session.commit()

    assert dashboard(client, sample_admin)["pending_trades_count"] == 2


@pytest.mark.parametrize(
    "days, labels",
    [("7", 7), ("30", 30), ("365", 365), ("100000", 365), ("0", 1), ("-4", 1), ("many", 7)],
)
def test_dashboard_chart_range_is_bounded(client, init_db, sample_admin, days, labels):
    data = dashboard(client, sample_admin, f"?days={days}")

    assert len(data["chart_data"]["labels"]) == labels


def test_dashboard_all_time_follows_the_history(client, init_db, sample_admin, sample_user):
    db.session.add(
        DuckTransaction(
            user_id=sample_user.id, amount=1, timestamp=datetime.utcnow() - timedelta(days=12)
        )
    )
    db.session.commit()

    data = dashboard(client, sample_admin, "?days=all")

    assert len(data["chart_data"]["labels"]) == 13


# --------------------------------------------------------------------------- #
# Log tail
# --------------------------------------------------------------------------- #


@pytest.fixture
def log_dir(test_app, tmp_path, monkeypatch):
    monkeypatch.setitem(test_app.config, "INSTANCE_FOLDER", str(tmp_path))
    return tmp_path


def test_logs_return_only_the_last_500_lines(client, sample_admin, log_dir):
    (log_dir / "app.log").write_text(
        "".join(f"line {i}\n" for i in range(1, 2001)), encoding="utf-8"
    )
    log_in(client, sample_admin)

    logs = client.get("/api/admin/logs").json["data"]["logs"]

    lines = logs.splitlines()
    assert len(lines) == 500
    assert lines[0] == "line 1501"
    assert lines[-1] == "line 2000"
    assert logs.endswith("\n")


def test_logs_shorter_than_the_tail_come_back_whole(client, sample_admin, log_dir):
    (log_dir / "app.log").write_text("first\nsecond", encoding="utf-8")
    log_in(client, sample_admin)

    assert client.get("/api/admin/logs").json["data"]["logs"] == "first\nsecond"


def test_logs_survive_bytes_that_are_not_text(client, sample_admin, log_dir):
    (log_dir / "app.log").write_bytes(b"fine line\n\xff\xfe broken \x80 line\nlast\n")
    log_in(client, sample_admin)

    response = client.get("/api/admin/logs")

    assert response.status_code == 200
    logs = response.json["data"]["logs"]
    assert "fine line" in logs
    assert logs.endswith("last\n")


def test_logs_without_a_file(client, sample_admin, log_dir):
    log_in(client, sample_admin)

    assert client.get("/api/admin/logs").json["data"]["logs"] == "Log file not found."


# --------------------------------------------------------------------------- #
# Extended stats
# --------------------------------------------------------------------------- #


@pytest.fixture
def fake_psutil(monkeypatch):
    psutil = MagicMock()
    psutil.Process.return_value.memory_info.return_value.rss = 100 * 1024 * 1024
    psutil.Process.return_value.cpu_percent.return_value = 12.5
    psutil.Process.return_value.create_time.return_value = 1000.0
    monkeypatch.setitem(sys.modules, "psutil", psutil)
    monkeypatch.setattr(advanced_ops, "_cpu_process", None)
    monkeypatch.setattr(
        advanced_ops, "_table_counts_cache", {"at": None, "counts": None}
    )
    return psutil


def test_extended_stats_do_not_block_on_the_cpu_sample(client, sample_admin, fake_psutil):
    log_in(client, sample_admin)

    data = client.get("/api/admin/advanced/stats-extended").json["data"]

    assert data["cpu_percent"] == 12.5
    assert data["memory_usage_mb"] == 100.0
    fake_psutil.Process.return_value.cpu_percent.assert_called_once_with(interval=None)


def test_extended_stats_keep_one_process_so_the_cpu_reading_means_something(
    client, sample_admin, fake_psutil
):
    log_in(client, sample_admin)

    client.get("/api/admin/advanced/stats-extended")
    client.get("/api/admin/advanced/stats-extended")

    assert fake_psutil.Process.call_count == 1
    assert fake_psutil.Process.return_value.cpu_percent.call_count == 2


def test_extended_stats_count_every_table_and_reuse_the_counts(
    client, sample_admin, fake_psutil, count_queries
):
    UserFactory()
    log_in(client, sample_admin)

    first = client.get("/api/admin/advanced/stats-extended").json["data"]["table_counts"]
    assert first["User"] == 2
    assert first["Message"] == 0
    assert {"Classroom", "Project", "DuckTransaction"} <= set(first)

    MessageFactory(user_id=sample_admin.id)
    with count_queries() as statements:
        second = client.get("/api/admin/advanced/stats-extended").json["data"]["table_counts"]

    # Within the window the counts are served as they were, without touching the tables
    assert second == first
    assert not any("count(" in s.lower() for s in statements)


def test_extended_stats_count_again_once_the_window_is_over(
    client, sample_admin, fake_psutil, monkeypatch
):
    log_in(client, sample_admin)
    client.get("/api/admin/advanced/stats-extended")
    MessageFactory(user_id=sample_admin.id)

    monkeypatch.setattr(advanced_ops, "TABLE_COUNTS_TTL_SECONDS", 0)
    counts = client.get("/api/admin/advanced/stats-extended").json["data"]["table_counts"]

    assert counts["Message"] == 1


def test_purging_history_does_not_leave_stale_message_counts(
    client, sample_admin, fake_psutil
):
    MessageFactory(user_id=sample_admin.id)
    log_in(client, sample_admin)
    assert client.get("/api/admin/advanced/stats-extended").json["data"]["table_counts"]["Message"] == 1

    assert client.post("/api/admin/advanced/purge-history").status_code == 200

    assert client.get("/api/admin/advanced/stats-extended").json["data"]["table_counts"]["Message"] == 0


# --------------------------------------------------------------------------- #
# Admin lists
# --------------------------------------------------------------------------- #


def test_certificate_review_list_is_oldest_first_and_pending_only(
    client, init_db, sample_admin
):
    base = datetime.utcnow()
    submitted = []
    for offset, status in ((3, "pending"), (1, "pending"), (2, "approved"), (5, "pending")):
        achievement = AchievementFactory(type="certificate")
        student = UserFactory()
        cert = UserCertificate(
            user_id=student.id,
            achievement_id=achievement.id,
            url="https://example.com/c",
            status=status,
            submitted_at=base - timedelta(hours=offset),
        )
        db.session.add(cert)
        db.session.commit()
        submitted.append((offset, status, cert.id, student._username, achievement.name))
    log_in(client, sample_admin)

    certificates = client.get("/api/achievements/admin/certificates").json["data"]["certificates"]

    pending = sorted((s for s in submitted if s[1] == "pending"), reverse=True)
    assert [c["id"] for c in certificates] == [s[2] for s in pending]
    assert [c["user"]["username"] for c in certificates] == [s[3] for s in pending]
    assert [c["achievement"]["name"] for c in certificates] == [s[4] for s in pending]


def seed_projects(statuses):
    ids = []
    for status in statuses:
        student = UserFactory(nickname=f"owner of {len(ids)}")
        project = Project(name=f"p{len(ids)}", user_id=student.id, status=status)
        db.session.add(project)
        db.session.commit()
        ids.append(project.id)
    return ids


def projects_of(client, query):
    response = client.get(f"/api/admin/manage-projects{query}")
    assert response.status_code == 200
    return response.json["data"]


def test_project_review_defaults_to_the_whole_pending_queue(client, sample_admin):
    ids = seed_projects(["pending"] * 130 + ["approved"] * 3)
    log_in(client, sample_admin)

    data = projects_of(client, "")

    assert len(data["projects"]) == 130
    assert data["pending_count"] == 130
    assert data["total_count"] == 133
    assert [p["id"] for p in data["projects"]] == sorted(ids[:130], reverse=True)


def test_project_review_shows_who_owns_each_project(client, sample_admin):
    seed_projects(["pending", "pending"])
    log_in(client, sample_admin)

    projects = projects_of(client, "?filter=pending")["projects"]

    assert [p["user_nickname"] for p in projects] == ["owner of 1", "owner of 0"]


def test_other_project_filters_are_capped_by_default(client, sample_admin):
    seed_projects(["approved"] * 120 + ["rejected"] * 3)
    log_in(client, sample_admin)

    everything = projects_of(client, "?filter=all")
    approved = projects_of(client, "?filter=approved")
    rejected = projects_of(client, "?filter=rejected")

    assert len(everything["projects"]) == 100
    assert len(approved["projects"]) == 100
    assert len(rejected["projects"]) == 3
    # the counts are of the whole table, not of the page
    assert everything["total_count"] == 123


def test_project_review_pages_with_limit_and_page(client, sample_admin):
    ids = seed_projects(["approved"] * 25)
    newest_first = sorted(ids, reverse=True)
    log_in(client, sample_admin)

    page_two = projects_of(client, "?filter=approved&limit=10&page=2")["projects"]
    last_page = projects_of(client, "?filter=approved&limit=10&page=3")["projects"]
    past_the_end = projects_of(client, "?filter=approved&limit=10&page=4")["projects"]

    assert [p["id"] for p in page_two] == newest_first[10:20]
    assert [p["id"] for p in last_page] == newest_first[20:]
    assert past_the_end == []


@pytest.mark.parametrize("limit, expected", [(5000, 200), (0, 1), (-3, 1), (4, 4)])
def test_project_review_limit_is_clamped(client, sample_admin, limit, expected):
    seed_projects(["approved"] * 210)
    log_in(client, sample_admin)

    projects = projects_of(client, f"?filter=approved&limit={limit}")["projects"]

    assert len(projects) == expected


def test_a_pending_limit_is_honoured_and_a_bad_page_means_the_first(client, sample_admin):
    ids = seed_projects(["pending"] * 6)
    log_in(client, sample_admin)

    page = projects_of(client, "?filter=pending&limit=2&page=-9")["projects"]

    assert [p["id"] for p in page] == sorted(ids, reverse=True)[:2]


def test_classroom_list_reports_enrolment_sizes(client, init_db, sample_admin):
    empty = ClassroomFactory(name="A empty")
    full = ClassroomFactory(name="B full")
    for _ in range(3):
        enroll(UserFactory(), full)
    log_in(client, sample_admin)

    classrooms = client.get("/api/admin/classrooms").json["data"]["classrooms"]

    counts = {c["id"]: c["student_count"] for c in classrooms}
    assert counts[empty.id] == 0
    assert counts[full.id] == 3


def test_parent_connections_list_every_link(client, init_db, sample_admin):
    parents = [ParentFactory() for _ in range(3)]
    children = [UserFactory() for _ in range(2)]
    for parent in parents[:2]:
        for child in children:
            parent.children.append(child)
    db.session.commit()
    log_in(client, sample_admin)

    connections = client.get("/api/admin/parents/connections").json["connections"]

    assert len(connections) == 4
    assert {c["parent"]["id"] for c in connections} == {p.id for p in parents[:2]}
    assert {c["student"]["id"] for c in connections} == {c.id for c in children}


def test_admin_project_form_lists_students_without_loading_them(
    client, init_db, sample_admin, count_queries
):
    students = [UserFactory(_username=f"pupil{i}") for i in range(4)]
    log_in(client, sample_admin)

    with count_queries() as statements:
        response = client.get("/user/project/new", headers={"Accept": "application/json"})

    listed = response.json["data"]["students"]
    assert [s["username"] for s in listed if s["username"].startswith("pupil")] == [
        f"pupil{i}" for i in range(4)
    ]
    assert {"id", "username", "slug"} == set(listed[0])
    assert students[0].id in {s["id"] for s in listed}
    # the session user and one projection of the user table
    assert len(statements) <= 2


def test_students_get_no_student_list_on_the_project_form(client, init_db, sample_user):
    log_in(client, sample_user)

    response = client.get("/user/project/new", headers={"Accept": "application/json"})

    assert response.json["data"]["students"] is None


def test_pending_course_requests_show_the_size_of_each_classroom_of_the_student(
    client, init_db, sample_admin
):
    student = UserFactory()
    classmate = UserFactory()
    mine = ClassroomFactory(name="Mine")
    empty = ClassroomFactory(name="Not enrolled")
    enroll(student, mine)
    enroll(classmate, mine)
    db.session.add(
        CourseInstanceRequest(
            student_id=student.id,
            course_instance_id="some_instance",
            url="http://test.url",
            status="pending",
        )
    )
    db.session.commit()
    log_in(client, sample_admin)

    [pending] = client.get("/api/course-requests/pending").json["requests"]

    assert [(c["id"], c["name"], c["student_count"]) for c in pending["student_classrooms"]] == [
        (mine.id, "Mine", 2)
    ]
    assert empty.id not in {c["id"] for c in pending["student_classrooms"]}
