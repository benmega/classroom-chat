from flask import Blueprint

admin_bp = Blueprint("admin", __name__)

# Import routes to register them on the admin blueprint
from .admin import (
    advanced_ops,
    challenge_mgmt,
    config_routes,
    dashboard_routes,
    project_routes,
    submission_routes,
    trade_routes,
    user_mgmt,
)
from .admin.crud_routes import crud_bp

# React-Admin standalone CRUD blueprint (still nested/prefixed)
admin_bp.register_blueprint(crud_bp, url_prefix="/crud")
