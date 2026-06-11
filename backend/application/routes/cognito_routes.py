"""
File: cognito_routes.py
Type: py
Summary: Flask routes for AWS Cognito authentication using Boto3 (Custom UI).
"""
import hmac
import hashlib
import base64
import boto3
from botocore.exceptions import ClientError
from flask import Blueprint, request, jsonify, session, current_app
from jose import jwt

from application.extensions import db
from application.models.user import User
from application.models.session_log import SessionLog

cognito_bp = Blueprint("cognito", __name__)

def get_boto_client():
    region = current_app.config.get("COGNITO_REGION", "us-east-1")
    return boto3.client("cognito-idp", region_name=region)

def get_secret_hash(username):
    client_id = current_app.config.get("COGNITO_CLIENT_ID")
    client_secret = current_app.config.get("COGNITO_CLIENT_SECRET")
    if not client_secret:
        return None
    message = bytes(username + client_id, 'utf-8')
    key = bytes(client_secret, 'utf-8')
    return base64.b64encode(hmac.new(key, message, digestmod=hashlib.sha256).digest()).decode()

def sync_cognito_user(email, cognito_sub):
    """Ensure the user exists in our local database."""
    user = User.query.filter_by(cognito_sub=cognito_sub).first()
    if not user:
        user = User.query.filter_by(email=email).first()
        if user:
            user.cognito_sub = cognito_sub
        else:
            base_username = email.split('@')[0]
            username = base_username
            counter = 1
            while User.query.filter_by(username=username).first():
                username = f"{base_username}{counter}"
                counter += 1
                
            user = User(
                username=username,
                email=email,
                cognito_sub=cognito_sub,
                role="parent",
                is_approved=True
            )
            user.set_password(f"cognito_{cognito_sub}")
            db.session.add(user)
        db.session.commit()
    return user

@cognito_bp.route("/register", methods=["POST"])
def register():
    data = request.json
    email = data.get("email")
    password = data.get("password")
    
    if not email or not password:
        return jsonify({"error": "Missing email or password"}), 400
        
    client_id = current_app.config.get("COGNITO_CLIENT_ID")
    if not client_id:
        current_app.logger.error("COGNITO_CLIENT_ID is not configured")
        return jsonify({"error": "Cognito is not configured on this server"}), 503

    client = get_boto_client()
    kwargs = {
        "ClientId": client_id,
        "Username": email,
        "Password": password,
        "UserAttributes": [{"Name": "email", "Value": email}]
    }
    
    secret_hash = get_secret_hash(email)
    if secret_hash:
        kwargs["SecretHash"] = secret_hash
        
    try:
        client.sign_up(**kwargs)
        return jsonify({"success": True, "message": "Verification code sent to email"})
    except ClientError as e:
        return jsonify({"error": e.response['Error']['Message']}), 400

@cognito_bp.route("/verify", methods=["POST"])
def verify():
    data = request.json
    email = data.get("email")
    code = data.get("code")
    
    if not email or not code:
        return jsonify({"error": "Missing email or code"}), 400
        
    client_id = current_app.config.get("COGNITO_CLIENT_ID")
    if not client_id:
        current_app.logger.error("COGNITO_CLIENT_ID is not configured")
        return jsonify({"error": "Cognito is not configured on this server"}), 503

    client = get_boto_client()
    kwargs = {
        "ClientId": client_id,
        "Username": email,
        "ConfirmationCode": code
    }
    
    secret_hash = get_secret_hash(email)
    if secret_hash:
        kwargs["SecretHash"] = secret_hash
        
    try:
        client.confirm_sign_up(**kwargs)
        return jsonify({"success": True, "message": "Email verified successfully. You can now log in."})
    except ClientError as e:
        return jsonify({"error": e.response['Error']['Message']}), 400

@cognito_bp.route("/login", methods=["POST"])
def login():
    data = request.json
    email = data.get("email")
    password = data.get("password")
    
    if not email or not password:
        return jsonify({"error": "Missing email or password"}), 400
        
    client_id = current_app.config.get("COGNITO_CLIENT_ID")
    if not client_id:
        current_app.logger.error("COGNITO_CLIENT_ID is not configured")
        return jsonify({"error": "Cognito is not configured on this server"}), 503

    client = get_boto_client()
    
    auth_parameters = {
        "USERNAME": email,
        "PASSWORD": password
    }
    
    secret_hash = get_secret_hash(email)
    if secret_hash:
        auth_parameters["SECRET_HASH"] = secret_hash
        
    try:
        response = client.initiate_auth(
            ClientId=client_id,
            AuthFlow="USER_PASSWORD_AUTH",
            AuthParameters=auth_parameters
        )
        
        id_token = response['AuthenticationResult']['IdToken']
        claims = jwt.get_unverified_claims(id_token)
        cognito_sub = claims.get("sub")
        email_claim = claims.get("email", email)
        
        user = sync_cognito_user(email_claim, cognito_sub)
        
        session["user"] = user.id
        SessionLog.start_session(user.id)
        User.set_online(user.id, online=True)
        
        return jsonify({
            "success": True,
            "role": user.role,
            "username": user.username
        })
        
    except ClientError as e:
        return jsonify({"error": e.response['Error']['Message']}), 401
