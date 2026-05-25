"""
File: main.py
Type: py
Summary: Entry point for starting the Flask application.
"""

import os
import sys

# Ensure backend directory is in sys.path so we can import application modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Monkey patch for gevent if it's the selected async mode
if os.getenv("SOCKETIO_ASYNC_MODE", "gevent") == "gevent":
    from gevent import monkey
    monkey.patch_all()

from application import create_app
from application.extensions import socketio


app = create_app()


def main():
    # Load configuration from environment variables with safe defaults
    port = int(os.getenv("PORT", 8000))
    debug = os.getenv("FLASK_DEBUG", "True").lower() in ("true", "1", "t")
    
    socketio.run(
        app,
        host="0.0.0.0",  # 0.0.0.0 allows the server to be accessible network-wide
        port=port,
        log_output=True,  # Enables or disables the logging output by the server
        use_reloader=not getattr(
            sys, "frozen", False
        ),  # Enable or disable the reloader
        allow_unsafe_werkzeug=True,
        debug=debug,
    )  # Toggle debug mode for Flask and SocketIO


if __name__ == "__main__":
    main()
