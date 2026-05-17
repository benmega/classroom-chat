import os
from datetime import datetime
from flask import request, jsonify, send_file, current_app
from application.decorators.api_response import api_response
from application.decorators.admin_required import admin_only
from application.utilities.helper_functions import format_file_size

from ..admin_routes import admin_bp


@admin_bp.route("/documents", methods=["GET"])
@admin_only
@api_response
def list_documents():
    documents = []
    base_path = current_app.config["UPLOAD_FOLDER"]
    categories = ["image", "pdf", "other"]

    for category in categories:
        category_path = os.path.join(base_path, category)
        if os.path.exists(category_path):
            for filename in os.listdir(category_path):
                file_path = os.path.join(category_path, filename)
                if os.path.isfile(file_path):
                    file_stats = os.stat(file_path)
                    documents.append(
                        {
                            "filename": filename,
                            "category": category,
                            "path": file_path,
                            "size": file_stats.st_size,
                            "size_formatted": format_file_size(file_stats.st_size),
                            "created": datetime.fromtimestamp(
                                file_stats.st_ctime
                            ).isoformat(),
                            "modified": datetime.fromtimestamp(
                                file_stats.st_mtime
                            ).isoformat(),
                        }
                    )

    documents.sort(key=lambda x: x["created"], reverse=True)
    return {"documents": documents, "total": len(documents)}


@admin_bp.route("/documents/<category>/<filename>/download", methods=["GET"])
@admin_only
def download_document(category, filename):
    if category not in ["image", "pdf", "other"]:
        return jsonify({"success": False, "message": "Invalid category"}), 400

    base_path = current_app.config["UPLOAD_FOLDER"]
    file_path = os.path.join(base_path, category, filename)

    if not os.path.exists(file_path):
        return jsonify({"success": False, "message": "File not found"}), 404

    abs_file_path = os.path.abspath(file_path)
    abs_user_data = os.path.abspath(base_path)
    if not abs_file_path.startswith(abs_user_data):
        return jsonify({"success": False, "message": "Invalid file path"}), 403

    return send_file(file_path, as_attachment=True, download_name=filename)


@admin_bp.route("/documents/<category>/<filename>/view", methods=["GET"])
@admin_only
def view_document(category, filename):
    if category not in ["image", "pdf", "other"]:
        return jsonify({"success": False, "message": "Invalid category"}), 400

    base_path = current_app.config["UPLOAD_FOLDER"]
    file_path = os.path.join(base_path, category, filename)

    if not os.path.exists(file_path):
        return jsonify({"success": False, "message": "File not found"}), 404

    abs_file_path = os.path.abspath(file_path)
    abs_user_data = os.path.abspath(base_path)
    if not abs_file_path.startswith(abs_user_data):
        return jsonify({"success": False, "message": "Invalid file path"}), 403

    return send_file(file_path)


@admin_bp.route("/delete-document", methods=["POST"])
@admin_only
@api_response
def delete_document():
    category = request.form.get("category")
    filename = request.form.get("filename")

    if not category or not filename:
        return {"success": False, "message": "Category and filename are required"}, 400

    if category not in ["image", "pdf", "other"]:
        return {"success": False, "message": "Invalid category"}, 400

    base_path = current_app.config["UPLOAD_FOLDER"]
    file_path = os.path.join(base_path, category, filename)

    if not os.path.exists(file_path):
        return {"success": False, "message": "File not found"}, 404

    abs_file_path = os.path.abspath(file_path)
    abs_user_data = os.path.abspath(base_path)
    if not abs_file_path.startswith(abs_user_data):
        return {"success": False, "message": "Invalid file path"}, 403

    try:
        os.remove(file_path)
        return {
            "success": True,
            "message": f"'{filename}' has been deleted successfully",
        }
    except Exception as e:
        return {"success": False, "message": f"Failed to delete file: {str(e)}"}, 500


@admin_bp.route("/documents/stats", methods=["GET"])
@admin_only
@api_response
def document_stats():
    stats = {
        "total_files": 0,
        "total_size": 0,
        "total_size_formatted": "0 B",
        "by_category": {},
    }

    base_path = current_app.config["UPLOAD_FOLDER"]
    categories = ["image", "pdf", "other"]

    for category in categories:
        category_path = os.path.join(base_path, category)
        category_stats = {"count": 0, "size": 0, "size_formatted": "0 B"}

        if os.path.exists(category_path):
            for filename in os.listdir(category_path):
                file_path = os.path.join(category_path, filename)
                if os.path.isfile(file_path):
                    file_size = os.path.getsize(file_path)
                    category_stats["count"] += 1
                    category_stats["size"] += file_size
                    stats["total_files"] += 1
                    stats["total_size"] += file_size

        category_stats["size_formatted"] = format_file_size(category_stats["size"])
        stats["by_category"][category] = category_stats

    stats["total_size_formatted"] = format_file_size(stats["total_size"])
    return {"stats": stats}
