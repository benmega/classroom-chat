

import re

from sqlalchemy.event import listens_for

from ..extensions import db

# ChallengeLog is imported locally within methods


class Challenge(db.Model):
    __tablename__ = "challenges"

    __table_args__ = (
        db.UniqueConstraint("name", "domain", name="uq_challenges_name_domain"),
    )

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    slug = db.Column(db.String(255), nullable=False, unique=True)
    domain = db.Column(db.String(100), nullable=False)
    difficulty = db.Column(db.String(50), nullable=False, default="medium")
    value = db.Column(db.Integer, nullable=False, default=1)
    sequence = db.Column(db.Integer, nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=db.func.now())
    course_id = db.Column(db.String(100), nullable=True)
    classroom_id = db.Column(
        db.String(64),
        db.ForeignKey("classrooms.id", ondelete="SET NULL"),
        nullable=True,
    )
    description = db.Column(db.Text, nullable=True)

    def __repr__(self):
        return f"<Challenge(name={self.name}, domain={self.domain}, difficulty={self.difficulty}, value={self.value})>"

    def scale_value(self, difficulty_multiplier=1.0):
        """Scales the challenge value based on difficulty. Fractions are kept."""
        scale_factors = {"easy": 0.5, "medium": 1.0, "hard": 2.0}
        factor = scale_factors.get(self.difficulty, 1.0)
        return self.value * factor * difficulty_multiplier


def _kebab_slug(text):
    """Kebab-case ``text`` the way challenge slugs are written."""
    slug = re.sub(r"[_\s]+", "-", (text or "").lower())
    slug = re.sub(r"[^a-z0-9-]", "", slug)
    return re.sub(r"-+", "-", slug).strip("-")


@listens_for(Challenge, "before_insert")
def set_default_slug(mapper, connection, target):
    if not target.slug:
        # A name with no letters or digits has no kebab form; keep it as it is.
        target.slug = _kebab_slug(target.name) or target.name
