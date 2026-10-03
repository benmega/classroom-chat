"""Tests for Project.template_id (project <-> ProjectTemplate link) and its
use when an approved project completes a 3D challenge."""

import importlib.util
import pathlib

import pytest
from application.commands.seed import seed_three_d_track
from application.commands.three_d_data import THREE_D_CHALLENGES
from application.extensions import db
from application.models.challenge_log import ChallengeLog
from application.models.project import Project
from application.models.project_template import ProjectTemplate
from application.models.user import User


def login_as_admin(client, admin_user):
    with client.session_transaction() as sess:
        sess["_user_id"] = str(admin_user.id)
        sess["_fresh"] = True
        sess["user"] = admin_user.id


def login_as_user(client, user):
    with client.session_transaction() as sess:
        sess["_user_id"] = str(user.id)
        sess["_fresh"] = True
        sess["user"] = user.id


@pytest.fixture(autouse=True)
def clear_total_cache():
    User._total_challenges_cache.clear()
    yield
    User._total_challenges_cache.clear()


@pytest.fixture
def seeded(init_db):
    seed_three_d_track()
    return init_db


def _template(name):
    return ProjectTemplate.query.filter_by(name=name).one()


def _approve(client, project, **extra):
    return client.post(
        f"/api/admin/handle-project-review/{project.id}",
        json={
            "action": "approve",
            "teacher_comment": "Nice",
            "packet_reward": 0.01,
            **extra,
        },
    )


def test_seed_difficulty_uses_shared_vocabulary(seeded):
    allowed = {"Beginner", "Intermediate", "Advanced"}
    for ch in THREE_D_CHALLENGES:
        assert ch["difficulty"] in allowed
    for name in ("How 3D Printers Work", "Name Tag Model", "Intro to Blender"):
        row = next(c for c in THREE_D_CHALLENGES if c["name"] == name)
        assert row["difficulty"] == "Beginner"


def test_project_to_dict_includes_template_id(sample_user, seeded):
    t = _template("Name Tag Model")
    p = Project(name="x", user_id=sample_user.id, template_id=t.id)
    db.session.add(p)
    db.session.commit()
    assert p.to_dict()["template_id"] == t.id
    assert Project(name="y", user_id=sample_user.id).to_dict()["template_id"] is None


def test_create_project_with_template_id(client, sample_user, seeded):
    login_as_user(client, sample_user)
    t = _template("The Donut")
    resp = client.post(
        "/user/project/new",
        data={"name": "My Cool Donut", "template_id": str(t.id)},
    )
    assert resp.status_code == 200
    assert Project.query.filter_by(name="My Cool Donut").one().template_id == t.id


def test_create_project_backfills_template_by_exact_name(client, sample_user, seeded):
    login_as_user(client, sample_user)
    t = _template("Name Tag Model")
    resp = client.post("/user/project/new", data={"name": "Name Tag Model"})
    assert resp.status_code == 200
    assert Project.query.filter_by(name="Name Tag Model").one().template_id == t.id

    resp = client.post("/user/project/new", data={"name": "name tag model!"})
    assert resp.status_code == 200
    assert Project.query.filter_by(name="name tag model!").one().template_id is None


def test_create_project_explicit_custom_does_not_name_match(client, sample_user, seeded):
    login_as_user(client, sample_user)
    resp = client.post(
        "/user/project/new", data={"name": "Name Tag Model", "template_id": ""}
    )
    assert resp.status_code == 200
    assert Project.query.filter_by(name="Name Tag Model").one().template_id is None


@pytest.mark.parametrize("bad", ["abc", "999999"])
def test_create_project_rejects_invalid_template_id(client, sample_user, seeded, bad):
    login_as_user(client, sample_user)
    resp = client.post("/user/project/new", data={"name": "Bad", "template_id": bad})
    assert resp.status_code == 400
    assert Project.query.filter_by(name="Bad").count() == 0


