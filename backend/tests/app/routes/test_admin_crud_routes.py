"""Tests for the admin CRUD API (/api/admin/crud) behind the react-admin panel."""

import re
from datetime import datetime
from pathlib import Path

import pytest
from application.extensions import db
from application.models.challenge import Challenge
from application.models.message import Message
from application.models.user import User
from application.routes.admin import crud_routes
from sqlalchemy import event, inspect
from sqlalchemy.exc import IntegrityError, OperationalError
from tests.factories import (
    ChallengeFactory,
    ClassroomFactory,
    CourseFactory,
    DuckTradeLogFactory,
    MessageFactory,
    SkillFactory,
    UserFactory,
)

BASE = "/api/admin/crud"


@pytest.fixture
def admin_client(client, sample_admin):
    with client.session_transaction() as sess:
        sess["_user_id"] = str(sample_admin.id)
        sess["_fresh"] = True
        sess["user"] = sample_admin.id
    return client


def _names(resp):
    return [row["name"] for row in resp.json["data"]]


# --------------------------------------------------------------------------- #
# Schema
# --------------------------------------------------------------------------- #


def test_schema_reports_enum_values(admin_client):
    resp = admin_client.get(f"{BASE}/schema/message")
    assert resp.status_code == 200
    fields = {f["name"]: f for f in resp.json["fields"]}
    assert fields["message_type"]["type"] == "ENUM"
    assert fields["message_type"]["enums"] == ["text", "link", "code_snippet"]
    assert "enums" not in fields["content"]


def test_schema_hides_protected_fields(admin_client):
    resp = admin_client.get(f"{BASE}/schema/user")
    names = [f["name"] for f in resp.json["fields"]]
    assert "_username" in names
    assert "password_hash" not in names


# --------------------------------------------------------------------------- #
# Resource lookup
# --------------------------------------------------------------------------- #


def test_get_model_accepts_singular_plural_and_any_case(test_app):
    assert crud_routes.get_model("user") is User
    assert crud_routes.get_model("Users") is User
    assert crud_routes.get_model("MESSAGES") is Message
    assert crud_routes.get_model("nope") is None


def test_get_model_prefers_exact_name_and_logs_ambiguity(test_app, monkeypatch, caplog):
    class Cat:
        pass

    class Cats:
        pass

    class Dog:
        pass

    class FakeMapper:
        def __init__(self, cls):
            self.class_ = cls

    fake = {FakeMapper(Cat), FakeMapper(Cats), FakeMapper(Dog)}
    monkeypatch.setattr(type(db.Model.registry), "mappers", property(lambda self: fake))
    monkeypatch.setattr(crud_routes, "_model_lookup_cache", {"size": -1, "models": {}})

    with caplog.at_level("WARNING"):
        assert crud_routes.get_model("cats") is Cats  # exact name beats Cat's plural
        assert crud_routes.get_model("cat") is Cat
        assert crud_routes.get_model("dogs") is Dog
    assert "ambiguous" in caplog.text


# --------------------------------------------------------------------------- #
# Listing: paging, sorting, filtering, search, ids
# --------------------------------------------------------------------------- #


def test_list_is_always_bounded(admin_client, monkeypatch):
    monkeypatch.setattr(crud_routes, "_MAX_PAGE_SIZE", 3)
    for i in range(5):
        ChallengeFactory(name=f"c{i}", value=i)

    resp = admin_client.get(f"{BASE}/challenge")
    assert resp.status_code == 200
    assert len(resp.json["data"]) == 3
    assert resp.json["total"] == 5

    # An oversized range is clamped as well
    resp = admin_client.get(f"{BASE}/challenge?_start=0&_end=100")
    assert len(resp.json["data"]) == 3
    assert resp.json["total"] == 5


def test_list_range_window(admin_client):
    for i in range(5):
        ChallengeFactory(name=f"c{i}", value=i)

    resp = admin_client.get(f"{BASE}/challenge?_sort=value&_order=ASC&_start=1&_end=3")
    assert _names(resp) == ["c1", "c2"]
    assert resp.json["total"] == 5

    # Only _end: starts at the beginning; only _start: runs to the page limit
    assert _names(admin_client.get(f"{BASE}/challenge?_sort=value&_end=2")) == ["c0", "c1"]
    assert _names(admin_client.get(f"{BASE}/challenge?_sort=value&_start=3")) == ["c3", "c4"]


