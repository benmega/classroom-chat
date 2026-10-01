"""Tests for backend/tools/migrate_classroom.py (runs against the test database)."""

from datetime import datetime, timedelta, timezone

import pytest
from application.extensions import db
from sqlalchemy import text
from sqlalchemy.engine import Engine
from tests.factories import ClassroomFactory, UserFactory
from tools import migrate_classroom


@pytest.fixture
def run_migration(monkeypatch, test_app):
    """Run the script against the test app and record every connection it opens."""
    import application

    monkeypatch.setattr(application, "create_app", lambda: test_app)
    connections = []
    real_connect = Engine.connect

    def spy_connect(self, *args, **kwargs):
        conn = real_connect(self, *args, **kwargs)
        connections.append(conn)
        return conn

    # Release the fixture session's connection so the script can write to the same file
    db.session.commit()
    db.session.remove()
    monkeypatch.setattr(Engine, "connect", spy_connect)

    def _run():
        migrate_classroom.run()

    _run.connections = connections
    return _run


def test_connection_is_closed_after_a_successful_run(run_migration):
    run_migration()

    assert run_migration.connections
    assert all(conn.closed for conn in run_migration.connections)


def test_connection_is_closed_when_a_step_raises(run_migration, monkeypatch):
    real_text = migrate_classroom.text
    calls = []

    def flaky_text(sql):
        calls.append(sql)
        if len(calls) == 3:
            raise RuntimeError("boom")
        return real_text(sql)

    monkeypatch.setattr(migrate_classroom, "text", flaky_text)

    with pytest.raises(RuntimeError, match="boom"):
        run_migration()

    assert run_migration.connections
    assert all(conn.closed for conn in run_migration.connections)


def test_timestamps_written_by_the_script_are_naive_utc(monkeypatch, test_app):
    """Covers the legacy users.classroom_id backfill and the global conversation seed."""
    import application

    user = UserFactory()
    classroom = ClassroomFactory()
    user_id, classroom_id = user.id, classroom.id
    db.session.execute(text("ALTER TABLE users ADD COLUMN classroom_id VARCHAR(50)"))
    db.session.execute(
        text("UPDATE users SET classroom_id = :cid WHERE id = :uid"),
        {"cid": classroom_id, "uid": user_id},
    )
    db.session.execute(
        text(
            "CREATE TABLE conversations (id INTEGER PRIMARY KEY AUTOINCREMENT, title VARCHAR(100), "
            "classroom_id VARCHAR(50), is_locked BOOLEAN, slow_mode_delay INTEGER, created_at DATETIME)"
        )
    )
    db.session.commit()
    db.session.remove()
    monkeypatch.setattr(application, "create_app", lambda: test_app)
    monkeypatch.setattr("application.constants.GLOBAL_CONVERSATION_ID", None, raising=False)

    started = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(seconds=2)
    try:
        migrate_classroom.run()
        finished = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(seconds=2)

        enrolled_at = db.session.execute(
            text("SELECT enrolled_at FROM user_classrooms WHERE user_id = :uid AND classroom_id = :cid"),
            {"uid": user_id, "cid": classroom_id},
        ).scalar()
        created_at = db.session.execute(
            text("SELECT created_at FROM conversations WHERE classroom_id = 'global'")
        ).scalar()
    finally:
        db.session.remove()
        with db.engine.begin() as conn:
            conn.execute(text("DROP TABLE conversations"))

    for stamp in (enrolled_at, created_at):
        parsed = datetime.fromisoformat(stamp)
        assert parsed.tzinfo is None
        assert started <= parsed <= finished
