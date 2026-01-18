from application.extensions import db


class Classroom(db.Model):
    """
    Represents a persistent 'room' or group of students (e.g., 'Sat1030 CS 4 PY').
    """
    __tablename__ = "classrooms"

    # Use the MongoDB ID you previously stored as a course instance here
    id = db.Column(db.String(64), primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    language = db.Column(db.String(64))

    # Backref to all course assignments this class has ever had
    course_assignments = db.relationship("CourseInstance", backref="classroom")

    def __repr__(self):
        return f"<Classroom(id={self.id}, name={self.name})>"