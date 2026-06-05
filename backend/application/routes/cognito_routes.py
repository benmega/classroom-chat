"""
File: cognito_routes.py
Type: py
Summary: Flask routes for AWS Cognito authentication.
"""
import requests
from flask import Blueprint, redirect, request, jsonify, session, current_app
from jose import jwt

from application.extensions import db
from application.models.user import User

cognito_bp = Blueprint("cognito", __name__)

def get_cognito_jwks():
    region = current_app.config.get("COGNITO_REGION", "us-east-1")
    pool_id = current_app.config.get("COGNITO_USER_POOL_ID")
    if not pool_id:
        return {}
    url = f"https://cognito-idp.{region}.amazonaws.com/{pool_id}/.well-known/jwks.json"
    try:
        r = requests.get(url, timeout=5)
        return r.json()
    except Exception:
        return {}

@cognito_bp.route("/login")
def login():
    domain = current_app.config.get("COGNITO_DOMAIN")
    client_id = current_app.config.get("COGNITO_CLIENT_ID")
    redirect_uri = current_app.config.get("COGNITO_REDIRECT_URI")
    
    if not domain or not client_id:
        return jsonify({"error": "Cognito not configured"}), 500
        
    cognito_url = (
        f"https://{domain}/login?"
        f"client_id={client_id}&"
        f"response_type=code&"
        f"scope=email+openid+profile&"
        f"redirect_uri={redirect_uri}"
    )
    return redirect(cognito_url)

@cognito_bp.route("/callback")
def callback():
    code = request.args.get("code")
    if not code:
        return jsonify({"error": "Missing code"}), 400

    domain = current_app.config.get("COGNITO_DOMAIN")
    client_id = current_app.config.get("COGNITO_CLIENT_ID")
    client_secret = current_app.config.get("COGNITO_CLIENT_SECRET")
    redirect_uri = current_app.config.get("COGNITO_REDIRECT_URI")
    region = current_app.config.get("COGNITO_REGION", "us-east-1")

    # Exchange code for tokens
    token_url = f"https://{domain}/oauth2/token"
    data = {
        "grant_type": "authorization_code",
        "client_id": client_id,
        "code": code,
        "redirect_uri": redirect_uri
    }
    
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    if client_secret:
        auth = (client_id, client_secret)
        r = requests.post(token_url, data=data, auth=auth, headers=headers)
    else:
        r = requests.post(token_url, data=data, headers=headers)
        
    if r.status_code != 200:
        return jsonify({"error": "Failed to fetch tokens", "details": r.text}), 400
        
    tokens = r.json()
    id_token = tokens.get("id_token")
    
    if not id_token:
        return jsonify({"error": "No ID token received"}), 400
    
    # Verify the ID token
    try:
        jwks = get_cognito_jwks()
        pool_id = current_app.config.get("COGNITO_USER_POOL_ID")
        audience = client_id
        issuer = f"https://cognito-idp.{region}.amazonaws.com/{pool_id}"
        
        claims = jwt.decode(
            id_token,
            jwks,
            algorithms=["RS256"],
            audience=audience,
            issuer=issuer
        )
    except Exception as e:
        return jsonify({"error": "Invalid token", "details": str(e)}), 400
        
    email = claims.get("email")
    cognito_sub = claims.get("sub")
    
    if not email or not cognito_sub:
        return jsonify({"error": "Missing email or sub in token"}), 400
        
    # Check if user exists
    user = User.query.filter_by(cognito_sub=cognito_sub).first()
    
    if not user:
        # Check if email is already taken by a non-Cognito user
        user = User.query.filter_by(email=email).first()
        if user:
            # Link accounts
            user.cognito_sub = cognito_sub
        else:
            # Create new parent account
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
                is_approved=True # Parent accounts via Cognito are auto-approved
            )
            # Dummy password since they use Cognito
            user.set_password(f"cognito_{cognito_sub}") 
            db.session.add(user)
            
        db.session.commit()
        
    # Standard local session login
    session["user"] = user.id
    
    from application.models.session_log import SessionLog
    SessionLog.start_session(user.id)
    User.set_online(user.id, online=True)
    
    # Check if this is local dev proxy (e.g. from Vite 5173). Let Vite handle redirects to dashboard
    frontend_url = request.headers.get("Referer", "")
    if "5173" in frontend_url or "localhost:5173" in current_app.config.get("COGNITO_REDIRECT_URI", ""):
        return redirect("http://localhost:5173/parent/dashboard")
    
    # Default redirect for production
    return redirect("/parent/dashboard")
