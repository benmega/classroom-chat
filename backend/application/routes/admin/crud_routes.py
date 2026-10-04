from datetime import date, datetime, timezone

from application.decorators.admin_required import admin_only
from application.extensions import db
from application.models.banned_words import BannedWords
from application.models.classroom import Classroom
from application.models.user import User
from application.services import moderation_service
from flask import Blueprint, current_app, jsonify, request
from sqlalchemy import Enum, String, false, inspect, or_
from sqlalchemy.exc import DataError, DBAPIError, IntegrityError, SQLAlchemyError, StatementError
from sqlalchemy.orm import lazyload

crud_bp = Blueprint("admin_crud", __name__)

# Fields that should never be exposed or edited via the admin UI
_PROTECTED_FIELDS = {"password_hash", "password"}

# Query args that are list controls (or handled specially), never column filters
_RESERVED_ARGS = {"_sort", "_order", "_start", "_end", "q", "id"}

# Upper bound on rows per list request. Callers that send no range (e.g. the
# course pickers on the admin pages) get this many rows instead of the whole table.
_MAX_PAGE_SIZE = 1000


class _ApiError(Exception):
    """Raised by helpers and rendered as a JSON error response."""

    def __init__(self, message, status=400):
        super().__init__(message)
        self.message = message
        self.status = status


@crud_bp.errorhandler(_ApiError)
def _handle_api_error(err):
    return jsonify({"error": err.message}), err.status


@crud_bp.route("/schema/<resource>", methods=["GET"])
@admin_only
def get_schema(resource):
    """Return column metadata for a resource so the frontend can auto-generate fields."""
    model = get_model(resource)
    if not model:
        return jsonify({"error": "Resource not found"}), 404

    inspector = inspect(model)
    fields = []

    for col in inspector.mapper.column_attrs:
        column = col.columns[0]  # Column object
        col_name = col.key

        if col_name in _PROTECTED_FIELDS:
            continue

        # Derive a simple type string the frontend can switch on
        type_str = type(
            column.type
        ).__name__.upper()  # e.g. VARCHAR, INTEGER, BOOLEAN, DATETIME, TEXT

        # Collect foreign key targets (e.g. "users.id")
        fk_targets = [fk.target_fullname for fk in column.foreign_keys]

        field = {
            "name": col_name,
            "type": type_str,
            "nullable": column.nullable,
            "primary_key": column.primary_key,
            "foreign_keys": fk_targets,
        }
        # Allowed values, so the frontend can render a select instead of free text
        if isinstance(column.type, Enum):
            field["enums"] = list(column.type.enums)
        fields.append(field)

    return jsonify({"resource": resource, "fields": fields})


# Cache of lowercase resource name -> model, rebuilt if the set of models changes.
_model_lookup_cache = {"size": -1, "models": {}}


def _model_lookup():
    mappers = db.Model.registry.mappers
    if _model_lookup_cache["size"] != len(mappers):
        lookup = {}
        names = [(mapper.class_, mapper.class_.__name__.lower()) for mapper in mappers]
        # Exact class names are registered first so they win over another class's "<name>s" plural
        for cls, key in names + [(cls, f"{name}s") for cls, name in names]:
            if lookup.setdefault(key, cls) is not cls:
                current_app.logger.warning(
                    "Admin CRUD resource name '%s' is ambiguous (%s, %s); using %s",
                    key, lookup[key].__name__, cls.__name__, lookup[key].__name__,
                )
        _model_lookup_cache.update(size=len(mappers), models=lookup)
    return _model_lookup_cache["models"]


def get_model(resource_name):
    """Map resource name (plural or singular) to SQLAlchemy model class."""
    # This matches the names used in init_admin (Flask-Admin)
    return _model_lookup().get(resource_name.lower())


def _columns(model):
    """Mapped column attributes keyed by attribute name (e.g. User._username)."""
    return {c.key: c.columns[0] for c in inspect(model).mapper.column_attrs}


def model_to_dict(obj):
    """Generic model to dictionary conversion.

    Serialized strictly from the mapped columns (never obj.to_dict) so the record
    keys always match get_schema and a PUT of the record round-trips.
    """
    data = {}
    for col in inspect(obj).mapper.column_attrs:
        if col.key in _PROTECTED_FIELDS:
            continue
        value = getattr(obj, col.key)
        # Naive ISO strings, as stored: the date/time inputs parse these directly
        data[col.key] = value.isoformat() if isinstance(value, (date, datetime)) else value
    return data


