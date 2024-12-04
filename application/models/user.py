from application.extensions import db
from werkzeug.security import generate_password_hash, check_password_hash

from application.models.challenge_log import ChallengeLog


class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    ip_address = db.Column(db.String(45), nullable=True)
    is_online = db.Column(db.Boolean, default=False)

    # Relationships
    skills = db.relationship('Skill', backref='user', lazy=True)
    projects = db.relationship('Project', backref='user', lazy=True)

    def __repr__(self):
        return f'<User {self.username}>'

    def set_password(self, password):
        """Generate a hashed password and store it"""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Check the given password against the stored hash"""
        return check_password_hash(self.password_hash, password)

    @classmethod
    def set_online(cls, user_id, online=True):
        user = cls.query.filter_by(id=user_id).first()
        if user:
            user.is_online = online
            db.session.commit()

    def get_progress(self, domain):
        """Calculate progress based on challenges completed for a specific domain."""
        total_challenges = ChallengeLog.query.filter_by(username=self.username, domain=domain).count()
        return total_challenges  # Modify if you want percentages based on predefined thresholds.

    @property
    def codecombat_progress(self):
        """Calculate CodeCombat progress as a percentage of completed challenges."""
        total_challenges = 100  # Set this to the actual total number of challenges in CodeCombat.
        completed_challenges = ChallengeLog.query.filter_by(username=self.username, domain="codecombat.com").count()

        # Calculate progress percentage
        return (completed_challenges / total_challenges) * 100 if total_challenges > 0 else 0

class Skill(db.Model):
    __tablename__ = 'skills'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    def __repr__(self):
        return f'<Skill {self.name}>'


class Project(db.Model):
    __tablename__ = 'projects'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    link = db.Column(db.String(255), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    def __repr__(self):
        return f'<Project {self.name}>'
