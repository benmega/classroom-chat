import pytest
from flask import url_for

# Test the index route
def test_index_route(client, test_app):
    with test_app.app_context():
        response = client.get(url_for('duck_trade_bp.index'))
        assert response.status_code == 200
        assert b'Welcome to the bit_Pond' in response.data

# Test submitting a valid trade
def test_submit_trade_valid(client, sample_user_with_ducks):
    with client.session_transaction() as sess:
        sess['user'] = sample_user_with_ducks.username  # Set the session user

    response = client.post(url_for('duck_trade_bp.submit_trade'), data={
        'digital_ducks': 3,
        'duck_type': 'bit',
        'duck_0': 1,
        'duck_1': 1,
        'duck_2': 0,
        'duck_3': 0,
        'duck_4': 0,
        'duck_5': 0,
        'duck_6': 0
    })

    assert response.status_code == 200
    assert response.json['status'] == 'success'

# Test submitting a trade with insufficient ducks
def test_submit_trade_insufficient_ducks(client, sample_user_with_few_ducks):
    response = client.post(url_for('duck_trade_bp.submit_trade'), data={
        'digital_ducks': 50,
        'duck_type': 'bit',
        'duck_0': 1,
        'duck_1': 1,
        'duck_2': 0,
        'duck_3': 0,
        'duck_4': 0,
        'duck_5': 0,
        'duck_6': 0
    })
    assert response.status_code == 400
    assert response.json['status'] == 'failure'

# Test the bit shift get route
def test_bit_shift_get(client):
    response = client.get(url_for('duck_trade_bp.bit_shift'))
    assert response.status_code == 200
    assert b'Bit Shift Trade' in response.data

# Test updating the trade status
def test_update_trade_status_valid(client, sample_trade):
    response = client.post(url_for('duck_trade_bp.update_trade_status'), json={
        'trade_id': sample_trade.id,
        'status': 'completed'
    })
    assert response.status_code == 200
    assert response.json['status'] == 'success'

# Test trade logs
def test_trade_logs(client, sample_trade):
    response = client.get(url_for('duck_trade_bp.trade_logs'))
    assert response.status_code == 200
    assert b'Trade Logs' in response.data
