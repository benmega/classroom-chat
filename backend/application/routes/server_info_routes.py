"""
File: server_info_routes.py
Type: py
Summary: Flask routes for server info routes functionality.
"""

from application.extensions import limiter
from flask import Blueprint

server_info = Blueprint("server_info", __name__, url_prefix="/server")


@server_info.route("/health")
@limiter.exempt
def health_check():
    return "SystemHealthy", 200
