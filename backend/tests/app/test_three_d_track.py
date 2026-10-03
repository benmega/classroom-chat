"""Tests for the 3D modeling learning track (seeding, completion, progress)."""

import pytest
from application.commands.seed import generate_kebab_slug, seed_three_d_track, seed_command
from application.commands.three_d_data import THREE_D_CHALLENGES, THREE_D_COURSES
from application.extensions import db
from application.models.challenge import Challenge
from application.models.challenge_log import ChallengeLog
from application.models.course import Course
from application.models.duck_transaction import DuckTransaction
from application.models.project import Project
from application.models.project_template import ProjectTemplate
from application.models.user import User


def login_as_admin(client, admin_user):
    with client.session_transaction() as sess:
        sess["_user_id"] = str(admin_user.id)
        sess["_fresh"] = True
        sess["user"] = admin_user.id


@pytest.fixture(autouse=True)
def clear_total_cache():
    User._total_challenges_cache.clear()
    yield
    User._total_challenges_cache.clear()


@pytest.fixture
def seeded(init_db):
    seed_three_d_track()
    return init_db


def _challenge(name):
    return Challenge.query.filter_by(slug=generate_kebab_slug(name)).one()


# --------------------------------------------------------------------- seeding


def test_seed_creates_expected_curriculum(seeded):
    assert {c.id for c in Course.query.filter_by(domain="3d-modeling")} == {
        "3d-1",
        "3d-2",
    }
    assert db.session.get(Course, "3d-1").name == "TinkerCAD 1"
    assert db.session.get(Course, "3d-2").name == "Blender 1"
    assert db.session.get(Course, "3d-1").description

    assert Challenge.query.filter_by(domain="3d-modeling").count() == 9
    tinker = (
        Challenge.query.filter_by(course_id="3d-1").order_by(Challenge.sequence).all()
    )
    blender = (
        Challenge.query.filter_by(course_id="3d-2").order_by(Challenge.sequence).all()
    )
    assert [c.sequence for c in tinker] == [1, 2, 3, 4, 5, 6]
    assert [c.sequence for c in blender] == [1, 2, 3]
    assert tinker[0].name == "How 3D Printers Work"
    assert tinker[3].slug == "the-snowman-challenge"
    assert blender[1].name == "The Donut"
    for c in tinker + blender:
        assert c.difficulty == "medium" and c.value == 1 and c.description
        assert c.scale_value() == 1

    # One template per challenge, name == challenge name, linked by slug.
    assert ProjectTemplate.query.filter(
        ProjectTemplate.challenge_slug.isnot(None)
    ).count() == 9
    for c in tinker + blender:
        t = ProjectTemplate.query.filter_by(name=c.name).one()
        assert t.challenge_slug == c.slug
        assert t.chapter == ("TinkerCAD 1" if c.course_id == "3d-1" else "Blender 1")
        assert t.description and t.difficulty and t.concepts and t.goals


def test_seed_is_idempotent_and_never_deletes(seeded):
    # Admin edits + extra rows an admin created in the 3D courses.
    donut = ProjectTemplate.query.filter_by(name="The Donut").one()
    donut.description = "Teacher-edited donut description."
    donut.goals = ["Teacher goal"]
    extra_challenge = Challenge(
        name="Teacher Extra",
        slug="teacher-extra",
        domain="3d-modeling",
        course_id="3d-2",
        sequence=99,
        value=1,
    )
    extra_template = ProjectTemplate(name="Teacher Extra", description="x")
    db.session.add_all([extra_challenge, extra_template])
    db.session.commit()

    stats = seed_three_d_track()

    assert stats["courses_inserted"] == 0
    assert stats["challenges_inserted"] == 0
    assert stats["templates_inserted"] == 0
    assert Course.query.filter_by(domain="3d-modeling").count() == 2
    assert Challenge.query.filter_by(domain="3d-modeling").count() == 10
    assert ProjectTemplate.query.count() >= 10
    assert ProjectTemplate.query.filter_by(name="Teacher Extra").count() == 1
    assert Challenge.query.filter_by(slug="teacher-extra").count() == 1
    donut = ProjectTemplate.query.filter_by(name="The Donut").one()
    assert donut.description == "Teacher-edited donut description."
    assert donut.goals == ["Teacher goal"]
    assert donut.challenge_slug == "the-donut"


