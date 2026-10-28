import math

from application.decorators.admin_required import admin_only
from application.decorators.api_response import api_response
from application.extensions import db
from application.models.challenge import Challenge
from application.services.challenge_slug import SlugRenameError, rename_challenge_slug
from flask import request
from sqlalchemy.exc import IntegrityError

from .blueprint import admin_bp


def _reward_value(raw):
    """Duck reward from a request payload: any finite number, fractions included.

    A missing, empty or zero value means 1. Raises ValueError for anything else.
    """
    try:
        value = float(raw or 1)
    except TypeError as e:
        raise ValueError("value must be a number") from e
    if not math.isfinite(value):
        raise ValueError("value must be a finite number")
    return value


@admin_bp.route("/challenges/bulk_add", methods=["POST"])
@admin_only
@api_response
def bulk_add_challenges():
    data = request.get_json()
    if not data:
        return "No data provided", 400

    challenges = data.get("challenges", [])
    if not challenges:
        return "No challenges provided in the set", 400

    added_count = 0
    skipped_count = 0
    errors = []

    for item in challenges:
        name = item.get("name")
        slug = item.get("slug")
        description = item.get("description", "")

        # New required fields from CSV (with fallback to top-level payload)
        course_id = item.get("course_id") or data.get("course_id")
        domain = item.get("domain") or data.get("domain")
        difficulty = item.get("difficulty") or "medium"

        if not name or not slug or not course_id or not domain:
            skipped_count += 1
            errors.append(f"Missing required fields for challenge: {name or 'Unknown'}")
            continue

        try:
            value = _reward_value(item.get("value"))
        except ValueError:
            skipped_count += 1
            errors.append(f"Invalid value for challenge: {name}")
            continue

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
            sequence=item.get("sequence"),
            description=description,
            is_active=True,
        )
        db.session.add(new_challenge)
        added_count += 1

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return f"Database error: {e!s}", 500

    return {
        "message": f"Successfully added {added_count} challenges. Skipped {skipped_count} existing or invalid entries.",
        "added": added_count,
        "skipped": skipped_count,
        "errors": errors,
    }


@admin_bp.route("/challenges/<course_id>", methods=["GET"])
@admin_only
@api_response
def get_challenges_for_course(course_id):
    domain = request.args.get("domain")
    query = Challenge.query.filter_by(course_id=course_id)
    if domain:
        query = query.filter_by(domain=domain)

    # Sort by sequence (handling nulls) then id
    challenges = query.order_by(Challenge.sequence.asc(), Challenge.id.asc()).all()

    return {
        "challenges": [
            {
                "id": c.id,
                "name": c.name,
                "slug": c.slug,
                "domain": c.domain,
                "sequence": c.sequence,
                "description": c.description
            }
            for c in challenges
        ]
    }


@admin_bp.route("/challenges/reorder", methods=["PUT"])
@admin_only
@api_response
def reorder_challenges():
    data = request.get_json()
    if not data or "updates" not in data:
        return "Updates list is required", 400

    updates = data.get("updates", [])

    updated_count = 0
    for update in updates:
        chal_id = update.get("id")
        seq = update.get("sequence")
        if chal_id is not None and seq is not None:
            chal = Challenge.query.get(chal_id)
            if chal:
                chal.sequence = seq
                updated_count += 1

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return f"Database error: {e!s}", 500

    return {"message": f"Successfully updated sequences for {updated_count} challenges."}


@admin_bp.route("/challenges/all_grouped", methods=["GET"])
@admin_only
@api_response
def get_all_challenges_grouped():
    challenges = Challenge.query.order_by(Challenge.course_id, Challenge.sequence.asc(), Challenge.id.asc()).all()
    grouped = {}
    for c in challenges:
        if c.course_id not in grouped:
            grouped[c.course_id] = []
        grouped[c.course_id].append({
            "id": c.id,
            "name": c.name,
            "slug": c.slug,
            "domain": c.domain,
            "difficulty": c.difficulty,
            "value": c.value,
            "sequence": c.sequence,
            "description": c.description,
            "course_id": c.course_id,
        })
    return {"challenges": grouped}


@admin_bp.route("/challenges/add", methods=["POST"])
@admin_only
@api_response
def add_challenge():
    data = request.get_json()
    if not data:
        return "No data provided", 400
    name = data.get("name")
    slug = data.get("slug")
    course_id = data.get("course_id")
    if not name or not slug or not course_id:
        return "name, slug, and course_id are required", 400

    if Challenge.query.filter_by(slug=slug).first():
        return "Challenge with this slug already exists", 400

    try:
        value = _reward_value(data.get("value"))
    except ValueError:
        return "value must be a number", 400

    c = Challenge(
        name=name,
        slug=slug,
        course_id=course_id,
        domain=data.get("domain", "codecombat.com"),
        difficulty=data.get("difficulty", "medium"),
        value=value,
        sequence=data.get("sequence"),
        description=data.get("description", ""),
        is_active=True
    )
    db.session.add(c)
    db.session.commit()
    return {"message": "Challenge added successfully", "id": c.id}


@admin_bp.route("/challenges/edit/<int:id>", methods=["PUT"])
@admin_only
@api_response
def edit_challenge(id):
    c = Challenge.query.get(id)
    if not c:
        return "Challenge not found", 404

    data = request.get_json()
    if not data:
        return "No data provided", 400

    if "value" in data:
        try:
            value = _reward_value(data["value"])
        except ValueError:
            return "value must be a number", 400

    slug = data.get("slug")
    renamed = bool(slug) and slug != c.slug
    logs_moved = 0
    if slug:
        existing = Challenge.query.filter(Challenge.slug == slug, Challenge.id != id).first()
        if existing:
            return "Challenge with this slug already exists", 400
        # Logs, project templates and level games refer to a challenge by its slug
        # as text, so they move with it in this transaction (or the rename is refused).
        try:
            logs_moved = rename_challenge_slug(c, slug)
        except SlugRenameError as e:
            db.session.rollback()
            return e.message, e.status

    if "name" in data: c.name = data["name"]
    if "course_id" in data: c.course_id = data["course_id"]
    if "domain" in data: c.domain = data["domain"]
    if "difficulty" in data: c.difficulty = data["difficulty"]
    if "value" in data: c.value = value
    if "sequence" in data: c.sequence = data["sequence"]
    if "description" in data: c.description = data["description"]

    try:
        db.session.commit()
    except IntegrityError:
        # Only a rename can collide here: a log or another challenge took the new
        # slug between the checks above and the commit.
        db.session.rollback()
        if not renamed:
            raise
        return "The slug was taken while the rename was saved. Nothing was changed.", 409
    result = {"message": "Challenge updated successfully"}
    if renamed:
        result["logs_moved"] = logs_moved
    return result


@admin_bp.route("/challenges/<int:id>", methods=["DELETE"])
@admin_only
@api_response
def delete_challenge(id):
    c = Challenge.query.get(id)
    if not c:
        return "Challenge not found", 404
    db.session.delete(c)
    db.session.commit()
    return {"message": "Challenge deleted successfully"}
