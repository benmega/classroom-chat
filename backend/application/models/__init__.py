"""
File: __init__.py
Type: py
Summary: Model import helper to register all SQLAlchemy models.
"""



def setup_models():
    # Import all models to register them with SQLAlchemy
    # These imports are needed for side effects (model registration)
    from .achievements import Achievement
    from .ai_settings import AISettings
    from .banned_words import BannedWords
    from .challenge import Challenge
    from .challenge_log import ChallengeLog
    from .classroom import Classroom
    from .configuration import Configuration
    from .connection_attempt import ConnectionAttempt
    from .course import Course
    from .course_instance import CourseInstance
    from .course_instance_request import CourseInstanceRequest
    from .duck_trade import DuckTradeLog
    from .duck_transaction import DuckTransaction
    from .message import Message
    from .note import Note
    from .parent_student import parent_students
    from .project import Project
    from .project_template import ProjectTemplate
    from .session_log import SessionLog
    from .skill import Skill
    from .store_item import StoreItem
    from .submission import Submission
    from .track_requests import TrackChangeRequest
    from .user import User
    from .user_certificate import UserCertificate
    from .user_item_purchase import UserItemPurchase


# setup_models() is called by create_app() within app_context
