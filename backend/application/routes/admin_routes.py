from flask import Blueprint

admin_pass = "duckduck"
admin_bp = Blueprint("admin", __name__)

# Import routes to register them on the admin blueprint
from .admin import (  # noqa: F401, E402
    advanced_ops,
    config_routes,
    dashboard_routes,
    doc_routes,
    project_routes,
    trade_routes,
    user_mgmt,
    challenge_mgmt,
)
from .admin.crud_routes import crud_bp  # noqa: E402

# React-Admin standalone CRUD blueprint (still nested/prefixed)
admin_bp.register_blueprint(crud_bp, url_prefix="/crud")

