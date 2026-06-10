"""
File: parent_student.py
Type: py
Summary: Many-to-many association table linking parent users to student users.
"""

from ..extensions import db

parent_students = db.Table(
    "parent_students",
    db.Column(
        "parent_id",
        db.Integer,
        db.ForeignKey("users.id"),
        primary_key=True,
    ),
    db.Column(
        "student_id",
        db.Integer,
        db.ForeignKey("users.id"),
        primary_key=True,
    ),
    db.UniqueConstraint("parent_id", "student_id", name="uq_parent_student"),
)