@pytest.mark.parametrize(
    "qs",
    ["_start=5&_end=5", "_start=5&_end=2", "_start=-1&_end=5", "_start=abc", "_end=1.5"],
)
def test_list_rejects_bad_range(admin_client, qs):
    resp = admin_client.get(f"{BASE}/challenge?{qs}")
    assert resp.status_code == 400
    assert "error" in resp.json


def test_list_sorting(admin_client):
    ChallengeFactory(name="mid", value=5)
    ChallengeFactory(name="low", value=1)
    ChallengeFactory(name="high", value=9)

    assert _names(admin_client.get(f"{BASE}/challenge?_sort=value&_order=ASC")) == ["low", "mid", "high"]
    assert _names(admin_client.get(f"{BASE}/challenge?_sort=value&_order=DESC")) == ["high", "mid", "low"]
    assert _names(admin_client.get(f"{BASE}/challenge?_sort=value&_order=desc")) == ["high", "mid", "low"]


def test_list_order_ends_with_the_primary_key_so_pages_do_not_overlap(admin_client):
    ChallengeFactory(name="a", domain="same")
    ChallengeFactory(name="b", domain="same")
    statements = []

    def record(conn, cursor, statement, parameters, context, executemany):
        statements.append(statement)

    event.listen(db.engine, "before_cursor_execute", record)
    try:
        resp = admin_client.get(f"{BASE}/challenge?_sort=domain&_order=DESC&_start=0&_end=1")
    finally:
        event.remove(db.engine, "before_cursor_execute", record)

    assert resp.status_code == 200
    page = next(s for s in statements if "FROM challenges" in s and "LIMIT" in s)
    # Rows that tie on the sorted column keep a fixed order, so consecutive pages never repeat or skip rows
    assert re.search(r"ORDER BY challenges\.domain DESC, challenges\.id\b", page)


@pytest.mark.parametrize("field", ["query", "to_dict", "scale_value", "nope"])
def test_list_ignores_non_column_sort_fields(admin_client, field):
    ChallengeFactory(name="a")
    ChallengeFactory(name="b")
    resp = admin_client.get(f"{BASE}/challenge?_sort={field}&_order=DESC")
    assert resp.status_code == 200
    assert _names(resp) == ["a", "b"]  # falls back to primary-key order


def test_list_cannot_sort_by_protected_field(admin_client):
    resp = admin_client.get(f"{BASE}/user?_sort=password_hash")
    assert resp.status_code == 200


def test_list_exact_filters_are_typed(admin_client):
    ChallengeFactory(name="a", domain="d1", value=3, is_active=True)
    ChallengeFactory(name="b", domain="d1", value=4, is_active=False)
    ChallengeFactory(name="c", domain="d2", value=3, is_active=True)

    assert _names(admin_client.get(f"{BASE}/challenge?domain=d1")) == ["a", "b"]
    assert _names(admin_client.get(f"{BASE}/challenge?domain=d1&value=3")) == ["a"]
    assert _names(admin_client.get(f"{BASE}/challenge?is_active=false")) == ["b"]
    assert _names(admin_client.get(f"{BASE}/challenge?is_active=1&domain=d2")) == ["c"]
    # total reflects the filter, not the whole table
    assert admin_client.get(f"{BASE}/challenge?domain=d1").json["total"] == 2


def test_list_repeated_filter_key_means_any_of(admin_client):
    ChallengeFactory(name="a", value=1)
    ChallengeFactory(name="b", value=2)
    ChallengeFactory(name="c", value=3)
    assert _names(admin_client.get(f"{BASE}/challenge?value=1&value=3")) == ["a", "c"]


def test_list_filters_by_foreign_key_target(admin_client):
    owner = UserFactory()
    other = UserFactory()
    SkillFactory(name="mine", user_id=owner.id)
    SkillFactory(name="theirs", user_id=other.id)
    resp = admin_client.get(f"{BASE}/skill?user_id={owner.id}")
    assert _names(resp) == ["mine"]


