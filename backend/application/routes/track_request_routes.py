"""
File: track_request_routes.py
Type: py
Summary: Flask routes for track change requests.
"""

from flask import Blueprint, jsonify, request, session
from application.extensions import db
from application.models.user import User
from application.models.track_requests import TrackChangeRequest
from application.utilities.db_helpers import get_user

track_request_bp = Blueprint("track_request", __name__, url_prefix="/api")


@track_request_bp.route("/track-requests/", methods=["POST"])
def create_track_request():
    session_userid = session.get("user")
    if not session_userid:
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    user = get_user(session_userid)
    if not user:
        return jsonify({"success": False, "message": "Unknown user"}), 401

    data = request.get_json() or {}
    requester_type = data.get("requester_type")
    requested_track = data.get("requested_track")
    student_id = data.get("student_id")

    if not requester_type or not requested_track:
        return jsonify({"success": False, "message": "Missing required fields"}), 400

    if requested_track not in ["ozaria", "cs", "gd", "wd"]:
        return jsonify({"success": False, "message": "Invalid track selected"}), 400

    # Determine student ID based on requester type
    if requester_type == "student":
        student_id = user.id
    elif requester_type == "parent":
        if not student_id:
            return jsonify({"success": False, "message": "Student ID is required for parent requests"}), 400
        # Verify student is a linked child of the parent
        child_ids = {child.id for child in user.children}
        if int(student_id) not in child_ids:
            return jsonify({"success": False, "message": "Access denied: student is not linked to this parent"}), 403
    else:
        return jsonify({"success": False, "message": "Invalid requester type"}), 400

    # Check for existing pending request for this student
    existing = TrackChangeRequest.query.filter_by(student_id=student_id, status="pending").first()
    if existing:
        return jsonify({"success": False, "message": "A track change request is already pending for this student"}), 400

    # Create request
    new_request = TrackChangeRequest(
        student_id=student_id,
        requester_type=requester_type,
        requested_track=requested_track,
        status="pending"
    )
    db.session.add(new_request)
    db.session.commit()

    return jsonify({"success": True, "message": "Request submitted successfully"}), 201


@track_request_bp.route("/admin/track-requests/", methods=["GET"])
def get_pending_track_requests():
    session_userid = session.get("user")
    if not session_userid:
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    user = get_user(session_userid)
    if not user or not user.is_admin:
        return jsonify({"success": False, "message": "Forbidden"}), 403

    requests = TrackChangeRequest.query.filter_by(status="pending").all()
    return jsonify({
        "success": True,
        "requests": [req.to_dict() for req in requests]
    })


@track_request_bp.route("/admin/track-requests/<int:request_id>", methods=["PUT"])
def update_track_request(request_id):
    session_userid = session.get("user")
    if not session_userid:
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    user = get_user(session_userid)
    if not user or not user.is_admin:
        return jsonify({"success": False, "message": "Forbidden"}), 403

    data = request.get_json() or {}
    status = data.get("status")

    if status not in ["approved", "denied"]:
        return jsonify({"success": False, "message": "Invalid status"}), 400

    track_req = db.session.get(TrackChangeRequest, request_id)
    if not track_req:
        return jsonify({"success": False, "message": "Request not found"}), 404

    track_req.status = status
    if status == "approved":
        student = db.session.get(User, track_req.student_id)
        if student:
            student.active_track = track_req.requested_track

    db.session.commit()
    return jsonify({"success": True, "message": f"Request {status} successfully"})
