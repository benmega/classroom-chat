"""
File: extensions.py
Type: py
Summary: Flask extension instances (DB, SocketIO, limiter, scheduler).
"""

from flask_apscheduler import APScheduler
# import engineio.async_drivers.threading
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy

scheduler = APScheduler()
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[
        "50 per second",
        "500 per minute",
        "2000 per hour",
        "20000 per day",
    ],
)
db = SQLAlchemy()

socketio = SocketIO(async_mode="threading")
