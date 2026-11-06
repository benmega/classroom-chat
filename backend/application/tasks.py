"""Background scheduler tasks for periodic session cleanup."""

import logging
import re

from application.extensions import db, scheduler
from application.utilities.session_cleanup import close_stale_sessions
from sqlalchemy.exc import OperationalError, ProgrammingError

logger = logging.getLogger(__name__)

_app_instance = None

# What the database says when a table does not exist yet: SQLite, PostgreSQL, MySQL.
_MISSING_TABLE = re.compile(r"no such table|relation .* does not exist|table .* doesn't exist")


def _is_missing_table(error):
    """True when ``error`` only says that a table is not there (yet), as opposed to
    a locked database or any other failure that must be reported."""
    return bool(_MISSING_TABLE.search(str(getattr(error, "orig", None) or error).lower()))


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
        if _is_missing_table(e):
            # Tables are missing or mid-migration (e.g. during 'flask db upgrade'): skip
            # this tick instead of logging a traceback every minute until the schema exists.
            logger.warning(f"Session cleanup skipped (schema not ready): {e!s}")
        else:
            # "database is locked" and the like are real problems: name them. The next
            # tick tries again, so there is nothing to re-raise.
            logger.exception(f"Session cleanup failed ({type(e).__name__}): {e!s}")
    except Exception as e:
        logger.exception(f"Error in scheduled cleanup: {e!s}")
        raise