def test_list_filter_on_date_column(admin_client):
    UserFactory(_username="dated", last_daily_duck=datetime(2024, 5, 1).date())
    UserFactory(_username="undated")
    resp = admin_client.get(f"{BASE}/user?last_daily_duck=2024-05-01")
    assert [u["_username"] for u in resp.json["data"]] == ["dated"]


@pytest.mark.parametrize(
    "resource, qs",
    [
        ("challenge", "nope=1"),  # not a column
        ("user", "username=x"),  # hybrid property, not a column (the column is _username)
        ("challenge", "query=1"),  # attribute that is not a column
        ("challenge", "to_dict=1"),  # method
        ("user", "password_hash=x"),  # protected
        ("challenge", "value=abc"),  # not an integer
        ("challenge", "is_active=maybe"),  # not a boolean
    ],
)
def test_list_rejects_bad_filters(admin_client, resource, qs):
    resp = admin_client.get(f"{BASE}/{resource}?{qs}")
    assert resp.status_code == 400
    assert "error" in resp.json


def test_list_rejects_invalid_date_filter(admin_client):
    assert admin_client.get(f"{BASE}/user?last_daily_duck=yesterday").status_code == 400


def test_list_text_search(admin_client):
    UserFactory(_username="alice_smith", nickname="Ali")
    UserFactory(_username="bob", nickname="Robert", email="Bob@Example.com")
    UserFactory(_username="carol", nickname="C")
    UserFactory(_username="a_b")
    UserFactory(_username="axb")

    def usernames(qs):
        return sorted(u["_username"] for u in admin_client.get(f"{BASE}/user?{qs}").json["data"])

    assert usernames("q=alice") == ["alice_smith"]
    assert usernames("q=ALICE") == ["alice_smith"]  # case-insensitive
    assert usernames("q=robert") == ["bob"]  # any string column
    assert usernames("q=example.com") == ["bob"]
    assert usernames("q=zzz") == []
    # Blank search is no search
    assert {"alice_smith", "bob", "carol"} <= set(usernames("q=%20"))
    # LIKE wildcards are literal
    assert usernames("q=%25") == []
    assert usernames("q=a_b") == ["a_b"]  # '_' would match any char if not escaped


def test_list_search_combines_with_filters_and_total(admin_client):
    ChallengeFactory(name="Alpha one", domain="d1")
    ChallengeFactory(name="Alpha two", domain="d2")
    ChallengeFactory(name="Beta", domain="d1")
    resp = admin_client.get(f"{BASE}/challenge?q=alpha&domain=d1")
    assert _names(resp) == ["Alpha one"]
    assert resp.json["total"] == 1


def test_search_skips_enum_columns(admin_client):
    MessageFactory(content="hello", message_type="link")
    assert admin_client.get(f"{BASE}/message?q=hello").json["total"] == 1
    # message_type is an Enum: its values are not part of the free-text search
    assert admin_client.get(f"{BASE}/message?q=link").json["total"] == 0


def test_search_never_matches_protected_fields(admin_client):
    UserFactory(_username="someone")
    # every factory user shares this password_hash
    assert admin_client.get(f"{BASE}/user?q=pbkdf2").json["total"] == 0


def test_search_on_model_without_text_columns_matches_nothing(admin_client, sample_admin):
    from tests.factories import SessionLogFactory

    SessionLogFactory(user_id=sample_admin.id)
    assert admin_client.get(f"{BASE}/sessionlog").json["total"] == 1
    assert admin_client.get(f"{BASE}/sessionlog?q=anything").json["total"] == 0


def test_list_by_ids_returns_only_those_rows(admin_client):
    rows = [ChallengeFactory(name=f"c{i}") for i in range(4)]
    wanted = [rows[3].id, rows[1].id]

    resp = admin_client.get(f"{BASE}/challenge?id={wanted[0]}&id={wanted[1]}")
    assert resp.status_code == 200
    assert sorted(r["id"] for r in resp.json["data"]) == sorted(wanted)
    assert resp.json["total"] == 2


def test_list_by_ids_skips_unusable_ids(admin_client):
    row = ChallengeFactory(name="only")
    resp = admin_client.get(f"{BASE}/challenge?id={row.id}&id=abc&id=99999")
    assert [r["id"] for r in resp.json["data"]] == [row.id]

    resp = admin_client.get(f"{BASE}/challenge?id=abc")
    assert resp.json == {"data": [], "total": 0}


