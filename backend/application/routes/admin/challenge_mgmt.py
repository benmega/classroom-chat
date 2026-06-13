from flask import request, jsonify
from application.extensions import db
from application.models.challenge import Challenge
from application.decorators.admin_required import admin_only
from application.decorators.api_response import api_response

from ..admin_routes import admin_bp

@admin_bp.route("/challenges/bulk_add", methods=["POST"])
@admin_only
@api_response
def bulk_add_challenges():
    data = request.get_json()
    if not data:
        return "No data provided", 400

    course_id = data.get("course_id")
    domain = data.get("domain")
    difficulty = data.get("difficulty", "medium")
    value = int(data.get("value", 1))
    challenges = data.get("challenges", [])

    if not course_id or not domain:
        return "course_id and domain are required", 400

    if not challenges:
        return "No challenges provided in the set", 400

    added_count = 0
    skipped_count = 0
    errors = []

    for item in challenges:
        name = item.get("name")
        slug = item.get("slug")
        description = item.get("description", "")

        if not name or not slug:
            skipped_count += 1
            errors.append(f"Missing name or slug for an item")
            continue

        # Check if challenge already exists
        existing = Challenge.query.filter_by(slug=slug).first()
        if existing:
            skipped_count += 1
            continue

        new_challenge = Challenge(
            name=name,
            slug=slug,
            domain=domain,
            difficulty=difficulty,
            value=value,
            course_id=course_id,
            description=description,
            is_active=True
        )
        db.session.add(new_challenge)
        added_count += 1

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return f"Database error: {str(e)}", 500

    return {
        "message": f"Successfully added {added_count} challenges. Skipped {skipped_count} existing or invalid entries.",
        "added": added_count,
        "skipped": skipped_count,
        "errors": errors
    }
