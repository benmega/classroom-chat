from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
db = SQLAlchemy()

# Example with threading, which does not require additional installations
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