import pytest
from unittest.mock import patch, MagicMock
from botocore.exceptions import ClientError
from application.models.user import User

@pytest.fixture
def cognito_app(app):
    app.config["COGNITO_CLIENT_ID"] = "test-client-id"
    app.config["COGNITO_CLIENT_SECRET"] = "test-client-secret"
    return app

def test_register_success(client, cognito_app):
    with patch("application.routes.cognito_routes.get_boto_client") as mock_get_client:
        mock_boto = MagicMock()
        mock_get_client.return_value = mock_boto
        
        response = client.post("/api/auth/cognito/register", json={
            "email": "test@example.com",
            "password": "Password123!"
        })
        
        assert response.status_code == 200
        assert response.json["success"] is True
        mock_boto.sign_up.assert_called_once()

def test_register_missing_fields(client):
    response = client.post("/api/auth/cognito/register", json={"email": "test@example.com"})
    assert response.status_code == 400
    assert "Missing email or password" in response.json["error"]

def test_register_client_error(client, cognito_app):
    with patch("application.routes.cognito_routes.get_boto_client") as mock_get_client:
        mock_boto = MagicMock()
        mock_boto.sign_up.side_effect = ClientError(
            {"Error": {"Message": "Username already exists"}},
            "SignUp"
        )
        mock_get_client.return_value = mock_boto
        
        response = client.post("/api/auth/cognito/register", json={
            "email": "test@example.com",
            "password": "Password123!"
        })
        
        assert response.status_code == 400
        assert response.json["error"] == "Username already exists"

def test_verify_success(client, cognito_app):
    with patch("application.routes.cognito_routes.get_boto_client") as mock_get_client:
        mock_boto = MagicMock()
        mock_get_client.return_value = mock_boto
        
        response = client.post("/api/auth/cognito/verify", json={
            "email": "test@example.com",
            "code": "123456"
        })
        
        assert response.status_code == 200
        assert response.json["success"] is True
        mock_boto.confirm_sign_up.assert_called_once()

def test_verify_missing_fields(client):
    response = client.post("/api/auth/cognito/verify", json={"email": "test@example.com"})
    assert response.status_code == 400

def test_verify_client_error(client, cognito_app):
    with patch("application.routes.cognito_routes.get_boto_client") as mock_get_client:
        mock_boto = MagicMock()
        mock_boto.confirm_sign_up.side_effect = ClientError(
            {"Error": {"Message": "Invalid code"}},
            "ConfirmSignUp"
        )
        mock_get_client.return_value = mock_boto
        
        response = client.post("/api/auth/cognito/verify", json={
            "email": "test@example.com",
            "code": "123456"
        })
        
        assert response.status_code == 400
        assert response.json["error"] == "Invalid code"

def test_login_success(client, cognito_app, init_db):
    with patch("application.routes.cognito_routes.get_boto_client") as mock_get_client, \
         patch("application.routes.cognito_routes.jwt.get_unverified_claims") as mock_claims:
        
        mock_boto = MagicMock()
        mock_boto.initiate_auth.return_value = {
            "AuthenticationResult": {"IdToken": "fake-token"}
        }
        mock_get_client.return_value = mock_boto
        
        mock_claims.return_value = {
            "sub": "fake-sub-123",
            "email": "test@example.com"
        }
        
        response = client.post("/api/auth/cognito/login", json={
            "email": "test@example.com",
            "password": "Password123!"
        })
        
        assert response.status_code == 200
        assert response.json["success"] is True
        assert response.json["username"] == "test"
        
        # Verify user created
        user = User.query.filter_by(cognito_sub="fake-sub-123").first()
        assert user is not None
        assert user.email == "test@example.com"

def test_login_missing_fields(client):
    response = client.post("/api/auth/cognito/login", json={"email": "test@example.com"})
    assert response.status_code == 400

def test_login_client_error(client, cognito_app):
    with patch("application.routes.cognito_routes.get_boto_client") as mock_get_client:
        mock_boto = MagicMock()
        mock_boto.initiate_auth.side_effect = ClientError(
            {"Error": {"Message": "NotAuthorizedException"}},
            "InitiateAuth"
        )
        mock_get_client.return_value = mock_boto
        
        response = client.post("/api/auth/cognito/login", json={
            "email": "test@example.com",
            "password": "wrong"
        })
        
        assert response.status_code == 401

