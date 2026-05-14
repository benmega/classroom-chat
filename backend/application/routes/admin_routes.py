from flask import Blueprint

admin_pass = "duckduck"
admin_bp = Blueprint("admin", __name__)

# Import routes to register them on the admin blueprint
from .admin import dashboard_routes
from .admin import user_mgmt
from .admin import config_routes
from .admin import trade_routes
from .admin import doc_routes
from .admin import project_routes
from .admin import advanced_ops
from .admin.crud_routes import crud_bp

# React-Admin standalone CRUD blueprint (still nested/prefixed)
admin_bp.register_blueprint(crud_bp, url_prefix="/crud")
