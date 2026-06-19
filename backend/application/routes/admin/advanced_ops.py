from application.extensions import db
from application.models.message import Message
from application.decorators.admin_required import admin_only
from application.decorators.api_response import api_response
from ..admin_routes import admin_bp


@admin_bp.route("/advanced/purge-history", methods=["POST"])
@admin_only
@api_response
def purge_history():
    """
    Permanently deletes all message and conversation history.
    This is a destructive action.
    """
    try:
        # Delete all messages first (cascades to target tables)
        num_messages = Message.query.count()
        Message.query.delete(synchronize_session=False)

        db.session.commit()

        return {
            "message": "History purged successfully.",
            "deleted_messages": num_messages,
        }
    except Exception as e:
        db.session.rollback()
        return {"error": f"Failed to purge history: {str(e)}"}, 500


@admin_bp.route("/advanced/stats-extended", methods=["GET"])
@admin_only
@api_response
def get_extended_stats():
    """
    Returns more detailed server and database statistics.
    """
    import psutil
    import os

    # Process stats
    process = psutil.Process(os.getpid())
    memory_info = process.memory_info()

    # DB stats (simple count for now)
    table_counts = {}
    for mapper in db.Model.registry.mappers:
        model = mapper.class_
        table_counts[model.__name__] = model.query.count()

    return {
        "memory_usage_mb": round(memory_info.rss / (1024 * 1024), 2),
        "cpu_percent": process.cpu_percent(interval=0.1),
        "table_counts": table_counts,
        "uptime_seconds": round(psutil.time.time() - process.create_time(), 0),
    }
