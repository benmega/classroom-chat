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

    pending_count = Project.query.filter(Project.status == "pending").count()

    total_count = Project.query.count()

    query = Project.query
    if filter_type == "pending":
        query = query.filter(Project.status == "pending")
    elif filter_type == "rejected":
        query = query.filter(Project.status == "rejected")
    elif filter_type == "approved":
        query = query.filter(Project.status == "approved")

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


def _complete_linked_challenge(student, project):
    """Complete the Challenge linked to the project's template, if any.

    The template is resolved by ``project.template_id`` first; projects
    created before that column existed (or by clients that never set it) fall
    back to the unique template name. Returns (newly_completed, challenge_slug);
    challenge_slug is the linked challenge whether or not it was new, so the
    admin UI can tell "already completed" from "not linked".
    Never raises: a problem here must not undo the project approval.
    """
    import logging

    from application.models.challenge import Challenge
    from application.models.project_template import ProjectTemplate
    from application.services.challenge_completion import grant_challenge_completion

    try:
        template = None
        if project.template_id:
            template = db.session.get(ProjectTemplate, project.template_id)
        if template is None:
            template = ProjectTemplate.query.filter_by(name=project.name).first()
        if not template or not template.challenge_slug:
            return False, None
        challenge = Challenge.query.filter_by(slug=template.challenge_slug).first()
        if not challenge:
            return False, None

        from application.models.configuration import Configuration

        config = Configuration.query.first()
        multiplier = (config.duck_multiplier if config else 1) or 1
        if student.has_double_duck:
            multiplier *= 2

        created = grant_challenge_completion(
            student,
            challenge,
            reason=f"Project approved: {project.name}",
            duck_multiplier=multiplier,
            evaluate=False,  # the caller runs evaluate_user right after
        )
        return created, challenge.slug
    except Exception:
        db.session.rollback()
        logging.getLogger(__name__).exception(
            "Failed to complete linked challenge for project %s", project.id
        )
        return False, None


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
                student.packets = max(0.0, (student.packets or 0.0) - project.packets_awarded)

        project.packets_awarded = 0.0
        project.status = "rejected"
        if comment is not None:
            project.teacher_comment = comment.strip() or None
        else:
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
            student.packets = (student.packets or 0.0) + diff

        project.packets_awarded = packet_reward
        project.teacher_comment = comment
        project.status = "approved"
        db.session.commit()

        # Mini-project templates can be linked to a Challenge (e.g. the 3D
        # modeling track): approving the project completes that challenge.
        challenge_completed = False
        completed_challenge_slug = None
        if student:
            challenge_completed, completed_challenge_slug = (
                _complete_linked_challenge(student, project)
            )

        if student:
            from application.services.achievement_engine import evaluate_user

            evaluate_user(student, force=True)

        student_nickname = student.nickname if student else "A student"
        student_slug = student.slug if student else ""

        subject = f"Project Approved: {project.name}"
        body = f"We are pleased to inform you that {student_nickname} has successfully completed a new project: {project.name}.\n\nYou can review their accomplishment at the link below:\nhttps://blossom.benmega.com/profile/{student_slug}"
        send_admin_email(subject, body)

        return jsonify(
            {
                "status": "success",
                "message": f"Project '{project.name}' approved with {packet_reward:.3f} packets.",
                "challenge_completed": challenge_completed,
                "challenge_slug": completed_challenge_slug,
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

    from application.models.project_template import ProjectTemplate

    matched_template = ProjectTemplate.query.filter_by(name=name).first()

    project = Project(
        user_id=user_id,
        name=name,
        template_id=matched_template.id if matched_template else None,
        description=description,
        link=link,
        github_link=github_link,
        video_url=video_url,
        code_snippet=code_snippet,
        image_url=image_url,
        status="pending",
    )

    db.session.add(project)
    db.session.commit()

    return jsonify(
        {
            "status": "success",
            "message": f"Project '{name}' has been assigned to student #{user_id}.",
        }
    )
