"""
File: skill.py
Type: py
Summary: SQLAlchemy model for user skills and tagging.
"""

from sqlalchemy import UniqueConstraint

from application.extensions import db


class Skill(db.Model):
    __tablename__ = "skills"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    # New Fields for Structured Skills
    category = db.Column(
        db.String(50), default="concept"
    )  # 'language', 'tool', 'concept'
    icon = db.Column(db.String(50), default="fas fa-code")  # FontAwesome class
    proficiency = db.Column(db.Integer, default=1)  # 1=Bronze, 2=Silver, 3=Gold

    # Add a unique constraint for name and user_id
    __table_args__ = (UniqueConstraint("name", "user_id", name="uq_skill_name_user"),)

    def __repr__(self):
        return f"{self.name} ({self.category})"