def test_list_by_ids_with_string_primary_keys(admin_client):
    a, b, _c = CourseFactory(), CourseFactory(), CourseFactory()
    resp = admin_client.get(f"{BASE}/courses?id={a.id}&id={b.id}")
    assert sorted(r["id"] for r in resp.json["data"]) == sorted([a.id, b.id])


def test_list_by_ids_uses_constant_number_of_queries(admin_client):
    users = [UserFactory() for _ in range(6)]
    for user in users:
        MessageFactory(user_id=user.id)
    ids = [u.id for u in users]

    def selects_for(wanted):
        db.session.remove()  # the request must not reuse rows the test already loaded
        statements = []

        def record(conn, cursor, statement, parameters, context, executemany):
            statements.append(statement)

        event.listen(db.engine, "before_cursor_execute", record)
        try:
            resp = admin_client.get(f"{BASE}/user?" + "&".join(f"id={i}" for i in wanted))
        finally:
            event.remove(db.engine, "before_cursor_execute", record)
        assert resp.status_code == 200
        assert len(resp.json["data"]) == len(wanted)
        return len(statements)

    # One round trip per page, however many rows (and however many relationships) they have
    assert selects_for(ids[:1]) == selects_for(ids)


def test_list_does_not_load_relationships_it_never_serializes(admin_client):
    user = UserFactory()
    MessageFactory(user_id=user.id)
    user_id = user.id
    loaded = []

    def remember(target, context):
        loaded.append(target)

    db.session.remove()
    event.listen(User, "load", remember)
    try:
        assert admin_client.get(f"{BASE}/user?id={user_id}").status_code == 200
    finally:
        event.remove(User, "load", remember)

    # User.messages is a selectin relationship: the listed row must not have hydrated it
    [listed] = [u for u in loaded if u.id == user_id]
    assert "messages" in inspect(listed).unloaded


def test_every_model_lists_and_matches_its_schema(admin_client):
    """The panel offers every registered model: listing must work and records must match the schema."""
    checked = 0
    for mapper in db.Model.registry.mappers:
        name = mapper.class_.__name__.lower()
        schema = admin_client.get(f"{BASE}/schema/{name}")
        assert schema.status_code == 200, name
        schema_names = {f["name"] for f in schema.json["fields"]}

        resp = admin_client.get(f"{BASE}/{name}?_sort=id&_order=DESC&_start=0&_end=10")
        assert resp.status_code == 200, name
        for record in resp.json["data"]:
            assert set(record) == schema_names, name
            checked += 1
    assert checked  # seeded data (classrooms, store items, templates) was serialized


# --------------------------------------------------------------------------- #
# Serialization
# --------------------------------------------------------------------------- #


def test_user_record_matches_schema_and_is_light(admin_client):
    user = UserFactory(_username="serialized", last_daily_duck=datetime(2024, 5, 1).date())
    SkillFactory(user_id=user.id)

    record = admin_client.get(f"{BASE}/user/{user.id}").json["data"]
    schema_names = {f["name"] for f in admin_client.get(f"{BASE}/schema/user").json["fields"]}

    assert record["_username"] == "serialized"
    assert set(record) == schema_names
    assert "password_hash" not in record
    assert not {"username", "skills", "projects", "contribution_data", "course_progress"} & set(record)
    assert record["last_daily_duck"] == "2024-05-01"
    assert datetime.fromisoformat(record["created_at"])  # ISO, not an RFC-1123 string


def test_serialization_never_includes_protected_fields_for_any_model(admin_client):
    UserFactory()
    for item in admin_client.get(f"{BASE}/user").json["data"]:
        assert "password_hash" not in item and "password" not in item
    assert "password_hash" not in crud_routes.model_to_dict(UserFactory())


def test_models_without_to_dict_serialize_their_columns(admin_client):
    row = ChallengeFactory(name="plain", description="text")
    record = admin_client.get(f"{BASE}/challenge/{row.id}").json["data"]
    assert record["name"] == "plain"
    assert record["description"] == "text"
    assert isinstance(record["created_at"], str)


