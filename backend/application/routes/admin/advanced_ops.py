import os
import threading
import time

from application.decorators.admin_required import admin_only
from application.decorators.api_response import api_response
from application.extensions import db
from application.models.message import Message, message_classrooms, message_users
from sqlalchemy import func, select

from ..admin_routes import admin_bp

# Counting every table is the costly part of the stats, and the figures only need to be
# roughly current: they are reused for this many seconds
TABLE_COUNTS_TTL_SECONDS = 30
_table_counts_cache = {"at": None, "counts": None}
_table_counts_lock = threading.Lock()

# Kept between calls: a Process measures CPU use since its previous cpu_percent() call
_cpu_process = None


def _table_counts():
    """Row count of every model, recomputed at most once per TABLE_COUNTS_TTL_SECONDS."""
    with _table_counts_lock:
        cached_at = _table_counts_cache["at"]
        if cached_at is not None and time.monotonic() - cached_at < TABLE_COUNTS_TTL_SECONDS:
            return dict(_table_counts_cache["counts"])
        counts = {
            mapper.class_.__name__: db.session.scalar(
                select(func.count()).select_from(mapper.class_)
            )
            for mapper in db.Model.registry.mappers
        }
        _table_counts_cache.update(at=time.monotonic(), counts=counts)
        return dict(counts)


def _forget_table_counts():
    with _table_counts_lock:
        _table_counts_cache.update(at=None, counts=None)


@admin_bp.route("/advanced/purge-history", methods=["POST"])
@admin_only
@api_response
def purge_history():
    """
    Permanently deletes all message and conversation history.
    This is a destructive action.
    """
    try:
        num_messages = Message.query.count()
        # SQLite does not enforce the audience tables' ON DELETE CASCADE here, and it
        # reuses message ids, so a later message would inherit a purged one's audience
        db.session.execute(message_classrooms.delete())
        db.session.execute(message_users.delete())
        Message.query.delete(synchronize_session=False)

        db.session.commit()
        _forget_table_counts()

        return {
            "message": "History purged successfully.",
            "deleted_messages": num_messages,
        }
    except Exception as e:
        db.session.rollback()
        return {"error": f"Failed to purge history: {e!s}"}, 500


@admin_bp.route("/advanced/stats-extended", methods=["GET"])
@admin_only
@api_response
def get_extended_stats():
    """
    Returns more detailed server and database statistics.
    """
    import psutil

    global _cpu_process

    # Process stats
    if _cpu_process is None:
        _cpu_process = psutil.Process(os.getpid())
    process = _cpu_process
    memory_info = process.memory_info()

    return {
        "memory_usage_mb": round(memory_info.rss / (1024 * 1024), 2),
        # Non-blocking: CPU use since the previous call (0.0 on the very first one)
        "cpu_percent": process.cpu_percent(interval=None),
        "table_counts": _table_counts(),
        "uptime_seconds": round(time.time() - process.create_time(), 0),
    }
