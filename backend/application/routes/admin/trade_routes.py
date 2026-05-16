from flask import request, jsonify
from application.extensions import db
from application.models.user import User
from application.models.duck_trade import DuckTradeLog
from application.decorators.api_response import api_response
from application.decorators.admin_required import admin_only

from ..admin_routes import admin_bp


@admin_bp.route("/pending_trades", methods=["GET"])
@admin_only
@api_response
def pending_trades():
    pend_trades = DuckTradeLog.query.filter_by(status="pending").all()

    trades_list = [
        {
            "id": t.id,
            "username": t.username,
            "digital_ducks": t.digital_ducks,
            "bit_ducks": t.bit_ducks,
            "byte_ducks": t.byte_ducks,
            "timestamp": t.timestamp.isoformat() if t.timestamp else None,
        }
        for t in pend_trades
    ]

    return {"trades": trades_list}


@admin_bp.route("/trade_action", methods=["POST"])
@admin_only
def trade_action():
    trade_id = request.form.get("trade_id")
    action = request.form.get("action")

    trade = db.session.get(DuckTradeLog, trade_id)
    if not trade:
        return jsonify({"status": "error", "message": "Trade not found"}), 404

    if action == "approve":
        user = User.query.filter_by(username=trade.username).first()
        if not user:
            return jsonify({"status": "error", "message": "User not found"}), 404

        if user.duck_balance < trade.digital_ducks:
            return jsonify({"status": "error", "message": "Insufficient ducks"}), 400

        user.add_ducks(
            -trade.digital_ducks,
            reason=f"Trade Approval: {trade.bit_ducks} Bits, {trade.byte_ducks} Bytes",
        )
        trade.approve()
        db.session.commit()
        return jsonify({"status": "success", "message": "Trade approved"})

    elif action == "reject":
        trade.reject()
        db.session.commit()
        return jsonify({"status": "success", "message": "Trade rejected"})

    return jsonify({"status": "error", "message": "Invalid action"}), 400
