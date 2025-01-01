
def test_send_message(test_client, add_sample_user):
    add_sample_user('testuser', 'hashed_pwd')
    response = test_client.post('/message', json={'username': 'testuser', 'message': 'Hello!'})
    assert response.status_code == 200
    assert b'Message sent successfully' in response.data
