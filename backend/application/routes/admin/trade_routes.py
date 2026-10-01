from application.decorators.admin_required import admin_only
from application.decorators.api_response import api_response
from application.extensions import db
from application.models.duck_trade import DuckTradeLog
from application.models.user import User
from flask import jsonify, request

from ..admin_routes import admin_bp


@admin_bp.route("/pending_trades", methods=["GET"])
@admin_only
@api_response
def pending_trades():
    # Join with User to get nickname
    pend_trades = (
        db.session.query(DuckTradeLog, User)
        .outerjoin(User, DuckTradeLog.user_id == User.id)
        .filter(DuckTradeLog.status == "pending")
        .all()
    )

    trades_list = [
        {
            "id": t[0].id,
            "username": t[1].username if t[1] else str(t[0].user_id),
            "nickname": t[1].nickname if t[1] else str(t[0].user_id),
            "digital_ducks": t[0].digital_ducks,
            "bit_ducks": t[0].bit_ducks,
            "byte_ducks": t[0].byte_ducks,
            "timestamp": t[0].timestamp.isoformat() if t[0].timestamp else None,
        }
        for t in pend_trades
    ]

    return {"trades": trades_list}


def _already_processed():
    return jsonify(
        {"status": "error", "message": "Trade has already been processed"}
    ), 400


@admin_bp.route("/trade_action", methods=["POST"])
@admin_only
def trade_action():
    trade_id = request.form.get("trade_id")
    action = request.form.get("action")

    trade = db.session.get(DuckTradeLog, trade_id)
    if not trade:
        return jsonify({"status": "error", "message": "Trade not found"}), 404

    if trade.status != "pending":
        return _already_processed()

    if action == "approve":
        user = User.query.filter_by(id=trade.user_id).first()
        if not user:
            return jsonify({"status": "error", "message": "User not found"}), 404

        # Claim the trade and take the ducks in one transaction, both as
        # conditional UPDATEs: a concurrent approval/rejection loses the claim,
        # and a balance spent in the meantime fails the min_balance guard, so
        # the ducks can neither be deducted twice nor overdrawn.
        if not DuckTradeLog.claim_pending(trade.id, "approved"):
            db.session.rollback()
            return _already_processed()

        deducted = user.add_ducks(
            -trade.digital_ducks,
            reason=f"Trade Approval: {trade.bit_ducks} Bits, {trade.byte_ducks} Bytes",
            min_balance=0,
        )
        if not deducted:
            db.session.rollback()
            return jsonify({"status": "error", "message": "Insufficient ducks"}), 400
        db.session.commit()

        from application.services.achievement_engine import evaluate_user

        evaluate_user(user, force=True)

        return jsonify({"status": "success", "message": "Trade approved"})

    elif action == "reject":
        if not DuckTradeLog.claim_pending(trade.id, "rejected"):
            db.session.rollback()
            return _already_processed()
        db.session.commit()
        return jsonify({"status": "success", "message": "Trade rejected"})

    return jsonify({"status": "error", "message": "Invalid action"}), 400
