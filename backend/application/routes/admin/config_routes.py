from flask import Blueprint, request, jsonify
from application.extensions import db
from application.models.configuration import Configuration
from application.models.banned_words import BannedWords
from application.decorators.admin_required import admin_only

from ..admin_routes import admin


@admin.route("/toggle-ai", methods=["POST"])
@admin_only
def toggle_ai():
    config = Configuration.query.first()
    if config is None:
        config = Configuration(ai_teacher_enabled=False)
        db.session.add(config)

    config.ai_teacher_enabled = not config.ai_teacher_enabled
    db.session.commit()

    return jsonify({
        "success": True,
        "message": f"AI Teacher has been {'disabled' if config.ai_teacher_enabled else 'enabled'}",
        "status": config.ai_teacher_enabled,
    })

@admin.route("/toggle-message-sending", methods=["POST"])
@admin_only
def toggle_message_sending():
    config = Configuration.query.first()
    if config is None:
        config = Configuration(message_sending_enabled=False)
        db.session.add(config)
    else:
        config.message_sending_enabled = not config.message_sending_enabled
    db.session.commit()

    return jsonify({
        "success": True,
        "message": f"Message sending has been {'disabled' if config.message_sending_enabled else 'enabled'}",
        "status": config.message_sending_enabled,
    })

@admin.route("/update_duck_multiplier", methods=["POST"])
def update_duck_multiplier():
    data = request.get_json()
    new_multiplier = data.get("multiplier")

    if new_multiplier is None:
        return jsonify({"success": False, "error": "No multiplier provided"}), 400

    try:
        new_multiplier = float(new_multiplier)
        config = Configuration.query.first()
        if config is None:
            return jsonify({"success": False, "error": "Configuration not found"}), 404
        config.duck_multiplier = new_multiplier
        db.session.commit()
        return jsonify({"success": True, "new_multiplier": new_multiplier})
    except (ValueError, TypeError):
        return jsonify({"success": False, "error": "Invalid multiplier value"}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@admin.route("/add-banned-word", methods=["POST"])
@admin_only
def add_banned_word():
    word = request.form.get("word")
    reason = request.form.get("reason", None)

    if not word:
        return jsonify({"success": False, "message": "Word cannot be empty"}), 400

    if BannedWords.query.filter_by(word=word).first():
        return jsonify({"success": False, "message": "Word already banned"}), 400

    new_banned_word = BannedWords(word=word, reason=reason)
    db.session.add(new_banned_word)
    db.session.commit()

    return jsonify({"success": True, "message": f"'{word}' has been added to banned words"})
