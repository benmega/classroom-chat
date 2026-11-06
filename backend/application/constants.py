"""
Application-level constants for multi-tenant classroom architecture.
Import these symbols everywhere — never use raw strings to identify
the global classroom.
"""

# Reserved classroom every authenticated user can read; only admins may post to it.
GLOBAL_CLASSROOM_ID: str = "global"
