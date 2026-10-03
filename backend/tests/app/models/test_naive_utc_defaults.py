"""
File: test_naive_utc_defaults.py
Type: py
Summary: Column defaults that stamp a time keep the naive-UTC value the deprecated
         datetime.utcnow() produced, so stored rows stay comparable with each other.
"""

from datetime import timedelta

from application.extensions import db
from application.utilities.helper_functions import utcnow_naive
from sqlalchemy import DateTime


def test_python_side_datetime_defaults_are_naive_utc(app):
    checked = []
    # Walk the metadata, not the mappers, so plain join tables are covered too
    for table in db.metadata.tables.values():
        for column in table.columns:
            default = column.default
            if not isinstance(column.type, DateTime) or default is None or not default.is_callable:
                continue
            before = utcnow_naive()
            value = default.arg(None)
            after = utcnow_naive()

            label = f"{table.name}.{column.name}"
            assert value.tzinfo is None, label
            # Not a clock reading from another zone: it sits between two UTC readings
            assert before - timedelta(seconds=5) <= value <= after + timedelta(seconds=5), label
            checked.append(label)

    # The models changed in this sweep, plus the ones that already used the helper
    for label in (
        "users.created_at",
        "messages.created_at",
        "notes.created_at",
        "duck_transactions.timestamp",
        "classrooms.created_at",
        "user_classrooms.enrolled_at",
        "session_logs.last_seen",
    ):
        assert label in checked
