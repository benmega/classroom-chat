"""Tests for backend/reports/student_cards/generate_cards.py."""

from datetime import date, timedelta
from types import SimpleNamespace

import pytest
from application.extensions import db
from tests.factories import UserFactory

SCRIPT = "reports/student_cards/generate_cards.py"


@pytest.fixture
def cards(load_script, fake_qrcode, fake_reportlab):
    return load_script(SCRIPT, "generate_cards_under_test")


def _user(**kwargs):
    # A before_insert listener fills in a missing slug, so slug=None is applied afterwards
    # (legacy rows can still have no slug).
    no_slug = "slug" in kwargs and kwargs["slug"] is None
    if no_slug:
        del kwargs["slug"]
    user = UserFactory(**kwargs)
    if no_slug:
        user.slug = None
    db.session.commit()
    return user


def test_import_does_not_create_the_app(monkeypatch, load_script, fake_qrcode, fake_reportlab):
    def boom(*args, **kwargs):
        raise AssertionError("create_app() must not run at import time")

    monkeypatch.setattr("application.create_app", boom)

    module = load_script(SCRIPT, "generate_cards_import_check")

    assert not hasattr(module, "app")
    assert callable(module.main)


def test_logo_path_points_at_the_tracked_frontend_logo(cards):
    assert cards.LOGO_PATH.is_file()
    assert cards.LOGO_PATH.parts[-4:] == ("frontend", "static", "images", "logo.ico")

    logo = cards.get_image_from_path(cards.LOGO_PATH)

    assert logo is not None
    assert logo.mode == "RGBA"


def test_missing_logo_still_returns_none(cards, tmp_path, capsys):
    assert cards.get_image_from_path(tmp_path / "nope.ico") is None
    assert "Logo not found" in capsys.readouterr().out


def test_get_card_users_filters(cards):
    today = date.today()
    active = _user(nickname="Active", slug="active", last_daily_duck=today)
    recent = _user(nickname="Recent", slug="recent", last_daily_duck=today - timedelta(days=89))
    _user(nickname="Stale", slug="stale", last_daily_duck=today - timedelta(days=91))
    _user(nickname="Never", slug="never", last_daily_duck=None)
    _user(nickname="Boss", slug="boss", role="admin", last_daily_duck=today)
    _user(nickname="blossomstudent12", slug="blossomstudent12", last_daily_duck=today)
    _user(nickname="NoSlug", slug=None, last_daily_duck=today)

    users = cards.get_card_users()

    assert {u.id for u in users} == {active.id, recent.id}


def test_get_card_users_includes_users_with_a_normal_nickname_only(cards):
    kept = _user(nickname="Zed", slug="zed", last_daily_duck=date.today())
    _user(nickname="blossomstudent-x", slug="bx", last_daily_duck=date.today())

    assert [u.id for u in cards.get_card_users()] == [kept.id]


def test_generate_qr_encodes_the_spa_profile_url(cards, fake_qrcode):
    cards.generate_qr("jane-doe")

    assert fake_qrcode.instances[-1].data == ["https://blossom.benmega.com/profile/jane-doe"]


def test_generate_qr_honours_profile_base_url_env(cards, fake_qrcode, monkeypatch):
    monkeypatch.setenv("PROFILE_BASE_URL", "https://staging.example.test/")

    cards.generate_qr("jane-doe")

    assert fake_qrcode.instances[-1].data == ["https://staging.example.test/profile/jane-doe"]


def test_card_prints_the_same_link_the_qr_code_encodes(cards, fake_reportlab):
    user = SimpleNamespace(nickname="Jane", username="jane", slug="jane-doe")
    page = fake_reportlab("page.pdf")

    cards.draw_card(page, 0, 0, user, None)

    assert "blossom.benmega.com/profile/jane-doe" in page.strings
    assert not any("/user/profile/" in text for text in page.strings)


def test_create_pdf_draws_logo_and_qr_for_each_card(cards, fake_reportlab):
    users = [SimpleNamespace(nickname="Jane", username="jane", slug="jane-doe")]

    cards.create_pdf(users)

    page = fake_reportlab.instances[-1]
    assert page.saved
    # one logo (found at the frontend path) and one QR code
    assert page.images == 2


def test_main_builds_the_app_and_renders_active_users(cards, monkeypatch, test_app):
    user = _user(nickname="Active", slug="active", last_daily_duck=date.today())
    rendered = []
    monkeypatch.setattr(cards, "create_app", lambda: test_app)
    monkeypatch.setattr(cards, "create_pdf", lambda users, output_path: rendered.extend(users))

    cards.main([])

    assert [u.id for u in rendered] == [user.id]