# --------------------------------------------------------------------------- #
# Create / update / delete
# --------------------------------------------------------------------------- #

_NEW_CHALLENGE = {"name": "New", "slug": "new", "domain": "d", "difficulty": "easy", "value": 1}


def test_create_rejects_unknown_fields(admin_client):
    resp = admin_client.post(f"{BASE}/challenge", json={**_NEW_CHALLENGE, "bogus": 1, "skills": [], "scale_value": 2})
    assert resp.status_code == 400
    assert "bogus" in resp.json["error"] and "skills" in resp.json["error"]
    assert Challenge.query.count() == 0


def test_create_still_drops_protected_fields(admin_client):
    resp = admin_client.post(f"{BASE}/challenge", json={**_NEW_CHALLENGE, "id": 4242, "created_at": "2000-01-01T00:00:00"})
    assert resp.status_code == 200
    assert resp.json["data"]["id"] != 4242
    assert not resp.json["data"]["created_at"].startswith("2000")


def test_create_allows_ids_for_courses(admin_client):
    resp = admin_client.post(f"{BASE}/courses", json={"id": "my-course", "name": "N", "domain": "d"})
    assert resp.status_code == 200
    assert resp.json["data"]["id"] == "my-course"


@pytest.mark.parametrize("kwargs", [{"data": "not json", "content_type": "application/json"}, {"json": None}, {"json": [1, 2]}, {"data": "x=1"}])
def test_create_and_update_require_a_json_object(admin_client, kwargs):
    row = ChallengeFactory()
    for resp in (
        admin_client.post(f"{BASE}/challenge", **kwargs),
        admin_client.put(f"{BASE}/challenge/{row.id}", **kwargs),
    ):
        assert resp.status_code == 400
        assert resp.is_json
        assert resp.json["error"] == "JSON object body required"


def test_create_duplicate_returns_409_and_session_stays_usable(admin_client):
    assert admin_client.post(f"{BASE}/challenge", json=_NEW_CHALLENGE).status_code == 200

    resp = admin_client.post(f"{BASE}/challenge", json=_NEW_CHALLENGE)
    assert resp.status_code == 409
    assert "slug" in resp.json["error"]

    ok = admin_client.post(f"{BASE}/challenge", json={**_NEW_CHALLENGE, "slug": "other", "name": "Other"})
    assert ok.status_code == 200
    assert Challenge.query.count() == 2


def test_create_missing_required_value_returns_409(admin_client):
    resp = admin_client.post(f"{BASE}/challenge", json={"name": "only a name"})
    assert resp.status_code == 409
    assert resp.is_json


def test_update_conflict_rolls_back(admin_client):
    first = ChallengeFactory(name="first", slug="s1")
    second = ChallengeFactory(name="second", slug="s2")

    resp = admin_client.put(f"{BASE}/challenge/{second.id}", json={"slug": "s1", "name": "renamed"})
    assert resp.status_code == 409

    db.session.expire_all()
    assert db.session.get(Challenge, second.id).slug == "s2"
    assert db.session.get(Challenge, second.id).name == "second"
    assert db.session.get(Challenge, first.id).slug == "s1"


def test_update_rejects_values_the_column_type_refuses(admin_client):
    row = ChallengeFactory(is_active=True)
    resp = admin_client.put(f"{BASE}/challenge/{row.id}", json={"is_active": "maybe"})
    assert resp.status_code == 400
    assert resp.is_json
    db.session.expire_all()
    assert db.session.get(Challenge, row.id).is_active is True


def test_update_ignores_non_column_keys_so_whole_records_round_trip(admin_client):
    user = UserFactory(_username="roundtrip", nickname="Before")
    SkillFactory(user_id=user.id, name="keep me")

    record = admin_client.get(f"{BASE}/user/{user.id}").json["data"]
    record["nickname"] = "After"
    # What the old to_dict-based records carried (relationships, properties, methods)
    record.update(skills=[{"id": 1, "name": "x"}], username="renamed", has_activity=True, generate_slug="boom")

    resp = admin_client.put(f"{BASE}/user/{user.id}", json=record)
    assert resp.status_code == 200
    assert resp.json["data"]["nickname"] == "After"
    assert resp.json["data"]["_username"] == "roundtrip"

    db.session.expire_all()
    fresh = db.session.get(User, user.id)
    assert fresh.nickname == "After"
    assert [s.name for s in fresh.skills] == ["keep me"]
    assert fresh.password_hash == user.password_hash


