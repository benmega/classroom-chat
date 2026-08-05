from application.decorators.admin_required import admin_only
from application.decorators.api_response import api_response
from application.extensions import db
from application.models.challenge import Challenge
from flask import request

from ..admin_routes import admin_bp


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
        value = int(item.get("value") or 1)

        if not name or not slug or not course_id or not domain:
            skipped_count += 1
            errors.append(f"Missing required fields for challenge: {name or 'Unknown'}")
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
    
    c = Challenge(
        name=name,
        slug=slug,
        course_id=course_id,
        domain=data.get("domain", "codecombat.com"),
        difficulty=data.get("difficulty", "medium"),
        value=int(data.get("value", 1) or 1),
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
        
    slug = data.get("slug")
    if slug:
        existing = Challenge.query.filter(Challenge.slug == slug, Challenge.id != id).first()
        if existing:
            return "Challenge with this slug already exists", 400
        c.slug = slug
        
    if "name" in data: c.name = data["name"]
    if "course_id" in data: c.course_id = data["course_id"]
    if "domain" in data: c.domain = data["domain"]
    if "difficulty" in data: c.difficulty = data["difficulty"]
    if "value" in data: c.value = int(data["value"] or 1)
    if "sequence" in data: c.sequence = data["sequence"]
    if "description" in data: c.description = data["description"]
    
    db.session.commit()
    return {"message": "Challenge updated successfully"}


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
