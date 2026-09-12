# mypy: ignore-errors
import factory
from application.extensions import db
from application.models.achievements import Achievement, UserAchievement
from application.models.ai_settings import AISettings
from application.models.banned_words import BannedWords
from application.models.challenge import Challenge
from application.models.challenge_log import ChallengeLog
from application.models.classroom import Classroom
from application.models.configuration import Configuration
from application.models.course import Course
from application.models.course_instance import CourseInstance
from application.models.duck_trade import DuckTradeLog
from application.models.message import Message
from application.models.project import Project
from application.models.session_log import SessionLog
from application.models.skill import Skill
from application.models.user import User
from application.models.user_certificate import UserCertificate


class BaseFactory(factory.alchemy.SQLAlchemyModelFactory):
    class Meta:
        abstract = True
        sqlalchemy_session = db.session
        sqlalchemy_session_persistence = 'commit'

class UserFactory(BaseFactory):
    class Meta:
        model = User

    _username = factory.Sequence(lambda n: f'user{n}')
    nickname = factory.Sequence(lambda n: f'User {n}')
    password_hash = 'pbkdf2:sha256:600000$test$test'  # pre-hashed for speed
    is_approved = True
    role = 'student'
    earned_ducks = 0
    duck_balance = 0

class AdminFactory(UserFactory):
    _username = 'admin'  # type: ignore[assignment]
    nickname = 'Admin'  # type: ignore[assignment]
    role = 'admin'

class ParentFactory(UserFactory):
    _username = factory.Sequence(lambda n: f'parent{n}')
    role = 'parent'

class ClassroomFactory(BaseFactory):
    class Meta:
        model = Classroom

    id = factory.Sequence(lambda n: f'classroom_{n}')
    name = factory.Sequence(lambda n: f'Classroom {n}')
    language = 'python'

class CourseFactory(BaseFactory):
    class Meta:
        model = Course

    id = factory.Sequence(lambda n: f'course_{n}')
    name = factory.Sequence(lambda n: f'Course {n}')
    domain = 'codecombat.com'
    description = 'Test Course'
    is_active = True

class CourseInstanceFactory(BaseFactory):
    class Meta:
        model = CourseInstance

    id = factory.Sequence(lambda n: f'course_instance_{n}')
    classroom_id = factory.LazyAttribute(lambda _: ClassroomFactory().id)
    course_id = factory.LazyAttribute(lambda _: CourseFactory().id)

class ChallengeFactory(BaseFactory):
    class Meta:
        model = Challenge

    slug = factory.Sequence(lambda n: f'challenge-{n}')
    name = factory.Sequence(lambda n: f'Challenge {n}')
    domain = 'codecombat.com'
    difficulty = 'medium'
    value = 10
    is_active = True

class ChallengeLogFactory(BaseFactory):
    class Meta:
        model = ChallengeLog

    user_id = factory.LazyAttribute(lambda _: UserFactory().id)  # type: ignore[attr-defined]
    domain = 'codecombat.com'
    challenge_slug = factory.Sequence(lambda n: f'challenge-slug-{n}')
    course_id = 'test-course'
    course_instance = 'test-instance'

class AchievementFactory(BaseFactory):
    class Meta:
        model = Achievement

    name = factory.Sequence(lambda n: f'Achievement {n}')
    slug = factory.Sequence(lambda n: f'achievement-{n}')
    type = 'ducks'
    reward = 10
    description = 'Test achievement'
    requirement_value = '10'

class UserAchievementFactory(BaseFactory):
    class Meta:
        model = UserAchievement

    user_id = factory.LazyAttribute(lambda _: UserFactory().id)  # type: ignore[attr-defined]
    achievement_id = factory.LazyAttribute(lambda _: AchievementFactory().id)  # type: ignore[attr-defined]

class MessageFactory(BaseFactory):
    class Meta:
        model = Message

    user_id = factory.LazyAttribute(lambda _: UserFactory().id)  # type: ignore[attr-defined]
    content = factory.Sequence(lambda n: f'Test message {n}')
    message_type = 'text'
    is_global = False
    target_live = False

class ProjectFactory(BaseFactory):
    class Meta:
        model = Project

    name = factory.Sequence(lambda n: f'Project {n}')
    description = 'Test Project'
    link = 'http://example.com'
    user_id = factory.LazyAttribute(lambda _: UserFactory().id)  # type: ignore[attr-defined]

class SkillFactory(BaseFactory):
    class Meta:
        model = Skill

    name = factory.Sequence(lambda n: f'Skill {n}')
    user_id = factory.LazyAttribute(lambda _: UserFactory().id)  # type: ignore[attr-defined]

class AISettingsFactory(BaseFactory):
    class Meta:
        model = AISettings

    key = factory.Sequence(lambda n: f'key_{n}')
    value = 'value'

class ConfigurationFactory(BaseFactory):
    class Meta:
        model = Configuration

    ai_teacher_enabled = True
    message_sending_enabled = True
    duck_multiplier = 1

class BannedWordsFactory(BaseFactory):
    class Meta:
        model = BannedWords

    word = factory.Sequence(lambda n: f'badword{n}')
    reason = 'inappropriate'
    active = True

class SessionLogFactory(BaseFactory):
    class Meta:
        model = SessionLog

    user_id = factory.LazyAttribute(lambda _: UserFactory().id)  # type: ignore[attr-defined]

class UserCertificateFactory(BaseFactory):
    class Meta:
        model = UserCertificate

    user_id = factory.LazyAttribute(lambda _: UserFactory().id)  # type: ignore[attr-defined]
    achievement_id = factory.LazyAttribute(lambda _: AchievementFactory().id)  # type: ignore[attr-defined]
    url = factory.Sequence(lambda n: f'http://example.com/cert{n}.pdf')
    status = 'pending'

class DuckTradeLogFactory(BaseFactory):
    class Meta:
        model = DuckTradeLog

    user_id = factory.LazyAttribute(lambda _: UserFactory().id)  # type: ignore[attr-defined]
    digital_ducks = 1
    bit_ducks = factory.LazyFunction(list)
    byte_ducks = factory.LazyFunction(list)
    status = 'completed'
