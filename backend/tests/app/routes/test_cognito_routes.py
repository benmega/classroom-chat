import pytest
from unittest.mock import patch, MagicMock
from botocore.exceptions import ClientError
from application.models.user import User

@pytest.fixture
def mock_boto_client():
    with patch("application.routes.cognito_routes.boto3.client") as mock_client:
        client_instance = MagicMock()
        mock_client.return_value = client_instance
        yield client_instance

def test_register_missing_fields(client):
    resp = client.post("/api/auth/cognito/register", json={})
    assert resp.status_code == 400
    assert "Missing email or password" in resp.json["error"]

def test_register_success(client, mock_boto_client):
    mock_boto_client.sign_up.return_value = {}
    resp = client.post("/api/auth/cognito/register", json={"email": "parent@example.com", "password": "Password123!"})
    assert resp.status_code == 200
    assert resp.json["success"] is True

def test_register_client_error(client, mock_boto_client):
    error_response = {'Error': {'Code': 'UsernameExistsException', 'Message': 'User already exists'}}
    mock_boto_client.sign_up.side_effect = ClientError(error_response, "sign_up")
    resp = client.post("/api/auth/cognito/register", json={"email": "parent@example.com", "password": "Password123!"})
    assert resp.status_code == 400
    assert "User already exists" in resp.json["error"]

def test_verify_missing_fields(client):
    resp = client.post("/api/auth/cognito/verify", json={})
    assert resp.status_code == 400

def test_verify_success(client, mock_boto_client):
    mock_boto_client.confirm_sign_up.return_value = {}
    resp = client.post("/api/auth/cognito/verify", json={"email": "parent@example.com", "code": "123456"})
    assert resp.status_code == 200
    assert resp.json["success"] is True

def test_verify_failure(client, mock_boto_client):
    error_response = {'Error': {'Code': 'ExpiredCodeException', 'Message': 'Code expired'}}
    mock_boto_client.confirm_sign_up.side_effect = ClientError(error_response, "confirm_sign_up")
    resp = client.post("/api/auth/cognito/verify", json={"email": "parent@example.com", "code": "123456"})
    assert resp.status_code == 400
    assert "Code expired" in resp.json["error"]

@patch("application.routes.cognito_routes.jwt.get_unverified_claims")
def test_login_success(mock_get_claims, client, mock_boto_client, init_db):
    mock_boto_client.initiate_auth.return_value = {
        'AuthenticationResult': {
            'IdToken': 'dummy_token'
        }
    }
    mock_get_claims.return_value = {
        "sub": "test-sub-123",
        "email": "parent@example.com"
    }
    
    # We should have no user initially
    assert User.query.filter_by(email="parent@example.com").first() is None

    resp = client.post("/api/auth/cognito/login", json={"email": "parent@example.com", "password": "Password123!"})
    assert resp.status_code == 200
    assert resp.json["success"] is True
    assert resp.json["role"] == "parent"

    # Verify user was synced
    user = User.query.filter_by(email="parent@example.com").first()
    assert user is not None
    assert user.cognito_sub == "test-sub-123"

def test_login_failure(client, mock_boto_client):
    error_response = {'Error': {'Code': 'NotAuthorizedException', 'Message': 'Incorrect username or password'}}
    mock_boto_client.initiate_auth.side_effect = ClientError(error_response, "initiate_auth")
    resp = client.post("/api/auth/cognito/login", json={"email": "parent@example.com", "password": "WrongPassword"})
    assert resp.status_code == 401
    assert "Incorrect username or password" in resp.json["error"]

def test_forgot_password_success(client, mock_boto_client):
    mock_boto_client.forgot_password.return_value = {}
    resp = client.post("/api/auth/cognito/forgot-password", json={"email": "parent@example.com"})
    assert resp.status_code == 200
    assert resp.json["success"] is True

def test_confirm_forgot_password_success(client, mock_boto_client):
    mock_boto_client.confirm_forgot_password.return_value = {}
    resp = client.post("/api/auth/cognito/confirm-forgot-password", json={"email": "parent@example.com", "code": "123456", "new_password": "NewPassword123!"})
    assert resp.status_code == 200
    assert resp.json["success"] is True
