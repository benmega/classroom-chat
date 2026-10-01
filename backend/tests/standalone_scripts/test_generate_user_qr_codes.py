"""Tests for backend/tools/generate_user_qr_codes.py."""

from datetime import date, timedelta

import pytest
from application.extensions import db
from tests.factories import UserFactory

SCRIPT = "tools/generate_user_qr_codes.py"


@pytest.fixture
def qr_script(load_script, fake_qrcode, monkeypatch, test_app):
    module = load_script(SCRIPT, "generate_user_qr_codes_under_test")
    monkeypatch.setattr(module, "create_app", lambda: test_app)
    return module


def _user(no_slug=False, **kwargs):
    user = UserFactory(**kwargs)
    if no_slug:
        # A before_insert listener fills in a missing slug; legacy rows can still lack one.
        user.slug = None
    db.session.commit()
    return user


@pytest.fixture
def people():
    today = date.today()
    return {
        "active": _user(nickname="Active", last_daily_duck=today),
        "quiet": _user(nickname="Quiet", last_daily_duck=today - timedelta(days=200)),
        "pending": _user(nickname="Pending", is_approved=False),
        "admin": _user(nickname="Boss", role="admin"),
        "parent": _user(nickname="Parent", role="parent"),
        "noslug": _user(no_slug=True, nickname="NoSlug"),
    }


def _ids(users):
    return {u.id for u in users}


def test_default_selects_only_approved_students(qr_script, people):
    expected = {people[k].id for k in ("active", "quiet", "noslug")}

    assert _ids(qr_script.get_qr_users()) == expected


def test_include_admins_restores_every_user(qr_script, people):
    assert _ids(qr_script.get_qr_users(include_admins=True)) == {u.id for u in people.values()}


def test_active_days_keeps_only_recently_active_users(qr_script, people):
    assert _ids(qr_script.get_qr_users(active_days=90)) == {people["active"].id}


def test_active_days_combines_with_include_admins(qr_script, people):
    admin_today = people["admin"]
    admin_today.last_daily_duck = date.today()
    db.session.commit()

    selected = qr_script.get_qr_users(include_admins=True, active_days=90)

    assert _ids(selected) == {people["active"].id, admin_today.id}


def test_generates_codes_for_students_and_reports_the_real_count(qr_script, fake_qrcode, people, tmp_path, capsys):
    qr_script.generate_qr_codes(output_dir=tmp_path)

    out = capsys.readouterr().out
    assert "Done! Generated 2 QR codes" in out
    assert "has no slug" in out
    names = sorted(p.name for p in tmp_path.iterdir())
    assert names == sorted([f"{people['active'].slug}_qr.png", f"{people['quiet'].slug}_qr.png"])


def test_qr_codes_encode_the_spa_profile_url(qr_script, fake_qrcode, people, tmp_path):
    qr_script.generate_qr_codes(output_dir=tmp_path)

    encoded = {qr.data[0] for qr in fake_qrcode.instances}
    assert encoded == {
        f"https://blossom.benmega.com/profile/{people['active'].slug}",
        f"https://blossom.benmega.com/profile/{people['quiet'].slug}",
    }


def test_base_url_argument_is_used(qr_script, fake_qrcode, people, tmp_path):
    qr_script.generate_qr_codes(base_url="https://staging.example.test/", output_dir=tmp_path)

    assert all(qr.data[0].startswith("https://staging.example.test/profile/") for qr in fake_qrcode.instances)


def test_no_matching_users_prints_a_message(qr_script, fake_qrcode, tmp_path, capsys):
    qr_script.generate_qr_codes(output_dir=tmp_path)

    assert "No matching users found" in capsys.readouterr().out
    assert fake_qrcode.instances == []


def test_parse_args_defaults(qr_script):
    args = qr_script.parse_args([])

    assert args.base_url == "https://blossom.benmega.com"
    assert args.active_days is None
    assert args.include_admins is False


def test_parse_args_reads_env_and_flags(qr_script, monkeypatch):
    monkeypatch.setenv("PROFILE_BASE_URL", "https://env.example.test")

    assert qr_script.parse_args([]).base_url == "https://env.example.test"

    args = qr_script.parse_args(["--base-url", "https://cli.example.test", "--active-days", "30", "--include-admins"])
    assert args.base_url == "https://cli.example.test"
    assert args.active_days == 30
    assert args.include_admins is True
