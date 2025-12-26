"""
File: __init__.py
Type: py
Summary: Model import helper to register all SQLAlchemy models.
"""


def setup_models():
    # Import all models to register them with SQLAlchemy
    # These imports are needed for side effects (model registration)
    from .configuration import Configuration  # noqa: F401
    from .ai_settings import AISettings  # noqa: F401
    from .banned_words import BannedWords  # noqa: F401
    from .challenge import Challenge  # noqa: F401
    from .challenge_log import ChallengeLog  # noqa: F401
    from .conversation import Conversation  # noqa: F401
    from .course import Course  # noqa: F401
    from .message import Message  # noqa: F401
    from .project import Project  # noqa: F401
    from .skill import Skill  # noqa: F401
    from .user import User  # noqa: F401
    from .duck_trade import DuckTradeLog  # noqa: F401
    from .achievements import Achievement  # noqa: F401

setup_models()