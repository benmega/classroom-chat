import pytest
from application.models.user import User
from application.extensions import db

@pytest.fixture
def my_logged_in_admin(client, sample_admin):
    with client.session_transaction() as sess:
        # admin_only gets the user by id using session.get("user")
        sess["user"] = sample_admin.id
        sess["_user_id"] = str(sample_admin.id)
    return client

def test_set_drawer_valid(my_logged_in_admin, sample_user):
    res = my_logged_in_admin.post('/api/admin/set_drawer', json={
        "username": sample_user.username,
        "drawer": "A1B2"
    })
    print(f"\n[valid] status: {res.status_code}")
    print(f"[valid] response: {res.get_data(as_text=True)}")
    user = db.session.get(User, sample_user.id)
    print(f"[valid] saved value: {user.drawer}")

def test_set_drawer_too_long(my_logged_in_admin, sample_user):
    res = my_logged_in_admin.post('/api/admin/set_drawer', json={
        "username": sample_user.username,
        "drawer": "A1B2C3D4"
    })
    print(f"\n[>4 chars] status: {res.status_code}")
    print(f"[>4 chars] response: {res.get_data(as_text=True)}")
    user = db.session.get(User, sample_user.id)
    print(f"[>4 chars] saved value: {user.drawer}")

def test_set_drawer_non_hex(my_logged_in_admin, sample_user):
    res = my_logged_in_admin.post('/api/admin/set_drawer', json={
        "username": sample_user.username,
        "drawer": "ZZZZ"
    })
    print(f"\n[non-hex] status: {res.status_code}")
    print(f"[non-hex] response: {res.get_data(as_text=True)}")
    user = db.session.get(User, sample_user.id)
    print(f"[non-hex] saved value: {user.drawer}")
