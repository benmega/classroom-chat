from sqlalchemy.ext.hybrid import hybrid_property

from application.extensions import db
from werkzeug.security import generate_password_hash, check_password_hash

from application.models.challenge_log import ChallengeLog
from application.models.project import Project
from application.models.skill import Skill


class User(db.Model):
    @property
    def username(self):
        return self._username

    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    _username = db.Column("username", db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    profile_picture = db.Column(db.String(150), default="Default_pfp.jpg")
    ip_address = db.Column(db.String(45), nullable=True)
    is_online = db.Column(db.Boolean, default=False)
    ducks = db.Column(db.Integer, nullable=False, default=0)  # Tracks the total ducks earned

    # Relationships
    skills = db.relationship('Skill', backref='user', lazy=True)
    projects = db.relationship('Project', backref='user', lazy=True)

    def __repr__(self):
        return f'<User {self._username}>'

    @hybrid_property
    def username(self):
        return self._username

    @username.setter
    def username(self, value):
        self._username = value.lower()

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
        total_challenges = ChallengeLog.query.filter_by(username=self._username, domain=domain).count()
        return total_challenges  # Modify if you want percentages based on predefined thresholds.

    @property
    def codecombat_progress(self):
        """Calculate CodeCombat progress as a percentage of completed challenges (rounded for readability)."""
        from application.models.challenge import Challenge
        total_challenges = Challenge.query.filter_by(domain="codecombat.com").count()
        completed_challenges = ChallengeLog.query.filter_by(username=self._username, domain="codecombat.com").count()

        # Calculate progress percentage and round to 4 significant figures
        progress = (completed_challenges / total_challenges) * 100 if total_challenges > 0 else 0
        return round(progress, 3) if progress >= 10 else round(progress, 2)

    def add_skill(self, skill_name):
        """Add a skill to the user."""
        new_skill = Skill(name=skill_name, user_id=self.id)
        db.session.add(new_skill)
        db.session.commit()

    def remove_skill(self, skill_id):
        """Remove a skill by ID."""
        skill = Skill.query.get(skill_id)
        if skill and skill.user_id == self.id:
            db.session.delete(skill)
            db.session.commit()

    def add_project(self, name, description=None, link=None):
        """Add a project to the user."""
        new_project = Project(name=name, description=description, link=link, user_id=self.id)
        db.session.add(new_project)
        db.session.commit()

    def remove_project(self, project_id):
        """Remove a project by ID."""
        project = Project.query.get(project_id)
        if project and project.user_id == self.id:
            db.session.delete(project)
            db.session.commit()