def test_seed_command_runs_the_3d_step_twice(test_app, init_db):
    runner = test_app.test_cli_runner()
    from unittest.mock import patch

    with patch("os.path.exists", return_value=False):
        first = runner.invoke(seed_command)
        second = runner.invoke(seed_command)
    assert first.exit_code == 0 and second.exit_code == 0
    assert "3D modeling track" in first.output
    assert Course.query.filter_by(domain="3d-modeling").count() == 2
    assert Challenge.query.filter_by(domain="3d-modeling").count() == 9
    assert ProjectTemplate.query.filter(
        ProjectTemplate.chapter.in_(["TinkerCAD 1", "Blender 1"])
    ).count() == 9


def test_seed_adopts_rows_from_retired_script(init_db, sample_user):
    """Old rows used slug 'holes-&-subtraction' and 'Project for X.' text."""
    db.session.add(Course(id="3d-1", name="TinkerCAD 1", domain="3d-modeling"))
    db.session.add(
        Challenge(
            name="Holes & Subtraction",
            slug="holes-&-subtraction",
            domain="3d-modeling",
            course_id="3d-1",
            value=1,
        )
    )
    db.session.add(
        ProjectTemplate(
            name="Holes & Subtraction",
            description="Project for Holes & Subtraction.",
            chapter="TinkerCAD 1",
        )
    )
    db.session.add(
        ChallengeLog(
            user_id=sample_user.id,
            domain="3d-modeling",
            challenge_slug="holes-&-subtraction",
        )
    )
    db.session.commit()

    seed_three_d_track()

    assert Challenge.query.filter_by(name="Holes & Subtraction").count() == 1
    ch = _challenge("Holes & Subtraction")
    assert ch.slug == "holes-subtraction"
    assert ch.sequence == 3
    assert ChallengeLog.query.filter_by(challenge_slug="holes-subtraction").count() == 1
    t = ProjectTemplate.query.filter_by(name="Holes & Subtraction").one()
    assert t.challenge_slug == "holes-subtraction"
    assert not t.description.startswith("Project for")


# ------------------------------------------------------------ project approval


def _make_project(user, name):
    p = Project(name=name, description="d", link="https://tinkercad.com/x", user_id=user.id)
    db.session.add(p)
    db.session.commit()
    return p


def _approve(client, project, **extra):
    return client.post(
        f"/api/admin/handle-project-review/{project.id}",
        json={"action": "approve", "teacher_comment": "Nice", "packet_reward": 0.01, **extra},
    )


def test_approving_linked_3d_project_completes_challenge_once(
    client, sample_admin, sample_user, seeded
):
    login_as_admin(client, sample_admin)
    project = _make_project(sample_user, "Name Tag Model")
    ducks_before = sample_user.duck_balance

    resp = _approve(client, project)
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["status"] == "success"
    assert body["challenge_completed"] is True
    assert body["challenge_slug"] == "name-tag-model"

    db.session.expire_all()
    user = db.session.get(User, sample_user.id)
    logs = ChallengeLog.query.filter_by(
        user_id=user.id, challenge_slug="name-tag-model"
    ).all()
    assert len(logs) == 1
    assert logs[0].domain == "3d-modeling" and logs[0].course_id == "3d-1"
    assert user.duck_balance == ducks_before + 1
    assert user.active_track == "3d"
    assert user.get_progress("3d-modeling") == 1
    assert (
        DuckTransaction.query.filter_by(user_id=user.id)
        .filter(DuckTransaction.reason.like("Project approved:%"))
        .count()
        == 1
    )

    # Approving again (e.g. updated feedback) must not double-award.
    resp2 = _approve(client, project, teacher_comment="Updated")
    assert resp2.status_code == 200
    body2 = resp2.get_json()
    assert body2["challenge_completed"] is False
    assert body2["challenge_slug"] == "name-tag-model"
    db.session.expire_all()
    user = db.session.get(User, sample_user.id)
    assert ChallengeLog.query.filter_by(user_id=user.id).count() == 1
    assert user.duck_balance == ducks_before + 1


