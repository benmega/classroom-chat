from flask import Blueprint
from .admin.user_mgmt import user_mgmt_bp
from .admin.config_routes import config_bp
from .admin.trade_routes import trade_bp
from .admin.doc_routes import doc_bp
from .admin.dashboard_routes import dashboard_bp
from .admin.project_routes import project_bp

admin = Blueprint("admin_api", __name__)

# Register sub-blueprints
# These will all be prefixed with whatever /api/admin prefix was used for this blueprint
admin.register_blueprint(user_mgmt_bp)
admin.register_blueprint(config_bp)
admin.register_blueprint(trade_bp)
admin.register_blueprint(doc_bp)
admin.register_blueprint(dashboard_bp)
admin.register_blueprint(project_bp)
