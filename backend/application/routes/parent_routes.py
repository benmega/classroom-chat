"""
File: parent_routes.py
Type: py
Summary: API endpoints for parent accounts to view linked children and student report cards.
"""

from flask import Blueprint, session, request

from application.decorators.api_response import api_response
from application.decorators.login_required import require_login
from application.extensions import db
from application.models.user import User
from application.models.parent_connection_request import ParentConnectionRequest
from application.models.challenge_log import ChallengeLog
from application.models.course import Course
from sqlalchemy import func


parent = Blueprint("parent", __name__)


@parent.route("/children", methods=["GET"])
@require_login
@api_response
def get_children():
    """Returns the list of children linked to the authenticated parent."""
    user_id = session.get("user")
    user_obj = db.session.get(User, user_id)

    if not user_obj or user_obj.role != "parent":
        return "Access denied. Parent account required.", 403

    children = [
        {
            "id": child.id,
            "username": child.username,
            "nickname": child.nickname,
            "profile_picture_url": (
                f"/user/profile_pictures/{child.profile_picture}"
                if child.profile_picture
                else "/static/images/Default_pfp.jpg"
            ),
            "slug": child.slug,
        }
        for child in user_obj.children
    ]

    return {"children": children}


@parent.route("/student/<int:student_id>/report", methods=["GET"])
@require_login
@api_response
def get_student_report(student_id):
    """Returns a read-only report card for a specific linked student."""
    user_id = session.get("user")
    user_obj = db.session.get(User, user_id)

    if not user_obj or user_obj.role != "parent":
        return "Access denied. Parent account required.", 403

    # Verify the student is linked to this parent
    child_ids = {child.id for child in user_obj.children}
    if student_id not in child_ids:
        return "Access denied. This student is not linked to your account.", 403

    student = db.session.get(User, student_id)
    if not student:
        return "Student not found.", 404

    # Build unlocked achievements list (earned only)
    unlocked_achievements = []
    for ua in student.achievements:
        achievement = ua.achievement
        if achievement:
            unlocked_achievements.append({
                "id": achievement.id,
                "slug": achievement.slug,
                "name": achievement.name,
                "type": achievement.type,
                "description": achievement.description,
                "earned_at": ua.earned_at.isoformat() if ua.earned_at else None,
            })

    # Course progress totals
    cc_levels = student.get_progress("codecombat.com")
    cc_percent = student.get_progress_percent("codecombat.com")
    oz_levels = student.get_progress("www.ozaria.com")
    oz_percent = student.get_progress_percent("www.ozaria.com")

    # Detailed course progress breakdown
    def get_course_breakdown(domain):
        logs = db.session.query(
            ChallengeLog.course_id,
            func.count(ChallengeLog.id).label('completed_count')
        ).filter(
            ChallengeLog.username == student._username,
            ChallengeLog.domain == domain
        ).group_by(ChallengeLog.course_id).all()
        
        breakdown = []
        for log in logs:
            course_id = log.course_id
            count = log.completed_count
            course_name = "Other"
            if course_id:
                course = db.session.get(Course, course_id)
                if course:
                    course_name = course.name
                else:
                    course_name = course_id
            
            breakdown.append({
                "course_id": course_id,
                "course_name": course_name,
                "levels_completed": count
            })
        
        # Sort by levels completed, or another stable sort if preferred
        breakdown.sort(key=lambda x: x["levels_completed"], reverse=True)
        return breakdown

    cc_breakdown = get_course_breakdown("codecombat.com")
    oz_breakdown = get_course_breakdown("www.ozaria.com")

    report = {
        "username": student.username,
        "nickname": student.nickname,
        "profile_picture_url": (
            f"/user/profile_pictures/{student.profile_picture}"
            if student.profile_picture
            else "/static/images/Default_pfp.jpg"
        ),
        "contribution_data": student.get_contribution_data(),
        "unlocked_achievements": unlocked_achievements,
        "projects": [
            p.to_dict() if hasattr(p, "to_dict") else {"id": p.id, "name": p.name}
            for p in student.projects
        ],
        "notes": [
            (
                n.to_dict()
                if hasattr(n, "to_dict")
                else {"id": n.id, "url": f"/notes/view/{n.filename}"}
            )
            for n in student.notes
        ],
        "course_progress": {
            "codecombat": {
                "levels_completed": cc_levels,
                "percent": cc_percent,
                "breakdown": cc_breakdown
            },
            "ozaria": {
                "levels_completed": oz_levels,
                "percent": oz_percent,
                "breakdown": oz_breakdown
            },
        },
    }

    return report


@parent.route("/connect/code", methods=["POST"])
@require_login
@api_response
def connect_via_code():
    """Instantly links the authenticated parent to a student using their connection code."""
    data = request.json or {}
    code = data.get("code", "").strip()
    
    if not code:
        return "Connection code is required.", 400
        
    user_id = session.get("user")
    user_obj = db.session.get(User, user_id)
    
    if not user_obj or user_obj.role != "parent":
        return "Access denied. Parent account required.", 403
        
    student = User.query.filter_by(connection_code=code).first()
    if not student:
        return "Invalid connection code.", 404
        
    if student in user_obj.children:
        return "Already linked to this student.", 400
        
    user_obj.children.append(student)
    db.session.commit()
    
    return {"message": "Student successfully linked.", "student": {"id": student.id, "nickname": student.nickname}}

@parent.route("/connect/request", methods=["POST"])
@require_login
@api_response
def request_connection():
    """Submits a request to the admin to link the parent with a specific student."""
    data = request.json or {}
    username = data.get("username", "").strip()
    relationship = data.get("relationship", "").strip()
    message = data.get("message", "").strip()
    
    if not username or not relationship:
        return "Username and relationship are required.", 400
        
    user_id = session.get("user")
    user_obj = db.session.get(User, user_id)
    
    if not user_obj or user_obj.role != "parent":
        return "Access denied. Parent account required.", 403
        
    student = User.query.filter_by(_username=username.lower()).first()
    if not student:
        return "Student not found.", 404
        
    if student in user_obj.children:
        return "Already linked to this student.", 400
        
    # Check for pending request
    existing_req = ParentConnectionRequest.query.filter_by(
        parent_id=user_id, student_id=student.id, status="pending"
    ).first()
    if existing_req:
        return "A pending connection request already exists for this student.", 400
        
    req = ParentConnectionRequest(
        parent_id=user_id,
        student_id=student.id,
        relationship=relationship,
        message=message
    )
    db.session.add(req)
    db.session.commit()
    
    return {"message": "Connection request submitted. Waiting for admin approval."}

