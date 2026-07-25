from flask import Blueprint, request

from application.decorators.admin_required import admin_only
from application.decorators.api_response import api_response
from application.decorators.login_required import require_login
from application.extensions import db
from application.models.project_template import ProjectTemplate

project_templates_bp = Blueprint("project_templates", __name__)


@project_templates_bp.route("", methods=["GET"])
@require_login
@api_response
def list_templates():
    templates = ProjectTemplate.query.all()
    templates_info = {
        t.name: {
            "id": t.id,
            "description": t.description,
            "chapter": t.chapter,
            "name": t.name,
        }
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
        name=name, description=description, chapter=data.get("chapter")
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