def test_forgot_password_success(client, cognito_app):
    with patch("application.routes.cognito_routes.get_boto_client") as mock_get_client:
        mock_boto = MagicMock()
        mock_get_client.return_value = mock_boto
        
        response = client.post("/api/auth/cognito/forgot-password", json={
            "email": "test@example.com"
        })
        
        assert response.status_code == 200
        mock_boto.forgot_password.assert_called_once()

def test_forgot_password_missing_fields(client):
    response = client.post("/api/auth/cognito/forgot-password", json={})
    assert response.status_code == 400

def test_forgot_password_client_error(client, cognito_app):
    with patch("application.routes.cognito_routes.get_boto_client") as mock_get_client:
        mock_boto = MagicMock()
        mock_boto.forgot_password.side_effect = ClientError(
            {"Error": {"Message": "UserNotFoundException"}},
            "ForgotPassword"
        )
        mock_get_client.return_value = mock_boto
        
        response = client.post("/api/auth/cognito/forgot-password", json={
            "email": "test@example.com"
        })
        
        assert response.status_code == 400

def test_confirm_forgot_password_success(client, cognito_app):
    with patch("application.routes.cognito_routes.get_boto_client") as mock_get_client:
        mock_boto = MagicMock()
        mock_get_client.return_value = mock_boto
        
        response = client.post("/api/auth/cognito/confirm-forgot-password", json={
            "email": "test@example.com",
            "code": "123456",
            "new_password": "NewPassword123!"
        })
        
        assert response.status_code == 200
        mock_boto.confirm_forgot_password.assert_called_once()

def test_confirm_forgot_password_missing_fields(client):
    response = client.post("/api/auth/cognito/confirm-forgot-password", json={
        "email": "test@example.com"
    })
    assert response.status_code == 400

def test_confirm_forgot_password_client_error(client, cognito_app):
    with patch("application.routes.cognito_routes.get_boto_client") as mock_get_client:
        mock_boto = MagicMock()
        mock_boto.confirm_forgot_password.side_effect = ClientError(
            {"Error": {"Message": "CodeMismatchException"}},
            "ConfirmForgotPassword"
        )
        mock_get_client.return_value = mock_boto
        
        response = client.post("/api/auth/cognito/confirm-forgot-password", json={
            "email": "test@example.com",
            "code": "123456",
            "new_password": "NewPassword123!"
        })
        
        assert response.status_code == 400

def test_sync_cognito_user_existing_email(client, init_db):
    user = User(username="existing", email="test_sync@example.com", role="student")
    user.set_password("pass")
    from application.extensions import db
    db.session.add(user)
    db.session.commit()
    
    from application.routes.cognito_routes import sync_cognito_user
    synced_user = sync_cognito_user("test_sync@example.com", "new-sub-123")
    
    assert synced_user.id == user.id
    assert synced_user.cognito_sub == "new-sub-123"

def test_sync_cognito_user_duplicate_username(client, init_db):
    user = User(username="test", email="other@example.com", role="student")
    user.set_password("pass")
    from application.extensions import db
    db.session.add(user)
    db.session.commit()
    
    from application.routes.cognito_routes import sync_cognito_user
    synced_user = sync_cognito_user("test@example.com", "sub-456")
    
    assert synced_user.username == "test1"

def test_no_client_secret(client, app):
    app.config["COGNITO_CLIENT_SECRET"] = None
    with patch("application.routes.cognito_routes.get_boto_client") as mock_get_client:
        mock_boto = MagicMock()
        mock_get_client.return_value = mock_boto
        
        response = client.post("/api/auth/cognito/register", json={
            "email": "test2@example.com",
            "password": "Password123!"
        })
        assert response.status_code == 200
        args, kwargs = mock_boto.sign_up.call_args
        assert "SecretHash" not in kwargs

def test_get_boto_client(app):
    with app.app_context():
        from application.routes.cognito_routes import get_boto_client
        client = get_boto_client()
        assert client is not None
