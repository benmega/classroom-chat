from application.models.user import User
from application.models.classroom import Classroom
from application.models.course import Course
from application.models.challenge import Challenge
from application.models.achievements import Achievement

def test_user_creation(init_db):
    user = User(username="test_model_user", is_approved=True)
    user.set_password("securepassword")
    
    init_db.session.add(user)
    init_db.session.commit()
    
    assert user.id is not None
    assert user.username == "test_model_user"
    assert user.check_password("securepassword") is True
    assert user.check_password("wrong") is False
    assert user.is_approved is True

def test_classroom_creation(init_db):
    classroom = Classroom(id="class_123", name="Test Class", language="python")
    init_db.session.add(classroom)
    init_db.session.commit()
    
    assert classroom.id == "class_123"
    assert classroom.name == "Test Class"
    assert classroom.language == "python"

def test_course_creation(init_db):
    course = Course(id="course_abc", name="Python Basics", domain="codecombat.com", is_active=True)
    init_db.session.add(course)
    init_db.session.commit()
    
    assert course.id == "course_abc"
    assert course.name == "Python Basics"
    assert course.domain == "codecombat.com"

def test_challenge_creation(init_db):
    challenge = Challenge(name="Test Chal", slug="test-chal", domain="codecombat.com", difficulty="easy", value=5, is_active=True)
    init_db.session.add(challenge)
    init_db.session.commit()
    
    assert challenge.id is not None
    assert challenge.name == "Test Chal"
    assert challenge.slug == "test-chal"
    assert challenge.value == 5

def test_achievement_creation(init_db):
    ach = Achievement(name="First Win", slug="first-win", type="chat", reward=10)
    init_db.session.add(ach)
    init_db.session.commit()
    
    assert ach.id is not None
    assert ach.name == "First Win"
    assert ach.reward == 10
