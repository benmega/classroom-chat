"""
File: user.py
Type: py
Summary: SQLAlchemy model for application users and authentication data.
"""

from datetime import date, timedelta

from sqlalchemy.ext.hybrid import hybrid_property

from application.extensions import db
from werkzeug.security import generate_password_hash, check_password_hash

from application.models.challenge_log import ChallengeLog
from application.models.project import Project
from application.models.session_log import SessionLog
from application.models.skill import Skill

def default_nickname(context):
    return context.get_current_parameters().get("username")

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    _username = db.Column("username", db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    profile_picture = db.Column(db.String(150), default="Default_pfp.jpg")
    ip_address = db.Column(db.String(45), nullable=True)
    is_online = db.Column(db.Boolean, default=False)
    nickname = db.Column(db.String(50), nullable=False, default=default_nickname)
    is_admin = db.Column(db.Boolean, default=False)

    # New column to store notes' URLs on S3
    notes_urls = db.Column(db.Text, nullable=True)  # Consider a separate table for normalization if multiple notes

    # Gamification
    packets = db.Column(db.Double, nullable=False, default=0)
    earned_ducks = db.Column(db.Double, nullable=False, default=0)
    duck_balance = db.Column(db.Double, nullable=False, default=0)
    last_daily_duck = db.Column(db.Date, nullable=True)



    # Relationships
    skills = db.relationship('Skill', backref='user', lazy=True)
    projects = db.relationship('Project', backref='user', lazy=True)
    achievements = db.relationship(
        'UserAchievement',
        backref='user',
        lazy=True,
        cascade="all, delete-orphan"
    )
    certificates = db.relationship(
        'UserCertificate',
        backref='user',
        lazy=True,
        cascade="all, delete-orphan"
    )
    challenge_logs = db.relationship(
        'ChallengeLog',
        primaryjoin='User._username == foreign(ChallengeLog.username)',
        lazy=True,
        viewonly=True  # Recommended since ChallengeLog.username isn't a foreign key
    )


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

    def default_nickname(context):
        return context.get_current_parameters().get("username")
    @classmethod
    def set_online(cls, user_id, online=True):
        """Toggle user online/offline and manage session logs."""
        user = cls.query.filter_by(id=user_id).first()
        if not user:
            return

        if online:
            # Start new session if none active
            if not SessionLog.query.filter_by(user_id=user.id, end_time=None).first():
                SessionLog.start_session(user.id)
            user.is_online = True
        else:
            # End the most recent session
            SessionLog.end_session(user.id)
            user.is_online = False

        db.session.commit()

    def get_progress(self, domain):
        """Calculate progress based on challenges completed for a specific domain."""
        total_challenges = ChallengeLog.query.filter_by(username=self._username, domain=domain).count()
        return total_challenges  # Modify if you want percentages based on predefined thresholds.


    def get_progress_percent(self, domain):
        """Calculate CodeCombat progress as a percentage of completed challenges (rounded for readability)."""
        from application.models.challenge import Challenge
        total_challenges = Challenge.query.filter_by(domain=domain).count()
        completed_challenges = ChallengeLog.query.filter_by(username=self._username, domain=domain).count()


        progress = (completed_challenges / total_challenges) * 100 if total_challenges > 0 else 0
        return int(round(progress, 0))

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

    def add_ducks(self, amount):
        self.earned_ducks += amount
        self.packets += amount / (2**14)
        self.duck_balance += amount
        db.session.commit()

    def award_daily_duck(self, amount=1):
        today = date.today()
        if self.last_daily_duck != today:
            self.add_ducks(amount)
            self.last_daily_duck = today
            db.session.commit()
            return True
        return False

    def get_contribution_data(self):
        """
        Prepares data for a GitHub-style contribution graph.
        Returns: {
            'months': [{'name': 'Jan', 'colspan': 4}, ...],
            'rows': [[{date, count, level}, ...], ...] # 7 rows (Sun-Sat)
        }
        """
        # 1. Setup Dates
        today = date.today()
        # Align end date to the coming Saturday to complete the grid
        idx = (today.weekday() + 1) % 7  # 0 = Sun
        end_date = today + timedelta(days=(6 - idx))
        start_date = end_date - timedelta(weeks=52)  # Go back 52 weeks

        # 2. Fetch Data
        logs = self.challenge_logs
        counts = {}
        for log in logs:
            k = log.timestamp.date().isoformat()
            counts[k] = counts.get(k, 0) + 1

        # 3. Build Grid (7 rows x 53 columns)
        # grid[weekday][week_index]
        grid = [[None for _ in range(53)] for _ in range(7)]

        current = start_date
        week_idx = 0

        # Track months for the header
        months = []
        current_month = None
        current_colspan = 0

        while current <= end_date:
            weekday = (current.weekday() + 1) % 7  # 0=Sun, 6=Sat

            # Month Logic
            if weekday == 0:  # Check at start of every week
                month_name = current.strftime('%b')
                if month_name != current_month:
                    if current_month:
                        months.append({'name': current_month, 'colspan': current_colspan})
                    current_month = month_name
                    current_colspan = 0
                current_colspan += 1

            # Fill Cell Data
            iso_date = current.isoformat()
            c = counts.get(iso_date, 0)

            # Determine Level (0-4)
            if c == 0:
                level = 0
            elif c == 1:
                level = 1
            elif c <= 3:
                level = 2
            elif c <= 6:
                level = 3
            else:
                level = 4

            grid[weekday][week_idx] = {
                'date': iso_date,
                'count': c,
                'level': level
            }

            if weekday == 6:
                week_idx += 1

            current += timedelta(days=1)

        # Append final month segment
        if current_month:
            months.append({'name': current_month, 'colspan': current_colspan})

        return {'months': months, 'rows': grid}

    def get_completed_levels(self):
        """
        Returns a set of level slugs that the user has completed.
        Used by the skill service to determine Web Dev and other specific course progress.
        """
        # We assume the ChallengeLog model has a 'level_slug' column.
        # Using a set removes duplicates.
        return {getattr(log, 'level_slug', '') for log in self.challenge_logs}