"""
File: test_server_info_routes.py
Type: py
Summary: /server/health checks the database and the migration head, /server/live checks nothing.
"""

from unittest.mock import patch

import pytest
from application.extensions import db
from application.routes import server_info_routes
from application.routes.server_info_routes import VERSION_TABLE, migration_heads
from sqlalchemy import text
from sqlalchemy.exc import OperationalError


@pytest.fixture
def stamp(init_db):
    """Create the alembic_version table with the given revisions; the table is dropped afterwards.

    The tables in the metadata are rebuilt for every test, this one is not among them.
    """

    def _stamp(*revisions):
        db.session.execute(text(f"CREATE TABLE IF NOT EXISTS {VERSION_TABLE} (version_num VARCHAR(32) NOT NULL PRIMARY KEY)"))
        db.session.execute(text(f"DELETE FROM {VERSION_TABLE}"))
        for revision in revisions:
            db.session.execute(text(f"INSERT INTO {VERSION_TABLE} VALUES (:revision)"), {"revision": revision})
        db.session.commit()

    yield _stamp
    db.session.rollback()
    db.session.execute(text(f"DROP TABLE IF EXISTS {VERSION_TABLE}"))
    db.session.commit()


def test_server_info_routes(client):
    resp = client.get("/server/health")
    assert resp.status_code == 200
    assert resp.get_json()["status"] == "ok"

    # The host-IP endpoint was removed; it must not come back unauthenticated
    resp = client.get("/server/ip")
    assert resp.status_code == 404


def test_health_lists_the_checks_of_a_create_all_database(client):
    """The test database has no alembic_version table, like a development one built by create_all."""
    resp = client.get("/server/health")

    assert resp.status_code == 200
    body = resp.get_json()
    assert body["status"] == "ok"
    assert body["checks"]["database"] == {"ok": True}
    assert body["checks"]["migrations"]["ok"] is True
    assert "built from the models" in body["checks"]["migrations"]["detail"]


def test_health_is_healthy_when_the_database_is_at_the_migration_head(client, stamp):
    stamp(*migration_heads())

    resp = client.get("/server/health")

    assert resp.status_code == 200
    assert resp.get_json()["checks"]["migrations"] == {"ok": True, "detail": "the database is at the migration head"}


def test_health_is_503_when_the_database_is_behind_the_migration_head(client, stamp, caplog):
    stamp("0123456789ab")

    with caplog.at_level("ERROR", logger="application.routes.server_info_routes"):
        resp = client.get("/server/health")

    assert resp.status_code == 503
    body = resp.get_json()
    assert body["status"] == "unhealthy"
    assert body["failed"] == ["migrations"]
    assert body["checks"]["database"] == {"ok": True}
    assert body["checks"]["migrations"]["ok"] is False
    assert "not at the migration head" in body["checks"]["migrations"]["detail"]
    # The revisions go to the log, not to the public response
    assert "0123456789ab" not in resp.get_data(as_text=True)
    assert "0123456789ab" in caplog.text
    assert next(iter(migration_heads())) in caplog.text


def test_health_is_503_for_an_empty_version_table(client, stamp):
    stamp()

    resp = client.get("/server/health")

    assert resp.status_code == 503
    assert resp.get_json()["failed"] == ["migrations"]


def test_health_is_503_when_the_database_sits_at_one_of_two_heads(client, stamp, monkeypatch):
    monkeypatch.setattr(server_info_routes, "_migration_heads", frozenset({"aaaaaaaaaaaa", "bbbbbbbbbbbb"}))
    stamp("aaaaaaaaaaaa")

    assert client.get("/server/health").status_code == 503

    stamp("aaaaaaaaaaaa", "bbbbbbbbbbbb")
    assert client.get("/server/health").status_code == 200


def test_health_in_production_is_503_for_a_database_with_no_version_table(client, test_app):
    """Production schemas are built by Alembic and stamped: no stamp means the deploy never finished."""
    test_app.config["HEALTH_REQUIRES_MIGRATION_STAMP"] = True

    resp = client.get("/server/health")

    assert resp.status_code == 503
    body = resp.get_json()
    assert body["failed"] == ["migrations"]
    assert VERSION_TABLE in body["checks"]["migrations"]["detail"]
    assert body["checks"]["database"] == {"ok": True}


def test_health_in_production_is_healthy_once_the_schema_is_stamped(client, test_app, stamp):
    test_app.config["HEALTH_REQUIRES_MIGRATION_STAMP"] = True
    stamp(*migration_heads())

    assert client.get("/server/health").status_code == 200


def test_health_is_503_naming_the_database_when_it_does_not_answer(client, caplog):
    failure = OperationalError("SELECT 1", {}, Exception("unable to open database file: /srv/secret/path.db"))

    with patch.object(db.engine, "connect", side_effect=failure):
        with caplog.at_level("ERROR", logger="application.routes.server_info_routes"):
            resp = client.get("/server/health")

    assert resp.status_code == 503
    body = resp.get_json()
    assert body["failed"] == ["database"]
    assert body["checks"] == {"database": {"ok": False, "detail": "the database did not answer"}}
    # What the database said is logged, never sent to the caller
    assert "/srv/secret/path.db" not in resp.get_data(as_text=True)
    assert "unable to open database file" in caplog.text


def test_health_is_503_when_select_1_fails(client):
    class BrokenConnection:
        def __enter__(self):
            return self

        def __exit__(self, *exc_info):
            return False

        def execute(self, statement, *args, **kwargs):
            raise OperationalError("SELECT 1", {}, Exception("database is locked"))

    with patch.object(db.engine, "connect", return_value=BrokenConnection()):
        resp = client.get("/server/health")

    assert resp.status_code == 503
    assert resp.get_json()["failed"] == ["database"]


def test_health_is_503_when_the_migration_scripts_cannot_be_read(client, caplog):
    with patch.object(server_info_routes, "migration_heads", side_effect=RuntimeError("no scripts")):
        with caplog.at_level("ERROR", logger="application.routes.server_info_routes"):
            resp = client.get("/server/health")

    assert resp.status_code == 503
    body = resp.get_json()
    assert body["failed"] == ["migrations"]
    assert body["checks"]["database"] == {"ok": True}
    assert "no scripts" in caplog.text


def test_the_migration_head_is_read_once(monkeypatch):
    monkeypatch.setattr(server_info_routes, "_migration_heads", None)

    with patch.object(server_info_routes, "ScriptDirectory") as script_directory:
        script_directory.return_value.get_heads.return_value = ["abc123def456"]
        first = migration_heads()
        second = migration_heads()

    assert first == second == frozenset({"abc123def456"})
    script_directory.assert_called_once()


def test_the_migration_scripts_have_exactly_one_head(monkeypatch):
    monkeypatch.setattr(server_info_routes, "_migration_heads", None)

    assert len(migration_heads()) == 1


@pytest.mark.parametrize("url", ["/server/health", "/server/live"])
def test_the_probes_are_not_rate_limited(rate_limited_app, url):
    """Route 53 and the deploy gate poll these; the default limit is 50 per second."""
    client = rate_limited_app.test_client()

    assert {client.get(url).status_code for _ in range(60)} == {200}


def test_live_answers_without_touching_the_database(client):
    with patch.object(db.engine, "connect", side_effect=AssertionError("liveness must not query")):
        resp = client.get("/server/live")

    assert resp.status_code == 200
    assert resp.data == b"SystemHealthy"
