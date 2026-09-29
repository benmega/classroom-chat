"""
File: test_message_sending.py
Summary: Tests for the single message-sending path (message_service) and the
         Socket.IO 'send_message' handler that uses it.
"""

from datetime import datetime, timedelta

import pytest

from application import db
from application.constants import GLOBAL_CLASSROOM_ID
from application.extensions import socketio
from application.models.banned_words import BannedWords
from application.models.classroom import Classroom
from application.models.configuration import Configuration
from application.models.conversation import Conversation
from application.models.message import Message
from application.models.user import User
from application.services import message_service
from application.services.message_service import (
    MessageRejected,
    validate_and_save_message,
)


@pytest.fixture(autouse=True)
def _reset_limits():
    message_service.reset_rate_limits()
    yield
    message_service.reset_rate_limits()


def _config(enabled=True):
    cfg = Configuration.query.first()
    if cfg is None:
        cfg = Configuration(ai_teacher_enabled=False)
        db.session.add(cfg)
    cfg.message_sending_enabled = enabled
    db.session.commit()
    return cfg


def _classroom_conv(user=None, **conv_kwargs):
    classroom = Classroom(
        id="msg-class", name="Msg Class", language="python", url="http://test"
    )
    db.session.add(classroom)
    if user is not None:
        classroom.users.append(db.session.get(User, user.id))
    conv = Conversation(title="T", classroom_id="msg-class", **conv_kwargs)
    db.session.add(conv)
    db.session.commit()
    return conv


def _reason(user, conv_id, content):
    with pytest.raises(MessageRejected) as exc:
        validate_and_save_message(user, conv_id, content)
    return exc.value.reason


# ---------------------------- service ---------------------------------------


def test_service_saves_for_enrolled_student(init_db, sample_user):
    _config(True)
    conv = _classroom_conv(sample_user)
    result = validate_and_save_message(sample_user, conv.id, "hello")
    assert result["message"].content == "hello"
    assert result["classroom_id"] == "msg-class"


def test_service_blocks_students_when_sending_disabled(init_db, sample_user):
    _config(False)
    conv = _classroom_conv(sample_user)
    assert "disabled" in _reason(sample_user, conv.id, "hello")


def test_service_missing_config_row_allows_sending(
    init_db, sample_user, sample_admin
):
    Configuration.query.delete()
    db.session.commit()
    conv = _classroom_conv(sample_user)
    assert validate_and_save_message(sample_user, conv.id, "hello")["message"].content == "hello"
    result = validate_and_save_message(sample_admin, conv.id, "hi")
    assert result["message"].content == "hi"


def test_service_admin_exempt_from_disabled_lock_and_slow_mode(init_db, sample_admin):
    _config(False)
    conv = _classroom_conv(None, is_locked=True, slow_mode_delay=60)
    validate_and_save_message(sample_admin, conv.id, "one")
    validate_and_save_message(sample_admin, conv.id, "two")


def test_service_locked_conversation(init_db, sample_user):
    _config(True)
    conv = _classroom_conv(sample_user, is_locked=True)
    assert "locked" in _reason(sample_user, conv.id, "hello")


def test_service_slow_mode(init_db, sample_user):
    _config(True)
    conv = _classroom_conv(sample_user, slow_mode_delay=30)
    validate_and_save_message(sample_user, conv.id, "first")
    assert "Slow mode" in _reason(sample_user, conv.id, "second")
    # Once the delay has passed, sending works again
    msg = Message.query.filter_by(conversation_id=conv.id).first()
    msg.created_at = datetime.utcnow() - timedelta(seconds=60)
    db.session.commit()
    validate_and_save_message(sample_user, conv.id, "third")


def test_service_banned_word_and_inactive_flag(init_db, sample_user):
    _config(True)
    conv = _classroom_conv(sample_user)
    word = BannedWords(word="badword")
    db.session.add(word)
    db.session.commit()
    assert "Inappropriate" in _reason(sample_user, conv.id, "this is a BadWord")
    word.active = False
    db.session.commit()
    validate_and_save_message(sample_user, conv.id, "this is a badword")


def test_service_not_enrolled_and_global_rules(init_db, sample_user):
    _config(True)
    conv = _classroom_conv(None)  # user not enrolled
    assert "not enrolled" in _reason(sample_user, conv.id, "hello")

    db.session.add(
        Classroom(id=GLOBAL_CLASSROOM_ID, name="G", language="python", url="http://t")
    )
    gconv = Conversation(title="G", classroom_id=GLOBAL_CLASSROOM_ID)
    db.session.add(gconv)
    db.session.commit()
    assert "instructors" in _reason(sample_user, gconv.id, "hello")


def test_service_payload_validation(init_db, sample_user):
    _config(True)
    conv = _classroom_conv(sample_user)
    assert _reason(sample_user, conv.id, "   ")
    assert _reason(sample_user, conv.id, None)
    assert "too long" in _reason(sample_user, conv.id, "x" * 5000)
    assert _reason(sample_user, None, "hi")
    assert "not found" in _reason(sample_user, 99999, "hi")


def test_service_rate_limit(init_db, sample_user):
    _config(True)
    conv = _classroom_conv(sample_user)
    for i in range(message_service.RATE_LIMIT_MAX):
        validate_and_save_message(sample_user, conv.id, f"m{i}")
    assert "too quickly" in _reason(sample_user, conv.id, "one more")


# ---------------------------- socket handler --------------------------------


def _socket_client(app, client, user):
    with client.session_transaction() as sess:
        sess["user"] = user.id
    sio = socketio.test_client(app, flask_test_client=client)
    assert sio.is_connected()
    sio.get_received()  # drop connect-time events
    return sio


def _events(sio, name):
    return [e for e in sio.get_received() if e["name"] == name]


def test_socket_send_message_success(test_app, client, init_db, sample_user):
    _config(True)
    conv = _classroom_conv(sample_user)
    sio = _socket_client(test_app, client, sample_user)
    sio.emit("send_message", {"content": "hello", "conversation_id": conv.id})
    received = sio.get_received()
    msgs = [e for e in received if e["name"] == "message_received"]
    assert len(msgs) == 1
    payload = msgs[0]["args"][0]
    assert payload["content"] == "hello"
    assert payload["conversation_id"] == conv.id
    assert payload["timestamp"] == Message.query.one().created_at.isoformat()
    assert not [e for e in received if e["name"] == "message_error"]


def test_socket_rejections_emit_message_error(test_app, client, init_db, sample_user):
    cfg = _config(False)
    conv = _classroom_conv(sample_user)
    sio = _socket_client(test_app, client, sample_user)

    sio.emit("send_message", {"content": "hello", "conversation_id": conv.id})
    errs = _events(sio, "message_error")
    assert len(errs) == 1 and "disabled" in errs[0]["args"][0]["error"]

    cfg.message_sending_enabled = True
    conv.is_locked = True
    db.session.commit()
    sio.emit("send_message", {"content": "hello", "conversation_id": conv.id})
    errs = _events(sio, "message_error")
    assert len(errs) == 1 and "locked" in errs[0]["args"][0]["error"]

    sio.emit("send_message", "not-a-dict")
    errs = _events(sio, "message_error")
    assert len(errs) == 1
    assert Message.query.count() == 0


def test_socket_admin_exempt_when_disabled(test_app, client, init_db, sample_admin):
    _config(False)
    conv = _classroom_conv(None, is_locked=True)
    sio = _socket_client(test_app, client, sample_admin)
    sio.emit("send_message", {"content": "admin msg", "conversation_id": conv.id})
    assert not _events(sio, "message_error")
    assert Message.query.one().content == "admin msg"