def _py_type(column):
    try:
        return column.type.python_type
    except NotImplementedError:
        return None


def _parse_temporal(py_type, raw):
    """Parse an ISO-8601 date/datetime string; '' clears the value. Raises ValueError."""
    if raw == "":
        return None
    if py_type is date:
        return date.fromisoformat(raw)
    parsed = datetime.fromisoformat(raw[:-1] + "+00:00" if raw.endswith("Z") else raw)
    if parsed.tzinfo is not None:
        # Columns hold naive UTC
        parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)
    return parsed


def _from_query(column, raw):
    """Convert a query-string value to the column's Python type. Raises ValueError."""
    py_type = _py_type(column)
    if py_type is bool:
        if raw.lower() in ("1", "true"):
            return True
        if raw.lower() in ("0", "false"):
            return False
        raise ValueError(raw)
    if py_type in (int, float):
        return py_type(raw)
    if py_type in (date, datetime):
        return _parse_temporal(py_type, raw)
    return raw


def _coerce_values(columns, values):
    """Turn ISO date/time strings from the JSON body into Python objects for temporal columns."""
    coerced = dict(values)
    for key, value in values.items():
        py_type = _py_type(columns[key])
        if py_type not in (date, datetime) or value is None:
            continue
        if not isinstance(value, str):
            raise _ApiError(f"'{key}' must be an ISO date/time string")
        try:
            coerced[key] = _parse_temporal(py_type, value)
        except ValueError:
            raise _ApiError(f"'{key}' is not a valid ISO date/time: {value!r}") from None
    return coerced


def _int_arg(name, default):
    raw = request.args.get(name)
    if raw in (None, ""):
        return default
    try:
        return int(raw)
    except ValueError:
        raise _ApiError(f"{name} must be an integer") from None


def _page_window():
    """Return (offset, limit) for the request, always bounded by _MAX_PAGE_SIZE."""
    start = _int_arg("_start", 0)
    end = _int_arg("_end", None)
    if start < 0:
        raise _ApiError("_start must not be negative")
    if end is None:
        return start, _MAX_PAGE_SIZE
    if end <= start:
        raise _ApiError("_end must be greater than _start")
    return start, min(end - start, _MAX_PAGE_SIZE)


def _escape_like(text):
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _json_body():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise _ApiError("JSON object body required")
    return data


def _banned_words_changed(item):
    """Moderation caches the banned words, so a change to one must drop that cache."""
    if isinstance(item, BannedWords):
        moderation_service.clear_cache()


def _commit():
    """Commit the session; on failure roll back and raise a JSON error for the admin UI."""
    try:
        db.session.commit()
    except SQLAlchemyError as exc:
        db.session.rollback()
        detail = getattr(exc, "orig", None) or exc
        if isinstance(exc, IntegrityError):
            current_app.logger.warning("Admin CRUD integrity error: %s", detail)
            raise _ApiError(f"Integrity error: {detail}", 409) from exc
        # DataError is a DBAPIError; a bare StatementError is a value the column type rejected
        if isinstance(exc, DataError) or (isinstance(exc, StatementError) and not isinstance(exc, DBAPIError)):
            current_app.logger.warning("Admin CRUD invalid value: %s", detail)
            raise _ApiError(f"Invalid value: {detail}", 400) from exc
        current_app.logger.exception("Admin CRUD database error")
        raise _ApiError("Database error", 500) from exc