def test_approving_unlinked_project_is_unchanged(
    client, sample_admin, sample_user, seeded
):
    login_as_admin(client, sample_admin)
    track_before = sample_user.active_track
    ducks_before = sample_user.duck_balance
    project = _make_project(sample_user, "Some Freeform Project")

    resp = _approve(client, project)
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["status"] == "success"
    assert body["challenge_completed"] is False
    assert body["challenge_slug"] is None

    db.session.expire_all()
    user = db.session.get(User, sample_user.id)
    assert ChallengeLog.query.filter_by(user_id=user.id).count() == 0
    assert user.duck_balance == ducks_before
    assert user.active_track == track_before


def test_approving_template_with_dangling_slug_is_safe(
    client, sample_admin, sample_user, init_db
):
    login_as_admin(client, sample_admin)
    db.session.add(
        ProjectTemplate(name="Ghost Link", description="d", challenge_slug="no-such")
    )
    db.session.commit()
    project = _make_project(sample_user, "Ghost Link")
    resp = _approve(client, project)
    assert resp.status_code == 200
    assert resp.get_json()["challenge_completed"] is False
    assert ChallengeLog.query.filter_by(user_id=sample_user.id).count() == 0


def test_project_template_routes_persist_challenge_slug(
    client, sample_admin, init_db
):
    login_as_admin(client, sample_admin)
    resp = client.post(
        "/api/project-templates",
        json={"name": "Linked", "description": "d", "challenge_slug": "the-donut"},
    )
    assert resp.status_code == 200
    template = resp.get_json()["data"]["template"]
    assert template["challenge_slug"] == "the-donut"

    resp = client.put(
        f"/api/project-templates/{template['id']}", json={"challenge_slug": ""}
    )
    assert resp.status_code == 200
    assert resp.get_json()["data"]["template"]["challenge_slug"] is None

    resp = client.put(
        f"/api/project-templates/{template['id']}", json={"challenge_slug": "x"}
    )
    assert db.session.get(ProjectTemplate, template["id"]).challenge_slug == "x"

    # Optional on create.
    resp = client.post(
        "/api/project-templates", json={"name": "Plain", "description": "d"}
    )
    assert resp.get_json()["data"]["template"]["challenge_slug"] is None


# ----------------------------------------------------------------- pass_chapter


def test_pass_chapter_for_3d_course(client, sample_admin, sample_user, seeded):
    login_as_admin(client, sample_admin)
    track_before = sample_user.active_track
    ducks_before = sample_user.duck_balance

    resp = client.post(
        f"/api/admin/user/{sample_user.id}/pass_chapter", json={"course_id": "3d-1"}
    )
    assert resp.status_code == 200
    data = resp.get_json()["data"]
    assert data["success"] is True
    assert "Awarded 6 ducks and completed 6 challenges" in data["message"]

    db.session.expire_all()
    user = db.session.get(User, sample_user.id)
    logs = ChallengeLog.query.filter_by(user_id=user.id).all()
    assert len(logs) == 6
    assert {l.course_id for l in logs} == {"3d-1"}
    assert {l.domain for l in logs} == {"3d-modeling"}
    assert user.duck_balance == ducks_before + 6
    # Admin override keeps its previous behaviour: the track is not switched.
    assert user.active_track == track_before
    assert (
        DuckTransaction.query.filter_by(user_id=user.id, amount=6).count() == 1
    )

    # Second run is a no-op.
    resp = client.post(
        f"/api/admin/user/{sample_user.id}/pass_chapter", json={"course_id": "3d-1"}
    )
    assert "Awarded 0 ducks and completed 0 challenges" in resp.get_json()["data"]["message"]
    assert ChallengeLog.query.filter_by(user_id=user.id).count() == 6


# ------------------------------------------------------------ track resolution


def test_get_track_for_course_id_3d(seeded):
    from application.routes.challenge_routes import get_track_for_course_id

    assert get_track_for_course_id("3d-1") == "3d"
    assert get_track_for_course_id("3d-2") == "3d"
    db.session.add(Course(id="cs-x", name="CS Thing", domain="codecombat.com"))
    db.session.commit()
    assert get_track_for_course_id("cs-x") == "cs"
    assert get_track_for_course_id("missing") is None
    assert get_track_for_course_id(None) is None


