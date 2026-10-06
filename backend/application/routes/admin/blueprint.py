from flask import Blueprint

# The admin route modules import this blueprint from here, not from admin_routes, which
# imports them: that way the import graph has no cycle and no ordering to get right.
admin_bp = Blueprint("admin", __name__)