@crud_bp.route("/<resource>", methods=["GET"])
@admin_only
def get_list(resource):
    model = get_model(resource)
    if not model:
        return jsonify({"error": "Resource not found"}), 404

    mapper = inspect(model).mapper
    filterable = {k: c for k, c in _columns(model).items() if k not in _PROTECTED_FIELDS}
    pk_column = mapper.primary_key[0]
    pk_attr = getattr(model, mapper.get_property_by_column(pk_column).key)
    window = _page_window()

    # Loaders configured on the models (selectin) would fetch relationships we never serialize
    query = model.query.options(lazyload("*"))

    # react-admin getMany sends the wanted primary keys as repeated ?id=
    ids = request.args.getlist("id")
    if ids:
        wanted = []
        for raw in ids:
            try:
                wanted.append(_from_query(pk_column, raw))
            except ValueError:
                continue  # cannot match any row
        query = query.filter(pk_attr.in_(wanted))

    # Exact-match filters on real, non-protected columns; repeated keys mean "any of"
    for key, values in request.args.lists():
        if key in _RESERVED_ARGS:
            continue
        if key not in filterable:
            raise _ApiError(f"Unknown filter field '{key}'")
        try:
            coerced = [_from_query(filterable[key], v) for v in values]
        except ValueError:
            raise _ApiError(f"Invalid value for filter '{key}'") from None
        attr = getattr(model, key)
        query = query.filter(attr == coerced[0] if len(coerced) == 1 else attr.in_(coerced))

    # Free-text search across the string columns
    q = (request.args.get("q") or "").strip()
    if q:
        pattern = f"%{_escape_like(q)}%"
        clauses = [
            getattr(model, key).ilike(pattern, escape="\\")
            for key, column in filterable.items()
            if isinstance(column.type, String) and not isinstance(column.type, Enum)
        ]
        query = query.filter(or_(*clauses) if clauses else false())

    total = query.count()

    # Sorting: unknown or protected fields are ignored; the primary key keeps paging stable
    ordering = []
    sort_field = request.args.get("_sort")
    if sort_field in filterable:
        attr = getattr(model, sort_field)
        descending = request.args.get("_order", "").upper() == "DESC"
        ordering.append(attr.desc() if descending else attr.asc())
    ordering.append(pk_attr)

    start, limit = window
    items = query.order_by(*ordering).offset(start).limit(limit).all()

    data = [model_to_dict(item) for item in items]
    return jsonify({"data": data, "total": total})


@crud_bp.route("/<resource>/<id>", methods=["GET"])
@admin_only
def get_one(resource, id):
    model = get_model(resource)
    if not model:
        return jsonify({"error": "Resource not found"}), 404

    item = db.session.get(model, id)
    if not item:
        return jsonify({"error": "Item not found"}), 404

    return jsonify({"data": model_to_dict(item)})


@crud_bp.route("/<resource>", methods=["POST"])
@admin_only
def create(resource):
    model = get_model(resource)
    if not model:
        return jsonify({"error": "Resource not found"}), 404

    params = _json_body()
    # Prevent mass assignment of sensitive fields
    protected = {"password_hash", "password", "created_at"}
    if resource.lower() not in {
        "course",
        "courses",
        "courseinstance",
        "courseinstances",
        "classroom",
        "classrooms",
    }:
        protected.add("id")

    filtered_params = {k: v for k, v in params.items() if k not in protected}

    columns = _columns(model)
    unknown = sorted(set(filtered_params) - set(columns))
    if unknown:
        raise _ApiError(f"Unknown field(s): {', '.join(unknown)}")

    item = model(**_coerce_values(columns, filtered_params))
    db.session.add(item)
    _commit()
    _banned_words_changed(item)

    if isinstance(item, Classroom):
        # Connected admins read every classroom: put their sockets in the new room
        from application.socket_events import sync_admin_rooms

        sync_admin_rooms()

    return jsonify({"data": model_to_dict(item)})


@crud_bp.route("/<resource>/<id>", methods=["PUT"])
@admin_only
def update(resource, id):
    model = get_model(resource)
    if not model:
        return jsonify({"error": "Resource not found"}), 404

    item = db.session.get(model, id)
    if not item:
        return jsonify({"error": "Item not found"}), 404

    params = _json_body()
    # Prevent mass assignment of sensitive fields
    protected = {"id", "password_hash", "password", "created_at"}

    # react-admin PUTs the whole record: ignore anything that is not a plain column
    columns = _columns(model)
    values = {k: v for k, v in params.items() if k not in protected and k in columns}

    for key, value in _coerce_values(columns, values).items():
        setattr(item, key, value)

    _commit()
    _banned_words_changed(item)

    if isinstance(item, User) and "role" in values:
        # Promoted/demoted: their open sockets gain or lose the admin rooms
        from application.socket_events import sync_user_rooms

        sync_user_rooms(item.id)

    return jsonify({"data": model_to_dict(item)})


@crud_bp.route("/<resource>/<id>", methods=["DELETE"])
@admin_only
def delete(resource, id):
    model = get_model(resource)
    if not model:
        return jsonify({"error": "Resource not found"}), 404

    item = db.session.get(model, id)
    if not item:
        return jsonify({"error": "Item not found"}), 404

    db.session.delete(item)
    _commit()
    _banned_words_changed(item)

    if isinstance(item, Classroom):
        from application.socket_events import close_classroom_room

        close_classroom_room(id)

    return jsonify({"data": {"id": id}})
