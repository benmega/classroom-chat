from .admin import (
    advanced_ops,
    challenge_mgmt,
    config_routes,
    dashboard_routes,
    parent_message_routes,
    project_routes,
    submission_routes,
    trade_routes,
    user_mgmt,
)
from .admin.blueprint import admin_bp
from .admin.crud_routes import crud_bp

# React-Admin standalone CRUD blueprint (still nested/prefixed)
admin_bp.register_blueprint(crud_bp, url_prefix="/crud")
