import math

from application.decorators.admin_required import admin_only
from application.extensions import db
from application.models.banned_words import BannedWords
from application.models.configuration import Configuration
from flask import jsonify, request

from ..admin_routes import admin_bp

# Upper bound for the global duck multiplier; it scales challenge rewards, so it
# must stay finite and non-negative (a negative value would deduct ducks).
MAX_DUCK_MULTIPLIER = 100


@admin_bp.route("/toggle-message-sending", methods=["POST"])
@admin_only
def toggle_message_sending():
    config = Configuration.query.first()
    if config is None:
        config = Configuration(message_sending_enabled=True)
        db.session.add(config)

    config.message_sending_enabled = not config.message_sending_enabled
    db.session.commit()

    return jsonify(
        {
            "success": True,
            "message": f"Message sending has been {'enabled' if config.message_sending_enabled else 'disabled'}",
            "status": config.message_sending_enabled,
        }
    )


@admin_bp.route("/update_duck_multiplier", methods=["POST"])
@admin_only
def update_duck_multiplier():
    data = request.get_json()
    new_multiplier = data.get("multiplier")

    if new_multiplier is None:
        return jsonify({"success": False, "error": "No multiplier provided"}), 400

    try:
        new_multiplier = float(new_multiplier)
        if not math.isfinite(new_multiplier) or not (
            0 <= new_multiplier <= MAX_DUCK_MULTIPLIER
        ):
            return (
                jsonify(
                    {
                        "success": False,
                        "error": f"Multiplier must be between 0 and {MAX_DUCK_MULTIPLIER}",
                    }
                ),
                400,
            )
        config = Configuration.query.first()
        if config is None:
            return jsonify({"success": False, "error": "Configuration not found"}), 404
        config.duck_multiplier = new_multiplier
        db.session.commit()
        return jsonify({"success": True, "new_multiplier": new_multiplier})
    except (ValueError, TypeError, OverflowError):
        return jsonify({"success": False, "error": "Invalid multiplier value"}), 400
    except Exception:
        db.session.rollback()
        return jsonify({"success": False, "error": "Internal server error"}), 500


@admin_bp.route("/add-banned-word", methods=["POST"])
@admin_only
def add_banned_word():
    word = (request.form.get("word") or "").strip()
    reason = request.form.get("reason", None)

    if not word:
        return jsonify({"success": False, "message": "Word cannot be empty"}), 400

    if BannedWords.query.filter_by(word=word).first():
        return jsonify({"success": False, "message": "Word already banned"}), 400

    new_banned_word = BannedWords(word=word, reason=reason)
    db.session.add(new_banned_word)
    db.session.commit()

    return jsonify(
        {"success": True, "message": f"'{word}' has been added to banned words"}
    )
