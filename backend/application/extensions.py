"""
File: extensions.py
Type: py
Summary: Flask extension instances (DB, SocketIO, limiter, scheduler).
"""

from flask import session
from flask_apscheduler import APScheduler
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_migrate import Migrate
from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy
from flask_wtf.csrf import CSRFProtect
from sqlalchemy import MetaData


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
