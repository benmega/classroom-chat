"""
File: tasks.py
Type: py
Summary: Background scheduler tasks for periodic session cleanup.
"""

import logging

from application.extensions import db, scheduler
from application.utilities.session_cleanup import close_stale_sessions
from sqlalchemy.exc import OperationalError, ProgrammingError

logger = logging.getLogger(__name__)

_app_instance = None


def set_app_instance(app):
    global _app_instance
    _app_instance = app


@scheduler.task("interval", id="session_cleanup", minutes=1)
def scheduled_cleanup():
    try:
        logger.debug("Starting scheduled session cleanup")

        if _app_instance is None:
            logger.error("App instance not set for scheduler")
            return

        with _app_instance.app_context():
            try:
                count = close_stale_sessions(
                    timeout_minutes=_app_instance.config["SESSION_STALE_TIMEOUT_MINUTES"]
                )
            except Exception:
                # Leave no half-finished transaction behind on the pooled connection.
                db.session.rollback()
                raise
            if count:
                logger.info(f"Closed {count} stale sessions")
            else:
                logger.debug("No stale sessions found")

    except (OperationalError, ProgrammingError) as e:
        # Tables are missing or mid-migration (e.g. during 'flask db upgrade'): skip
        # this tick instead of logging a traceback every minute until the schema exists.
        logger.warning(f"Session cleanup skipped (schema not ready): {e!s}")
    except Exception as e:
        logger.exception(f"Error in scheduled cleanup: {e!s}")
        raise
