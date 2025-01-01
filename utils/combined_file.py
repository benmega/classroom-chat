# Start of ai_settings.py
from application.extensions import db


class AISettings(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(50))
    value = db.Column(db.String(1000))

def get_ai_settings():
    # settings = {setting.key: setting.value for setting in AISettings.query.all()}

    defaultRole = '''
        Answer computer science questions about Python.
        The students are learning using the programs Code Combat and Ozaria.
    '''
    settings = {
        'role': defaultRole,
        'username': 'AI Teacher',
        'chat_bot_enabled': 'True'
    }
    return {
        'role': settings.get('role', defaultRole),
        'username': settings.get('username', 'AI Teacher'),
        'chat_bot_enabled': settings.get('chat_bot_enabled', 'False').lower() in ['true', '1', 't']
    }

# End of ai_settings.py

# Start of banned_words.py
from application.extensions import db

class BannedWords(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    word = db.Column(db.String(255), unique=True, nullable=False)
    added_on = db.Column(db.DateTime, default=db.func.current_timestamp())
    reason = db.Column(db.Text, nullable=True)
    active = db.Column(db.Boolean, default=True, nullable=False)

    def __repr__(self):
        return f'<BannedWords {self.word}>'

# End of banned_words.py

# Start of bounty.py
from datetime import datetime
from application.extensions import db

class Bounty(db.Model):
    __tablename__ = 'bounties'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False)  # User who submitted the bounty
    description = db.Column(db.Text, nullable=False)
    bounty = db.Column(db.String, nullable=False)  # Store as a binary string
    expected_behavior = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String, default="Open", nullable=True)
    image_path = db.Column(db.String(255), nullable=True)  # Store relative path to the image file

    def __repr__(self):
        return f"<Bounty {self.id} by User {self.user_id}>"

# End of bounty.py

# Start of challenge.py
from application.extensions import db
from application.models.challenge_log import ChallengeLog
from sqlalchemy.event import listens_for

class Challenge(db.Model):
    __tablename__ = 'challenges'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False, unique=True)  # Challenge name must be unique
    slug = db.Column(db.String(255), nullable=False, unique=True)
    domain = db.Column(db.String(100), nullable=False)
    course_id = db.Column(db.String(100), nullable=True)
    description = db.Column(db.Text, nullable=True)
    difficulty = db.Column(db.String(50), nullable=False, default='medium')
    value = db.Column(db.Integer, nullable=False, default=1)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=db.func.now())




    def __repr__(self):
        return f"<Challenge(name={self.name}, domain={self.domain}, difficulty={self.difficulty}, value={self.value})>"

    # Useful methods
    def complete_challenge(self, user):
        """Logs the challenge completion and updates user progress."""

        log = ChallengeLog(username=user.username, domain=self.domain, challenge_name=self.name)
        db.session.add(log)
        db.session.commit()

    def scale_value(self, difficulty_multiplier=1.0):
        """Scales the challenge value based on difficulty."""
        scale_factors = {'easy': 0.5, 'medium': 1.0, 'hard': 2.0}
        return int(self.value * scale_factors.get(self.difficulty, 1.0) * difficulty_multiplier)
@listens_for(Challenge, 'before_insert')
def set_default_slug(mapper, connection, target):
    if not target.slug:
        target.slug = target.name
# End of challenge.py

# Start of challenge_log.py
from application.extensions import db

class ChallengeLog(db.Model):
    __tablename__ = 'challenge_logs'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), nullable=False)
    domain = db.Column(db.String(100), nullable=False)  # e.g., "CodeCombat", "LeetCode", "HackerRank"
    challenge_name = db.Column(db.String(255), nullable=False)  # Generalized from 'level_name'
    course_id = db.Column(db.String(100), nullable=True)  # Optional for challenges without courses
    course_instance = db.Column(db.String(100), nullable=True)  # Optional for flexibility
    timestamp = db.Column(db.DateTime, nullable=False, default=db.func.now())  # Auto-populates with current time
    # challenge = db.relationship('Challenge', backref='logs', lazy=True)

    def __repr__(self):
        return f"<ChallengeLog(username={self.username}, domain={self.domain}, challenge={self.challenge_name}, timestamp={self.timestamp})>"

# End of challenge_log.py

# Start of configuration.py
from application.extensions import db


