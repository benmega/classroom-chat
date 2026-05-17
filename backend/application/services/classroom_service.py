from sqlalchemy import select
from application.extensions import db
from application.models.classroom import user_classrooms


def get_enrolled_classroom_ids(user_id: int) -> set:
    """Return the set of classroom IDs the user is enrolled in."""
    rows = db.session.execute(
        select(user_classrooms.c.classroom_id).where(
            user_classrooms.c.user_id == user_id
        )
    ).fetchall()
    return {row[0] for row in rows}


def user_enrolled_in(user_id: int, classroom_id: str) -> bool:
    """Return True if the user has an enrollment row for classroom_id."""
    row = db.session.execute(
        select(user_classrooms.c.classroom_id).where(
            user_classrooms.c.user_id == user_id,
            user_classrooms.c.classroom_id == classroom_id,
        )
    ).first()
    return row is not None
