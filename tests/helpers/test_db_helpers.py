
def test_get_user_by_username(test_app, add_sample_user):
    from application.helpers.db_helpers import get_user_by_username
    add_sample_user('testuser', 'hashed_pwd')
    user = get_user_by_username('testuser')
    assert user is not None
    assert user.username == 'testuser'
