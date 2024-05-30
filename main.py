from application import create_app
from application.extensions import socketio

app = create_app()

if __name__ == '__main__':
    # app.run(debug=True, host='0.0.0.0')
    socketio.run(app, host='0.0.0.0', port=5000) #, debug=True)
