from flask import Blueprint, jsonify, request
from application.extensions import db
from application.decorators.admin_required import admin_only
from sqlalchemy import inspect


crud_bp = Blueprint("admin_crud", __name__)

def get_model(resource_name):
    """Map resource name (plural or singular) to SQLAlchemy model class."""
    # This matches the names used in init_admin (Flask-Admin)
    for mapper in db.Model.registry.mappers:
        model = mapper.class_
        if model.__name__.lower() == resource_name.lower() or \
           f"{model.__name__.lower()}s" == resource_name.lower():
            return model
    return None

def model_to_dict(obj):
    """Generic model to dictionary conversion."""
    if hasattr(obj, 'to_dict'):
        return obj.to_dict()
    
    return {c.key: getattr(obj, c.key) for c in inspect(obj).mapper.column_attrs}

@crud_bp.route("/<resource>", methods=["GET"])
@admin_only
def get_list(resource):
    model = get_model(resource)
    if not model:
        return jsonify({"error": "Resource not found"}), 404
    
    # Handle pagination/sorting if needed for react-admin
    # Simple implementation for now
    items = model.query.all()
    
    # React-admin expects [ { id: 1, ... }, ... ] 
    # And an X-Total-Count header or a wrapped response
    data = [model_to_dict(item) for item in items]
    
    # We'll use a wrapped response that our dataProvider can understand
    return jsonify({
        "data": data,
        "total": len(data)
    })

@crud_bp.route("/<resource>/<id>", methods=["GET"])
@admin_only
def get_one(resource, id):
    model = get_model(resource)
    if not model:
        return jsonify({"error": "Resource not found"}), 404
    
    item = model.query.get(id)
    if not item:
        return jsonify({"error": "Item not found"}), 404
    
    return jsonify({"data": model_to_dict(item)})

@crud_bp.route("/<resource>", methods=["POST"])
@admin_only
def create(resource):
    model = get_model(resource)
    if not model:
        return jsonify({"error": "Resource not found"}), 404
    
    params = request.json
    # Prevent mass assignment of sensitive fields
    protected = {"id", "password_hash", "created_at"}
    filtered_params = {k: v for k, v in params.items() if k not in protected}
    
    item = model(**filtered_params)
    db.session.add(item)
    db.session.commit()
    
    return jsonify({"data": model_to_dict(item)})

@crud_bp.route("/<resource>/<id>", methods=["PUT"])
@admin_only
def update(resource, id):
    model = get_model(resource)
    if not model:
        return jsonify({"error": "Resource not found"}), 404
    
    item = model.query.get(id)
    if not item:
        return jsonify({"error": "Item not found"}), 404
    
    params = request.json
    # Prevent mass assignment of sensitive fields
    protected = {"id", "password_hash", "created_at"}
    
    for key, value in params.items():
        if key not in protected and hasattr(item, key):
            setattr(item, key, value)
            
    db.session.commit()
    return jsonify({"data": model_to_dict(item)})

@crud_bp.route("/<resource>/<id>", methods=["DELETE"])
@admin_only
def delete(resource, id):
    model = get_model(resource)
    if not model:
        return jsonify({"error": "Resource not found"}), 404
    
    item = model.query.get(id)
    if not item:
        return jsonify({"error": "Item not found"}), 404
    
    db.session.delete(item)
    db.session.commit()
    return jsonify({"data": {"id": id}})
