# application/routes/license.py

from flask import Blueprint, jsonify, current_app

license_bp = Blueprint('license', __name__)

@license_bp.route('/license_info', methods=['GET'])
def license_info():
    return jsonify({
        "is_premium": current_app.config.get("IS_PREMIUM", False),
        "licensee": current_app.config.get("LICENSEE", "Unknown")
    })
