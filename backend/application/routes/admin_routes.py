from flask import Blueprint

# Test-only override hook: leave None in production so verify_password falls
# through to the real ADMIN_PASSWORD config value. Tests monkeypatch this
# module attribute directly (see tests/app/routes/test_admin_routes.py).
admin_pass = None
admin_bp = Blueprint("admin", __name__)

# Import routes to register them on the admin blueprint
from .admin import (
    advanced_ops,
    challenge_mgmt,
    config_routes,
    dashboard_routes,
    doc_routes,
    project_routes,
    standard_project_routes,
    trade_routes,
    user_mgmt,
)
from .admin.crud_routes import crud_bp

# React-Admin standalone CRUD blueprint (still nested/prefixed)
admin_bp.register_blueprint(crud_bp, url_prefix="/crud")
