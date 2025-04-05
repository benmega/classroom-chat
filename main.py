from application import create_app
from application.extensions import socketio

app = create_app()



if __name__ == '__main__':
    socketio.run(app,
                 host='127.0.0.1',  #  previously 0.0.0.0 allows the server to be accessible network-wide
                 port=5000,       # previously 5000. TODO altert students!! Sets the port the application will listen on
                 log_output=True, # Enables or disables the logging output by the server
                 use_reloader=True, # Enable or disable the reloader
                 allow_unsafe_werkzeug=True,
                 debug=False)      # Toggle debug mode for Flask and SocketIO
