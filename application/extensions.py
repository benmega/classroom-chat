from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO
# import engineio.async_drivers.threading
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_apscheduler import APScheduler

scheduler = APScheduler()
limiter = Limiter(key_func=get_remote_address,
                  default_limits=[
                      "3 per second",
                      "10 per minute",
                      "200 per hour",  # ≈3 messages/minute sustained
                      "2000 per day"  # ≈20 messages/hour averaged over 24 h
                  ])
db = SQLAlchemy()

socketio = SocketIO(async_mode='threading')

# If you want to use eventlet or gevent, you first need to install them:
# pip install eventlet
# or
# pip install gevent
# And then initialize SocketIO as follows:
# socketio = SocketIO(async_mode='eventlet')
# or
# socketio = SocketIO(async_mode='gevent')
#cd C:\Users\Ben\PycharmProjects\groupChat2\dist\ClassroomChat

# pyinstaller --onefile --add-data "templates;templates" --add-data "static;static" --add-data "license;license" main.py