def test_update_cannot_change_primary_key_or_protected_fields(admin_client):
    user = UserFactory()
    old_hash = user.password_hash
    resp = admin_client.put(
        f"{BASE}/user/{user.id}",
        json={"id": 9999, "password_hash": "hacked", "password": "x", "created_at": "2000-01-01T00:00:00"},
    )
    assert resp.status_code == 200
    db.session.expire_all()
    fresh = db.session.get(User, user.id)
    assert fresh.id == user.id
    assert fresh.password_hash == old_hash
    assert fresh.created_at.year != 2000


def test_update_parses_datetime_strings(admin_client):
    row = MessageFactory()

    # What react-admin's DateTimeInput submits
    resp = admin_client.put(f"{BASE}/message/{row.id}", json={"edited_at": "2024-05-01T10:30"})
    assert resp.status_code == 200
    assert resp.json["data"]["edited_at"] == "2024-05-01T10:30:00"
    db.session.expire_all()
    assert db.session.get(Message, row.id).edited_at == datetime(2024, 5, 1, 10, 30)

    # What a previous GET returned (with seconds and microseconds)
    resp = admin_client.put(f"{BASE}/message/{row.id}", json={"edited_at": "2024-05-02T08:15:30.123456"})
    assert resp.json["data"]["edited_at"] == "2024-05-02T08:15:30.123456"

    # Offsets are normalised to the naive UTC the columns hold
    resp = admin_client.put(f"{BASE}/message/{row.id}", json={"edited_at": "2024-05-03T12:00:00Z"})
    assert resp.json["data"]["edited_at"] == "2024-05-03T12:00:00"
    resp = admin_client.put(f"{BASE}/message/{row.id}", json={"edited_at": "2024-05-03T12:00:00+02:00"})
    assert resp.json["data"]["edited_at"] == "2024-05-03T10:00:00"

    # Clearing the input clears the column
    for cleared in ("", None):
        admin_client.put(f"{BASE}/message/{row.id}", json={"edited_at": "2024-05-01T10:30"})
        resp = admin_client.put(f"{BASE}/message/{row.id}", json={"edited_at": cleared})
        assert resp.status_code == 200
        assert resp.json["data"]["edited_at"] is None


def test_update_parses_date_strings(admin_client):
    user = UserFactory()
    resp = admin_client.put(f"{BASE}/user/{user.id}", json={"last_daily_duck": "2024-05-01"})
    assert resp.status_code == 200
    assert resp.json["data"]["last_daily_duck"] == "2024-05-01"

    resp = admin_client.put(f"{BASE}/user/{user.id}", json={"last_daily_duck": ""})
    assert resp.json["data"]["last_daily_duck"] is None


@pytest.mark.parametrize("value", ["not a date", "2024-13-45", 20240501, True, ["2024-05-01"]])
def test_update_rejects_unparseable_dates(admin_client, value):
    row = MessageFactory()
    resp = admin_client.put(f"{BASE}/message/{row.id}", json={"edited_at": value})
    assert resp.status_code == 400
    assert "edited_at" in resp.json["error"]


def test_create_parses_datetime_strings(admin_client):
    user = UserFactory()
    resp = admin_client.post(
        f"{BASE}/message",
        json={"user_id": user.id, "content": "hi", "message_type": "text", "edited_at": "2024-05-01T10:30"},
    )
    assert resp.status_code == 200
    assert resp.json["data"]["edited_at"] == "2024-05-01T10:30:00"

    bad = admin_client.post(f"{BASE}/message", json={"user_id": user.id, "content": "hi", "edited_at": "soon"})
    assert bad.status_code == 400


