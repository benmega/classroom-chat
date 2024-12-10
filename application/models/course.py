from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from application.extensions import db

class Course(db.Model):
    __tablename__ = 'courses'

    id = db.Column(db.String(64), primary_key=True)  # Matches the 'course' query parameter
    name = db.Column(db.String(255), nullable=False)
    domain = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, default="No description provided.")
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<Course(id={self.id}, name={self.name}, domain={self.domain})>"
