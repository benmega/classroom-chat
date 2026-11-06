"""Model import helper to register all SQLAlchemy models."""


def setup_models():
    # Imported only so every model registers with SQLAlchemy.
    from .achievements import Achievement
    from .banned_words import BannedWords
    from .challenge import Challenge
    from .challenge_log import ChallengeLog
    from .classroom import Classroom
    from .classroom_join_attempt import ClassroomJoinAttempt
    from .configuration import Configuration
    from .connection_attempt import ConnectionAttempt
    from .course import Course
    from .course_instance import CourseInstance
    from .course_instance_request import CourseInstanceRequest
    from .duck_trade import DuckTradeLog
    from .duck_transaction import DuckTransaction
    from .level_game import LevelGame
    from .message import Message
    from .note import Note
    from .parent_message import ParentMessage
    from .parent_student import parent_students
    from .project import Project
    from .project_file import ProjectFile
    from .project_template import ProjectTemplate
    from .quiz import Quiz, QuizAssignment, QuizAttempt, QuizQuestion, QuizReward
    from .session_log import SessionLog
    from .skill import Skill
    from .store_item import StoreItem
    from .submission import Submission
    from .user import User
    from .user_certificate import UserCertificate
    from .user_item_purchase import UserItemPurchase
