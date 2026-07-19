"""
File: main.py
Type: py
Summary: Entry point for starting the Flask application.
"""

import os
import sys

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
        host="0.0.0.0",
        port=port,
        log_output=True,
        use_reloader=os.getenv("FLASK_USE_RELOADER", "True").lower() in ("true", "1", "t") and not getattr(
            sys, "frozen", False
        ),
        allow_unsafe_werkzeug=True,
        debug=debug,
    )


if __name__ == "__main__":
    main()
