from application.extensions import socketio
from application.models.message import Message

def test_socket_unauthenticated_connection(app):
    # Unauthenticated connection should be rejected
    flask_client = app.test_client()
    socket_client = socketio.test_client(app, flask_test_client=flask_client)
    assert not socket_client.is_connected()

def test_socket_flow(app, sample_user, init_db):
    flask_client = app.test_client()
    with flask_client.session_transaction() as sess:
        sess["user"] = sample_user.id
        sess["_user_id"] = str(sample_user.id)

    # 1. Connect
    socket_client = socketio.test_client(app, flask_test_client=flask_client)
    assert socket_client.is_connected()

    # 2. Emit send_message
    socket_client.emit("send_message", {
        "content": "Hello Socket World!",
        "is_global": True
    })

    # Read received messages
    received = socket_client.get_received()
    # Check that we received "user_status_change" on connect or "message_received"
    event_names = [event["name"] for event in received]
    assert "user_status_change" in event_names or "message_received" in event_names

    # Check database to see if message was saved
    msg = Message.query.filter_by(content="Hello Socket World!").first()
    assert msg is not None

    # 3. Disconnect
    socket_client.disconnect()
