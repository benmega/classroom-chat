"""
File: constants.py
Type: py
Summary: Application-level constants for multi-tenant classroom architecture.
         Import these symbols everywhere — never use raw strings to identify
         the global classroom.
"""

# ---------------------------------------------------------------------------
# Global Classroom — a reserved classroom that every authenticated user can
# read regardless of enrollment status.  Only admins may post to it.
# ---------------------------------------------------------------------------
GLOBAL_CLASSROOM_ID: str = "global"