def test_json_columns_round_trip(admin_client):
    row = DuckTradeLogFactory(bit_ducks=[1, 2], byte_ducks={"a": 1})
    record = admin_client.get(f"{BASE}/ducktradelog/{row.id}").json["data"]
    assert record["bit_ducks"] == [1, 2]
    assert record["byte_ducks"] == {"a": 1}

    record["bit_ducks"] = [3]
    resp = admin_client.put(f"{BASE}/ducktradelog/{row.id}", json=record)
    assert resp.status_code == 200
    assert resp.json["data"]["bit_ducks"] == [3]
    assert resp.json["data"]["byte_ducks"] == {"a": 1}


@pytest.mark.parametrize(
    "factory, resource",
    [
        (UserFactory, "user"),
        (MessageFactory, "message"),
        (ChallengeFactory, "challenge"),
        (ClassroomFactory, "classroom"),
        (CourseFactory, "course"),
        (DuckTradeLogFactory, "ducktradelog"),
    ],
)
def test_records_round_trip_through_put(admin_client, factory, resource):
    row = factory()
    url = f"{BASE}/{resource}/{row.id}"
    record = admin_client.get(url).json["data"]

    resp = admin_client.put(url, json=record)
    assert resp.status_code == 200, resp.json
    # Read-only columns come back exactly as they were
    assert resp.json["data"] == record


def test_delete_returns_409_when_the_database_refuses(admin_client, monkeypatch):
    row = ChallengeFactory()

    def refuse():
        raise IntegrityError("DELETE", {}, Exception("FOREIGN KEY constraint failed"))

    monkeypatch.setattr(db.session, "commit", refuse)
    resp = admin_client.delete(f"{BASE}/challenge/{row.id}")
    assert resp.status_code == 409
    assert "FOREIGN KEY" in resp.json["error"]


def test_unexpected_database_errors_are_json_500s_and_rolled_back(admin_client, monkeypatch):
    row = ChallengeFactory(name="before")
    rolled_back = []

    def fail():
        raise OperationalError("UPDATE", {}, Exception("database is locked"))

    monkeypatch.setattr(db.session, "commit", fail)
    original_rollback = db.session.rollback
    monkeypatch.setattr(db.session, "rollback", lambda: (rolled_back.append(True), original_rollback()))

    resp = admin_client.put(f"{BASE}/challenge/{row.id}", json={"name": "after"})
    assert resp.status_code == 500
    assert resp.json == {"error": "Database error"}
    assert rolled_back


# --------------------------------------------------------------------------- #
# The react-admin configuration (frontend/src/admin/adminSchema.js) vs the models
# --------------------------------------------------------------------------- #

_ADMIN_SCHEMA_JS = Path(__file__).resolve().parents[4] / "frontend" / "src" / "admin" / "adminSchema.js"

# Plain string columns that hold another table's id by convention, not a real foreign key
_NON_FK_REFERENCES = {"ChallengeLog.course_id"}


def _admin_schema_config():
    if not _ADMIN_SCHEMA_JS.exists():
        pytest.skip("frontend sources are not part of this checkout")
    source = _ADMIN_SCHEMA_JS.read_text(encoding="utf-8")
    overrides = re.findall(
        r'"(\w+)\.(\w+)":\s*\{\s*reference:\s*"(\w+)",\s*displayField:\s*"(\w+)"\s*\}', source
    )
    resources = re.findall(r'^\s+"(\w+)",\s*$', source[source.index("export const RESOURCES"):], re.MULTILINE)
    assert overrides and resources
    return overrides, resources


def test_admin_panel_resources_all_exist():
    _, resources = _admin_schema_config()
    for name in resources:
        assert crud_routes.get_model(name) is not None, f"RESOURCES lists '{name}' but there is no such model"


def test_admin_panel_fk_overrides_match_real_columns():
    overrides, resources = _admin_schema_config()
    for resource, column, reference, display_field in overrides:
        key = f"{resource}.{column}"
        model = crud_routes.get_model(resource)
        assert model is not None, f"{key}: no such model"
        columns = crud_routes._columns(model)
        assert column in columns, f"{key}: no such column"
        if key not in _NON_FK_REFERENCES:
            assert columns[column].foreign_keys, f"{key}: not a foreign key"
        assert resource in resources and reference in resources, f"{key}: resource not in RESOURCES"
        assert display_field in crud_routes._columns(crud_routes.get_model(reference)), (
            f"{key}: '{display_field}' is not a column of {reference} (record keys are column attribute names)"
        )
