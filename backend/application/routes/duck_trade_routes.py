"""
File: duck_trade_routes.py
Type: py
Summary: Flask routes for duck trade routes functionality.
"""

from application.extensions import db
from application.models.duck_trade import DuckTradeLog
from application.models.user import User
from flask import Blueprint, jsonify, request, session

duck_trade = Blueprint("duck_trade", __name__)

# Each trade stores one 0/1-style count per binary place (8 places).
DUCK_PLACES = 8


def _is_duck_places(value):
    """True for a list of exactly DUCK_PLACES non-negative integers."""
    return (
        isinstance(value, list)
        and len(value) == DUCK_PLACES
        and all(isinstance(v, int) and not isinstance(v, bool) and v >= 0 for v in value)
    )


@duck_trade.route("/submit_trade", methods=["POST"])
def submit_trade():
    # The React client is the only caller and always posts JSON.
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"status": "error", "message": "JSON body required"}), 400

    try:
        userid = session.get("user")
        if not userid:
            return (
                jsonify({"status": "error", "message": "You must be logged in."}),
                401,
            )

        user = db.session.get(User, userid)

        if not user:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "User profile not found. Please log in again.",
                    }
                ),
                401,
            )
        existing_trade = DuckTradeLog.query.filter_by(
            user_id=user.id, status="pending"
        ).first()
        if existing_trade:
            msg = (
                "You already have a pending trade. Please wait for it to be processed."
            )
            return jsonify({"status": "error", "message": msg}), 400

        try:
            d_ducks = int(data.get("digital_ducks", 0))
            if d_ducks < 1:
                return (
                    jsonify(
                        {
                            "status": "error",
                            "message": "Must trade at least 1 duck.",
                        }
                    ),
                    400,
                )
        except (ValueError, TypeError):
            return (
                jsonify({"status": "error", "message": "Invalid duck count."}),
                400,
            )

        bit_ducks = data.get("bit_ducks")
        byte_ducks = data.get("byte_ducks")
        if not (_is_duck_places(bit_ducks) and _is_duck_places(byte_ducks)):
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": (
                            "bit_ducks and byte_ducks must each be a list of "
                            f"{DUCK_PLACES} non-negative integers."
                        ),
                    }
                ),
                400,
            )

        trade = DuckTradeLog(
            user_id=user.id,
            digital_ducks=d_ducks,
            bit_ducks=bit_ducks,
            byte_ducks=byte_ducks,
            status="pending",
        )
        db.session.add(trade)
        db.session.commit()

        from application.services.achievement_engine import evaluate_user

        new_awards = evaluate_user(user)
        awards_payload = [
            {
                "id": a.id,
                "name": a.name,
                "slug": a.slug,
                "badge": f"/static/images/achievement_badges/{a.slug}.png",
            }
            for a in new_awards
        ]

        msg = "Trade submitted for approval."

        return jsonify(
            {"status": "success", "message": msg, "new_awards": awards_payload}
        )

    except Exception:
        db.session.rollback()
        return jsonify({"status": "error", "message": "Server Error"}), 500