# ----------------------------------------------------------- progress summaries


def _complete(user, *names):
    from application.services.challenge_completion import grant_challenge_completion

    for n in names:
        assert grant_challenge_completion(user, _challenge(n), evaluate=False) is True


def test_to_dict_summary_td_fields_both_branches(seeded, sample_user):
    _complete(sample_user, "Name Tag Model", "The Donut", "Intro to Blender")

    # Non-precomputed branch
    d = sample_user.to_dict_summary()
    assert d["td_levels"] == 3
    assert d["td_percent"] == 33
    assert d["total_levels"] == d["completed_challenges_count"] == 3
    assert d["cc_levels"] == 0 and d["oz_levels"] == 0

    # Precomputed branch (same shape the admin list builds)
    from sqlalchemy import func

    counts = (
        db.session.query(
            ChallengeLog.user_id, ChallengeLog.domain, func.count(ChallengeLog.id)
        )
        .group_by(ChallengeLog.user_id, ChallengeLog.domain)
        .all()
    )
    precomputed = {(sample_user._username, dom): n for _uid, dom, n in counts}
    d2 = sample_user.to_dict_summary(precomputed)
    assert d2["td_levels"] == 3
    assert d2["td_percent"] == 33
    assert d2["total_levels"] == d2["completed_challenges_count"] == 3


def test_admin_user_list_includes_td_fields(client, sample_admin, sample_user, seeded):
    login_as_admin(client, sample_admin)
    _complete(sample_user, "Name Tag Model")
    resp = client.get("/api/admin/users?role=student")
    assert resp.status_code == 200
    payload = resp.get_json()
    users = (payload.get("data") or payload)["users"]
    mine = next(u for u in users if u["username"] == sample_user.username)
    assert mine["td_levels"] == 1
    assert mine["td_percent"] == 11


def test_zero_total_is_not_cached(init_db, sample_user):
    assert sample_user.get_progress_percent("3d-modeling") == 0
    assert "3d-modeling" not in User._total_challenges_cache
    seed_three_d_track()  # seeded while the "process" keeps running
    _complete(sample_user, "Name Tag Model")
    assert sample_user.get_progress_percent("3d-modeling") == 11
    assert User._total_challenges_cache["3d-modeling"] == 9


def test_course_progress_data_includes_3d_breakdown(seeded, sample_user):
    _complete(sample_user, "How 3D Printers Work", "Name Tag Model", "Animation Basics")
    data = sample_user.get_course_progress_data()["3d-modeling"]
    assert data["levels_completed"] == 3
    assert data["percent"] == 33
    by_course = {b["course_id"]: b for b in data["breakdown"]}
    assert by_course["3d-1"]["course_name"] == "TinkerCAD 1"
    assert by_course["3d-1"]["levels_total"] == 6
    assert by_course["3d-1"]["levels_completed"] == 2
    assert by_course["3d-2"]["course_name"] == "Blender 1"
    assert by_course["3d-2"]["levels_total"] == 3
    assert by_course["3d-2"]["levels_completed"] == 1
    names = [lvl["name"] for lvl in by_course["3d-1"]["levels"]]
    assert names[0] == "How 3D Printers Work"


# --------------------------------------------------------------------- helper


def test_grant_challenge_completion_is_idempotent(seeded, sample_user):
    from application.services.challenge_completion import grant_challenge_completion

    ch = _challenge("Revolve & Spin")
    before = sample_user.duck_balance
    assert grant_challenge_completion(sample_user, ch, reason="test") is True
    assert grant_challenge_completion(sample_user, ch, reason="test") is False
    db.session.refresh(sample_user)
    assert ChallengeLog.query.filter_by(user_id=sample_user.id).count() == 1
    assert sample_user.duck_balance == before + 1
    assert sample_user.active_track == "3d"
    assert len(THREE_D_COURSES) == 2 and len(THREE_D_CHALLENGES) == 9
