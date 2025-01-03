import pytest

from application import db
from application.models import Course
from datetime import datetime

def test_course_creation(init_db):
    """Test creating a Course entry."""
    course = Course(
        id="course_001",
        name="Advanced Algorithms",
        domain="LeetCode",
        description="Master advanced algorithmic concepts.",
        is_active=False
    )
    db.session.add(course)
    db.session.commit()

    retrieved_course = Course.query.first()
    assert retrieved_course is not None
    assert retrieved_course.id == "course_001"
    assert retrieved_course.name == "Advanced Algorithms"
    assert retrieved_course.domain == "LeetCode"
    assert retrieved_course.description == "Master advanced algorithmic concepts."
    assert not retrieved_course.is_active
    assert isinstance(retrieved_course.created_at, datetime)

def test_course_default_description(init_db):
    """Test the default description for a Course."""
    course = Course(
        id="course_002",
        name="Basic Math",
        domain="HackerRank"
    )
    db.session.add(course)
    db.session.commit()

    retrieved_course = Course.query.first()
    assert retrieved_course.description == "No description provided."

def test_course_repr(sample_course):
    """Test the __repr__ method of Course."""
    course = sample_course
    assert repr(course) == f"<Course(id={course.id}, name={course.name}, domain={course.domain})>"

def test_course_is_active_flag(sample_course):
    """Test the is_active flag functionality."""
    course = sample_course
    assert course.is_active is True

    # Deactivate the course
    course.is_active = False
    db.session.commit()

    retrieved_course = Course.query.get(course.id)
    assert retrieved_course.is_active is False

def test_course_unique_id_constraint(init_db):
    """Test that Course ID must be unique."""
    course1 = Course(
        id="course_123",
        name="Course 1",
        domain="CodeCombat"
    )
    course2 = Course(
        id="course_123",  # Duplicate ID
        name="Course 2",
        domain="CodeCombat"
    )

    db.session.add(course1)
    db.session.commit()

    db.session.add(course2)
    with pytest.raises(Exception):
        db.session.commit()

def test_course_deletion(sample_course):
    """Test deleting a Course."""
    course = sample_course
    db.session.delete(course)
    db.session.commit()

    assert Course.query.get(course.id) is None
