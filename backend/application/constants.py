

# ---------------------------------------------------------------------------
# Global Classroom — a reserved classroom that every authenticated user can
# read regardless of enrollment status.  Only admins may post to it.
# ---------------------------------------------------------------------------
GLOBAL_CLASSROOM_ID: str = "global"

# ---------------------------------------------------------------------------
# Global Conversation — the single canonical conversation thread that lives
# inside the Global Announcements classroom.  Its integer ID is populated at
# application startup by seed_global_data() in application/__init__.py and
# stored here so the rest of the code can import it as a constant.
# ---------------------------------------------------------------------------
# Default is None — overwritten by seed_global_data() at startup.
GLOBAL_CONVERSATION_ID: int | None = None