def test_edit_project_changes_and_clears_template(client, sample_user, seeded):
    login_as_user(client, sample_user)
    donut = _template("The Donut")
    tag = _template("Name Tag Model")
    project = Project(name="Mine", user_id=sample_user.id, template_id=donut.id)
    db.session.add(project)
    db.session.commit()
    url = f"/user/project/edit/{project.id}"

    # Not sending template_id leaves the link untouched (even when renaming).
    resp = client.post(url, data={"action": "save", "name": "Renamed"})
    assert resp.status_code == 200
    db.session.refresh(project)
    assert project.name == "Renamed" and project.template_id == donut.id

    resp = client.post(
        url, data={"action": "save", "name": "Renamed", "template_id": str(tag.id)}
    )
    assert resp.status_code == 200
    assert resp.get_json()["data"]["project"]["template_id"] == tag.id
    db.session.refresh(project)
    assert project.template_id == tag.id

    resp = client.post(
        url, data={"action": "save", "name": "Renamed", "template_id": ""}
    )
    assert resp.status_code == 200
    db.session.refresh(project)
    assert project.template_id is None

    # The frontend clears the link with the literal "null".
    project.template_id = tag.id
    db.session.commit()
    resp = client.post(
        url, data={"action": "save", "name": "Renamed", "template_id": "null"}
    )
    assert resp.status_code == 200
    db.session.refresh(project)
    assert project.template_id is None

    resp = client.post(
        url, data={"action": "save", "name": "Renamed", "template_id": "424242"}
    )
    assert resp.status_code == 400
    db.session.refresh(project)
    assert project.template_id is None


def test_approving_renamed_project_with_template_id_completes_challenge_once(
    client, sample_admin, sample_user, seeded
):
    login_as_admin(client, sample_admin)
    t = _template("Name Tag Model")
    project = Project(
        name="Totally Different Name",
        description="d",
        user_id=sample_user.id,
        template_id=t.id,
    )
    db.session.add(project)
    db.session.commit()
    ducks_before = sample_user.duck_balance

    resp = _approve(client, project)
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["challenge_completed"] is True
    assert body["challenge_slug"] == "name-tag-model"

    resp2 = _approve(client, project, teacher_comment="Again")
    assert resp2.get_json()["challenge_completed"] is False

    db.session.expire_all()
    user = db.session.get(User, sample_user.id)
    assert (
        ChallengeLog.query.filter_by(
            user_id=user.id, challenge_slug="name-tag-model"
        ).count()
        == 1
    )
    assert user.duck_balance == ducks_before + 1


def test_approval_falls_back_to_name_when_template_id_missing(
    client, sample_admin, sample_user, seeded
):
    login_as_admin(client, sample_admin)
    project = Project(name="The Donut", description="d", user_id=sample_user.id)
    db.session.add(project)
    db.session.commit()
    assert project.template_id is None
    assert _approve(client, project).get_json()["challenge_slug"] == "the-donut"


def test_deleting_template_nulls_project_template_id(sample_user, seeded):
    t = ProjectTemplate(name="Temp Template", description="d")
    db.session.add(t)
    db.session.commit()
    p = Project(name="p", user_id=sample_user.id, template_id=t.id)
    db.session.add(p)
    db.session.commit()
    pid, tid = p.id, t.id

    # SQLite only enforces ON DELETE SET NULL with foreign keys switched on.
    # The pragma is per connection and the connection is pooled, so always restore it.
    db.session.execute(db.text("PRAGMA foreign_keys=ON"))
    try:
        db.session.execute(
            db.text("DELETE FROM project_templates WHERE id = :i"), {"i": tid}
        )
        db.session.commit()
    finally:
        db.session.rollback()
        db.session.execute(db.text("PRAGMA foreign_keys=OFF"))
        db.session.commit()
    db.session.expire_all()
    assert db.session.get(Project, pid).template_id is None


def test_assign_project_by_admin_links_template_by_name(
    client, sample_admin, sample_user, seeded
):
    login_as_admin(client, sample_admin)
    resp = client.post(
        "/api/admin/assign-project",
        json={"user_id": sample_user.id, "name": "Intro to Blender"},
    )
    assert resp.status_code == 200
    p = Project.query.filter_by(name="Intro to Blender").one()
    assert p.template_id == _template("Intro to Blender").id


def test_migration_backfill_links_exact_name_matches_only(sample_user, seeded):
    path = next(
        pathlib.Path(__file__).resolve().parents[2].glob(
            "migrations/versions/e5b2d84f6a17_*.py"
        )
    )
    spec = importlib.util.spec_from_file_location("mig_e5b2d84f6a17", path)
    mig = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mig)
    assert mig.down_revision == "d3a7c5e91b24"

    exact = Project(name="Name Tag Model", user_id=sample_user.id)
    renamed = Project(name="Name Tag Model 2", user_id=sample_user.id)
    already = Project(
        name="The Donut",
        user_id=sample_user.id,
        template_id=_template("Intro to Blender").id,
    )
    db.session.add_all([exact, renamed, already])
    db.session.commit()

    mig.backfill_template_ids(db.session.connection())
    db.session.commit()
    db.session.expire_all()

    assert db.session.get(Project, exact.id).template_id == _template("Name Tag Model").id
    assert db.session.get(Project, renamed.id).template_id is None
    # Existing links are never overwritten.
    assert (
        db.session.get(Project, already.id).template_id
        == _template("Intro to Blender").id
    )
