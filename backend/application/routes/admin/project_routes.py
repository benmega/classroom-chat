from application.decorators.admin_required import admin_only
from application.extensions import db
from application.models.project import Project
from application.services.email_service import send_admin_email
from flask import jsonify, request

from ..admin_routes import admin_bp


@admin_bp.route("/manage-projects", methods=["GET"])
@admin_only
def manage_projects():
    filter_type = request.args.get("filter", "pending")

    pending_count = Project.query.filter(
        Project.teacher_comment.is_(None) | (Project.teacher_comment == "")
    ).count()

    total_count = Project.query.count()

    query = Project.query
    if filter_type == "pending":
        query = query.filter(
            Project.teacher_comment.is_(None) | (Project.teacher_comment == "")
        )

    projects = query.order_by(Project.id.desc()).all()

    return jsonify(
        {
            "status": "success",
            "data": {
                "projects": [p.to_dict() for p in projects],
                "pending_count": pending_count,
                "total_count": total_count,
            },
        }
    )


@admin_bp.route("/handle-project-review/<int:project_id>", methods=["POST"])
@admin_only
def handle_project_review(project_id):
    project = Project.query.get_or_404(project_id)

    data = request.get_json()
    action = data.get("action")
    comment = data.get("teacher_comment")

    # Decoupled packets: handle reward input
    try:
        packet_reward = float(data.get("packet_reward", 0.006))
    except (ValueError, TypeError):
        packet_reward = 0.006

    if action == "reject":
        # Retract previously awarded packets if any
        if project.packets_awarded and project.packets_awarded > 0:
            student = project.user
            if student:
                student.packets = max(0.0, student.packets - project.packets_awarded)

        project.packets_awarded = 0.0
        project.teacher_comment = None
        db.session.commit()
        return jsonify(
            {
                "status": "success",
                "message": f"Project '{project.name}' marked for revision.",
            }
        )
    elif action == "approve":
        student = project.user
        if student:
            previous_award = project.packets_awarded or 0.0
            diff = packet_reward - previous_award
            student.packets += diff

        project.packets_awarded = packet_reward
        project.teacher_comment = comment
        db.session.commit()

        student_nickname = student.nickname if student else "A student"
        student_slug = student.slug if student else ""

        subject = f"Project Approved: {project.name}"
        body = f"We are pleased to inform you that {student_nickname} has successfully completed a new project: {project.name}.\n\nYou can review their accomplishment at the link below:\nhttps://blossom.benmega.com/profile/{student_slug}"
        send_admin_email(subject, body)

        return jsonify(
            {
                "status": "success",
                "message": f"Project '{project.name}' approved with {packet_reward:.3f} packets.",
            }
        )

    return jsonify({"status": "error", "message": "Invalid action."}), 400


@admin_bp.route("/assign-project", methods=["POST"])
@admin_only
def assign_project():
    data = request.get_json()

    user_id = data.get("user_id")
    name = data.get("name")

    if not user_id or not name:
        return jsonify(
            {"status": "error", "message": "Student ID and Project Name are required."}
        ), 400

    description = data.get("description")
    link = data.get("link")
    github_link = data.get("github_link")
    video_url = data.get("video_url")
    code_snippet = data.get("code_snippet")
    image_url = data.get("image_url")

    project = Project(
        user_id=user_id,
        name=name,
        description=description,
        link=link,
        github_link=github_link,
        video_url=video_url,
        code_snippet=code_snippet,
        image_url=image_url,
    )

    db.session.add(project)
    db.session.commit()

    return jsonify(
        {
            "status": "success",
            "message": f"Project '{name}' has been assigned to student #{user_id}.",
        }
    )
