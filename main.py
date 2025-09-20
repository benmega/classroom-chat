import sys

from application import create_app
from application.extensions import socketio

app = create_app()

def main():
    socketio.run(app,
                 host='0.0.0.0',  # 0.0.0.0 allows the server to be accessible network-wide
                 port=7000,
                 log_output=True,  # Enables or disables the logging output by the server
                 use_reloader=not getattr(sys, 'frozen', False),  # Enable or disable the reloader
                 allow_unsafe_werkzeug=True,
                 debug=False)  # Toggle debug mode for Flask and SocketIO

if __name__ == '__main__':
    main()