class Configuration(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    ai_teacher_enabled = db.Column(db.Boolean, default=False)
    message_sending_enabled = db.Column(db.Boolean, default=False)
# End of configuration.py

# Start of conversation.py
from datetime import datetime
from application.extensions import db

# Association table for many-to-many relationship between users and conversations
conversation_users = db.Table(
    'conversation_users',
    db.Column('conversation_id', db.Integer, db.ForeignKey('conversations.id', ondelete='CASCADE'), primary_key=True),
    db.Column('user_id', db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
)

class Conversation(db.Model):
    __tablename__ = 'conversations'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False, default=lambda: f"New Conversation {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    users = db.relationship('User', secondary=conversation_users, backref=db.backref('conversations', lazy='selectin'), lazy='selectin')
    messages = db.relationship('Message', backref='conversation', lazy='joined', cascade='all, delete-orphan')

    def __repr__(self):
        return f"<Conversation {self.id}: {self.title}>"


# class Conversation(db.Model):
#     __tablename__ = 'conversations'
#     id = db.Column(db.Integer, primary_key=True)
#     title = db.Column(db.String(100), nullable=False, default=lambda: f"Conversation {datetime.utcnow()}")
#     created_at = db.Column(db.DateTime, default=datetime.utcnow)
#
#     # Relationships
#     users = db.relationship('User', secondary=conversation_users, backref=db.backref('conversations', lazy=True))
#     messages = db.relationship('Message', backref='conversation', lazy=True, cascade='all, delete-orphan')


# End of conversation.py

# Start of course.py
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

# End of course.py

# Start of message.py
from datetime import datetime

from sqlalchemy import Enum

from application.extensions import db


class Message(db.Model):
    __tablename__ = 'messages'
    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    message_type = db.Column(Enum("text", "link", "code_snippet", name="message_type_enum"), nullable=False, default="text")
    is_struck = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    edited_at = db.Column(db.DateTime, nullable=True)
    deleted_at = db.Column(db.DateTime, nullable=True)

    # Relationship to the User
    user = db.relationship('User', backref=db.backref('messages', lazy='selectin'))

    def __repr__(self):
        return f"<Message(id={self.id}, conversation_id={self.conversation_id}, user_id={self.user_id})>"


# class Message(db.Model):
#     __tablename__ = 'messages'
#     id = db.Column(db.Integer, primary_key=True)
#     conversation_id = db.Column(db.Integer, db.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False)
#     user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
#     content = db.Column(db.Text, nullable=False)
#     message_type = db.Column(db.String(20), nullable=False, default="text")  # "text", "link", "code_snippet"
#     is_struck = db.Column(db.Boolean, default=False)  # Flag for struck (hidden) messages
#     created_at = db.Column(db.DateTime, default=datetime.utcnow)
#     edited_at = db.Column(db.DateTime, nullable=True)  # Tracks last edit
#
#     # Relationship to the User
#     user = db.relationship('User', backref=db.backref('messages', lazy=True))
#
#     def __repr__(self):
#         return f"<Message {self.id} in Conversation {self.conversation_id} by User {self.user_id}>"


# from datetime import datetime
# from application.extensions import db
#
#
# class Message(db.Model):
#     id = db.Column(db.Integer, primary_key=True)
#     user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
#     content = db.Column(db.Text, nullable=False)
#     timestamp = db.Column(db.DateTime, default=datetime.utcnow)
#
#     # Relationship to the User
#     user = db.relationship('User', backref=db.backref('messages', lazy=True))
#
#     def __repr__(self):
#         return f'<Message {self.content} by {self.user_id} at {self.timestamp}>'
# End of message.py

# Start of project.py
from application.extensions import db

class Project(db.Model):
    __tablename__ = 'projects'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    link = db.Column(db.String(255), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    def __repr__(self):
        return f'<Project {self.name}>'

# End of project.py

# Start of skill.py
from application.extensions import db

class Skill(db.Model):
    __tablename__ = 'skills'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    def __repr__(self):
        return f'<Skill {self.name}>'


# End of skill.py

# Start of user.py
from application.extensions import db
from werkzeug.security import generate_password_hash, check_password_hash

from application.models.challenge_log import ChallengeLog
from application.models.project import Project
from application.models.skill import Skill


class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    profile_picture = db.Column(db.String(150), default="Default_pfp.jpg")
    ip_address = db.Column(db.String(45), nullable=True)
    is_online = db.Column(db.Boolean, default=False)
    ducks = db.Column(db.Integer, nullable=False, default=0)  # Tracks the total ducks earned

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

# End of user.py

# Start of __init__.py
def setup_models():
    from .configuration import Configuration  # This imports models after db has been initialized

# End of __init__.py

