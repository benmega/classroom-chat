from application.decorators.admin_required import admin_only
from application.decorators.api_response import api_response
from application.decorators.login_required import require_login
from application.extensions import db
from application.models.project_template import ProjectTemplate
from flask import Blueprint, request

project_templates_bp = Blueprint("project_templates", __name__)


@project_templates_bp.route("", methods=["GET"])
@require_login
@api_response
def list_templates():
    templates = ProjectTemplate.query.all()
    templates_info = {
        t.name: t.to_dict()
        for t in templates
    }
    return {"templates": templates_info}


@project_templates_bp.route("", methods=["POST"])
@admin_only
@api_response
def create_template():
    data = request.get_json() or {}
    name = data.get("name")
    description = data.get("description")

    if not name or not description:
        return {"error": "Name and description are required"}, 400

    existing = ProjectTemplate.query.filter_by(name=name).first()
    if existing:
        return {"error": "A template with this name already exists"}, 400

    template = ProjectTemplate(
        name=name,
        description=description,
        chapter=data.get("chapter"),
        link=data.get("link"),
        github_link=data.get("github_link"),
        video_url=data.get("video_url"),
        code_snippet=data.get("code_snippet"),
        image_url=data.get("image_url")
    )
    db.session.add(template)
    db.session.commit()

    return {
        "message": f"Project template '{name}' created successfully.",
        "template": template.to_dict(),
    }


@project_templates_bp.route("/<int:template_id>", methods=["PUT"])
@admin_only
@api_response
def update_template(template_id):
    template = db.session.get(ProjectTemplate, template_id)
    if not template:
        return {"error": "Template not found"}, 404

    data = request.get_json() or {}
    name = data.get("name")
    description = data.get("description")

    if name:
        existing = ProjectTemplate.query.filter(
            ProjectTemplate.name == name, ProjectTemplate.id != template_id
        ).first()
        if existing:
            return {"error": "A template with this name already exists"}, 400
        template.name = name
    if description:
        template.description = description
    if "chapter" in data:
        template.chapter = data.get("chapter")
    if "link" in data:
        template.link = data.get("link")
    if "github_link" in data:
        template.github_link = data.get("github_link")
    if "video_url" in data:
        template.video_url = data.get("video_url")
    if "code_snippet" in data:
        template.code_snippet = data.get("code_snippet")
    if "image_url" in data:
        template.image_url = data.get("image_url")

    db.session.commit()

    return {
        "message": f"Project template '{template.name}' updated successfully.",
        "template": template.to_dict(),
    }


@project_templates_bp.route("/<int:template_id>", methods=["DELETE"])
@admin_only
@api_response
def delete_template(template_id):
    template = db.session.get(ProjectTemplate, template_id)
    if not template:
        return {"error": "Template not found"}, 404

    db.session.delete(template)
    db.session.commit()

    return {"message": "Project template deleted successfully."}
