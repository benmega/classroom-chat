from application.utilities.session_cleanup import close_stale_sessions
from application.extensions import scheduler
import logging

logger = logging.getLogger(__name__)

# Store the app instance globally for the scheduler
_app_instance = None


def set_app_instance(app):
    global _app_instance
    _app_instance = app


@scheduler.task('interval', id='session_cleanup', minutes=1)  # Changed to 1 minute for better performance
def scheduled_cleanup():
    try:
        logger.info("Starting scheduled session cleanup")
        print("Running scheduled session cleanup...")

        if _app_instance is None:
            logger.error("App instance not set for scheduler")
            return

        with _app_instance.app_context():
            count = close_stale_sessions()
            if count:
                logger.info(f"Closed {count} stale sessions")
                print(f"Closed {count} stale sessions")
            else:
                logger.info("No stale sessions found")
                print("No stale sessions found")

    except Exception as e:
        logger.error(f"Error in scheduled cleanup: {str(e)}")
        print(f"Error in scheduled cleanup: {str(e)}")
        raise