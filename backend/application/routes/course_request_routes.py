"""
File: course_request_routes.py
Type: py
Summary: Flask routes for student course instance requests.
"""

from application.extensions import db
from application.models.course_instance import CourseInstance
from application.models.course_instance_request import CourseInstanceRequest
from application.utilities.db_helpers import get_user
from flask import Blueprint, jsonify, request, session

course_request_bp = Blueprint(
    "course_request", __name__, url_prefix="/api/course-requests"
)


@course_request_bp.route("/submit", methods=["POST"])
def submit_request():
    session_userid = session.get("user")
    if not session_userid:
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    user = get_user(session_userid)
    if not user:
        return jsonify({"success": False, "message": "Unknown user"}), 401

    data = request.get_json() or {}
    course_instance_id = data.get("course_instance_id")
    requested_course_id = data.get("requested_course_id")
    url = data.get("url")

    if not course_instance_id or not url:
        return jsonify({"success": False, "message": "Missing required fields"}), 400

    # Check if a pending request already exists for this instance
    existing = CourseInstanceRequest.query.filter_by(
        course_instance_id=course_instance_id, status="pending"
    ).first()

    if existing:
        return jsonify(
            {
                "success": True,
                "message": "A request for this course is already pending approval.",
            }
        ), 200

    new_request = CourseInstanceRequest(
        student_id=user.id,
        course_instance_id=course_instance_id,
        requested_course_id=requested_course_id,
        url=url,
        status="pending",
    )
    db.session.add(new_request)
    db.session.commit()

    return jsonify(
        {
            "success": True,
            "message": "Request submitted successfully. An admin will review it.",
        }
    ), 201


@course_request_bp.route("/pending", methods=["GET"])
def get_pending_requests():
    session_userid = session.get("user")
    if not session_userid:
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    user = get_user(session_userid)
    if not user or user.role != 'admin':
        return jsonify({"success": False, "message": "Forbidden"}), 403

    requests = CourseInstanceRequest.query.filter_by(status="pending").all()

    # We can also enrich the response with the student's classroom info for convenience
    enriched_requests = []
    for req in requests:
        req_dict = req.to_dict()
        student = get_user(req.student_id)
        if student:
            req_dict["student_username"] = student.username
            classrooms = [c.to_dict() for c in student.classrooms]
            req_dict["student_classrooms"] = classrooms
        enriched_requests.append(req_dict)

    return jsonify({"success": True, "requests": enriched_requests})


@course_request_bp.route("/<int:request_id>/approve", methods=["POST"])
def approve_request(request_id):
    session_userid = session.get("user")
    if not session_userid:
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    user = get_user(session_userid)
    if not user or user.role != 'admin':
        return jsonify({"success": False, "message": "Forbidden"}), 403

    data = request.get_json() or {}
    classroom_id = data.get("classroom_id")
    course_id = data.get("course_id")

    if not classroom_id or not course_id:
        return jsonify(
            {
                "success": False,
                "message": "Classroom and Course are required to approve",
            }
        ), 400

    req = db.session.get(CourseInstanceRequest, request_id)
    if not req:
        return jsonify({"success": False, "message": "Request not found"}), 404

    if req.status != "pending":
        return jsonify(
            {"success": False, "message": f"Request already {req.status}"}
        ), 400

    # Check if instance already exists just in case
    existing = db.session.get(CourseInstance, req.course_instance_id)
    if not existing:
        new_instance = CourseInstance(
            id=req.course_instance_id, classroom_id=classroom_id, course_id=course_id
        )
        db.session.add(new_instance)

    req.status = "approved"
    db.session.commit()

    return jsonify(
        {"success": True, "message": "Course instance added and request approved."}
    )


@course_request_bp.route("/<int:request_id>/reject", methods=["POST"])
def reject_request(request_id):
    session_userid = session.get("user")
    if not session_userid:
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    user = get_user(session_userid)
    if not user or user.role != 'admin':
        return jsonify({"success": False, "message": "Forbidden"}), 403

    req = db.session.get(CourseInstanceRequest, request_id)
    if not req:
        return jsonify({"success": False, "message": "Request not found"}), 404

    if req.status != "pending":
        return jsonify(
            {"success": False, "message": f"Request already {req.status}"}
        ), 400

    req.status = "rejected"
    db.session.commit()

    return jsonify({"success": True, "message": "Request rejected."})
