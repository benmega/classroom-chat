from application import db
from application.models.message import Message

def test_get_feed_not_logged_in(client, init_db):
    response = client.get("/message/api/feed")
    # Actually wait, url prefix for message is /message, so the route is /message/api/feed
    # Let me check __init__.py. It's app.register_blueprint(message, url_prefix="/message")
    # Yes.
    assert response.status_code == 302 # login redirect
    # Wait, @require_login redirects or returns 401 if it's an API.
    # require_login uses `@login_required` or similar, let's just check redirect

def test_get_feed_admin(client, init_db, sample_user):
    sample_user.is_admin = True
    db.session.commit()
    
    # Create some messages
    msg1 = Message(user_id=sample_user.id, content="msg1", is_global=False)
    msg2 = Message(user_id=sample_user.id, content="msg2", is_global=True)
    db.session.add_all([msg1, msg2])
    db.session.commit()
    
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id
        
    response = client.get("/message/api/feed")
    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True
    assert len(data["messages"]) == 2

def test_get_feed_student(client, init_db, sample_user, sample_classroom):
    # User in a classroom
    sample_user.classrooms.append(sample_classroom)
    db.session.commit()
    
    # Message 1: Global
    msg1 = Message(user_id=sample_user.id, content="global msg", is_global=True)
    
    # Message 2: Targeted to classroom
    msg2 = Message(user_id=sample_user.id, content="classroom msg", is_global=False)
    db.session.add(msg2)
    msg2.target_classrooms.append(sample_classroom)
    
    # Message 3: Invisible
    msg3 = Message(user_id=sample_user.id, content="invisible", is_global=False)
    # wait, authored by user, so it will be visible!
    
    # Let's create another user
    from application.models.user import User
    other_user = User(username="other", role="student")
    other_user.set_password("pass")
    db.session.add(other_user)
    db.session.commit()
    
    msg4 = Message(user_id=other_user.id, content="other invisible", is_global=False)
    
    db.session.add_all([msg1, msg2, msg3, msg4])
    db.session.commit()
    
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id
        
    response = client.get("/message/api/feed")
    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True
    assert len(data["messages"]) == 3
    
    contents = [m["content"] for m in data["messages"]]
    assert "global msg" in contents
    assert "classroom msg" in contents
    assert "invisible" in contents
    assert "other invisible" not in contents
