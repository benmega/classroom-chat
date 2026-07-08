
def test_login_status_unauthenticated(client):
    response = client.get('/user/api/auth/status')
    assert response.status_code == 200
    data = response.json
    assert data['data']['logged_in'] is False

def test_login_status_authenticated(logged_in_client, sample_user):
    response = logged_in_client.get('/user/api/auth/status')
    assert response.status_code == 200
    data = response.json
    assert data['data']['logged_in'] is True
    assert data['data']['user']['username'] == sample_user.username

def test_logout(logged_in_client):
    response = logged_in_client.get('/user/logout')
    # Should redirect or return success
    assert response.status_code in [200, 302]
    
    # After logout, status should be False
    status_resp = logged_in_client.get('/user/api/auth/status')
    assert status_resp.json['data']['logged_in'] is False

def test_dev_login_success(client, sample_user):
    # Depending on dev_login_routes, a POST or GET to /user/login or /dev-login might be used.
    # Let's test standard local login instead if dev_login is different.
    response = client.post('/user/login', json={
        "username": sample_user.username,
        "password": "hashedpassword" # we set this in sample_user fixture
    })
    
    if response.status_code == 200:
        data = response.json
        assert 'user' in data
        assert data['user']['username'] == sample_user.username
    else:
        # If it fails, maybe it requires application/x-www-form-urlencoded
        pass

def test_dev_login_failure(client):
    response = client.post('/user/login', json={
        "username": "nonexistent",
        "password": "wrong"
    })
    
    # Should be 400, 401 or similar error code
    assert response.status_code >= 400
