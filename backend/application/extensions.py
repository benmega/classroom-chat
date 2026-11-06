

import logging
import sqlite3

from flask import session
from flask_apscheduler import APScheduler
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_migrate import Migrate
from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy
from flask_wtf.csrf import CSRFProtect
from sqlalchemy import MetaData, event
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)

# Settings every SQLite connection gets, in the order they are applied (add another
# pragma here and every connection picks it up). The listener below applies them.
#
# * busy_timeout first, so the journal_mode change that follows waits for a lock
#   instead of failing at once. It is also shorter than pysqlite's default of 5 s:
#   SQLite waits for a lock in C, which cannot yield to gevent, so while one request
#   waits the whole single-worker process stands still.
# * journal_mode=WAL lets readers and the writer work side by side (a reader no
#   longer blocks a commit). The mode is stored in the database file, and an
#   in-memory database answers "memory", which is fine.
# * synchronous=NORMAL is the usual companion of WAL: a commit no longer waits for
#   the disk, and a power cut can lose the last commits but never corrupt the file.
SQLITE_PRAGMAS = (
    ("busy_timeout", 2000),
    ("journal_mode", "WAL"),
    ("synchronous", "NORMAL"),
)


def apply_sqlite_pragmas(dbapi_connection, connection_record):
    """SQLAlchemy "connect" listener: set SQLITE_PRAGMAS on every new SQLite connection."""
    if not isinstance(dbapi_connection, sqlite3.Connection):
        return
    cursor = dbapi_connection.cursor()
    try:
        for name, value in SQLITE_PRAGMAS:
            try:
                cursor.execute(f"PRAGMA {name}={value}")
                row = cursor.fetchone()
            except sqlite3.Error:
                # A failed journal_mode switch (another process holds the file open
                # mid-write) must not stop the connection: the next one tries again.
                logger.warning("Could not set PRAGMA %s=%s", name, value, exc_info=True)
                continue
            if name == "journal_mode" and row and str(row[0]).lower() not in (str(value).lower(), "memory"):
                logger.warning("SQLite stays in journal_mode=%s (wanted %s)", row[0], value)
    finally:
        cursor.close()


# A class-level listener reaches every engine, including the ones Alembic and the
# tests create. The guard keeps a reloaded module from registering it twice.
if not event.contains(Engine, "connect", apply_sqlite_pragmas):
    event.listen(Engine, "connect", apply_sqlite_pragmas)


def rate_limit_key():
    """Bucket logged-in requests per user and everything else per client address.

    Keying by address alone makes a whole classroom behind one NAT share one
    bucket. Login, signup and the other anonymous routes stay keyed by address.
    """
    user_id = session.get("user")
    return f"user:{user_id}" if user_id else get_remote_address()


scheduler = APScheduler()
csrf = CSRFProtect()
limiter = Limiter(
    key_func=rate_limit_key,
    default_limits=[
        "50 per second",
        "500 per minute",
        "2000 per hour",
        "20000 per day",
    ],
)
# Define a naming convention for constraints to make migrations on SQLite easier
convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}
metadata = MetaData(naming_convention=convention)

db = SQLAlchemy(metadata=metadata)
migrate = Migrate(render_as_batch=True)

socketio = SocketIO()
