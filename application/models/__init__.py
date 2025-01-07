def setup_models():
    # Import all models to ensure they are registered with SQLAlchemy
    from .configuration import Configuration
    from .ai_settings import AISettings
    from .banned_words import BannedWords
    from .bounty import Bounty
    from .challenge import Challenge
    from .challenge_log import ChallengeLog
    from .conversation import Conversation
    from .course import Course
    from .message import Message
    from .project import Project
    from .skill import Skill
    from .user import User
