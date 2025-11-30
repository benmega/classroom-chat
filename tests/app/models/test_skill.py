"""
File: test_skill.py
Type: py
Summary: Unit tests for skill model.
"""

import random

import pytest

from application import db, User
from application.models.skill import Skill


def test_skill_creation(init_db, sample_user):
    """Test creating a skill."""
    name = "JavaScript"
    skill = Skill(
        name=name,
        user_id=sample_user.id
    )
    db.session.add(skill)
    db.session.commit()

    retrieved_skill = Skill.query.first()
    assert retrieved_skill is not None
    assert retrieved_skill.name == name
    assert retrieved_skill.user_id == sample_user.id


def test_skill_unique_per_user(init_db, sample_user):
    """Test adding duplicate skills for the same user."""
    skill_1 = Skill(name="C++", user_id=sample_user.id)
    db.session.add(skill_1)
    db.session.commit()

    # Attempt to add the same skill name for the same user
    skill_2 = Skill(name="C++", user_id=sample_user.id)
    db.session.add(skill_2)

    with pytest.raises(Exception):  # Expect an IntegrityError or similar
        db.session.commit()


def test_skill_multiple_users(init_db, sample_user):
    """Test adding the same skill for different users."""
    other_user = User(username="other_user", password_hash="dummy_hash")
    db.session.add(other_user)
    db.session.commit()

    skill_1 = Skill(name="Python", user_id=sample_user.id)
    skill_2 = Skill(name="Python", user_id=other_user.id)

    db.session.add(skill_1)
    db.session.add(skill_2)
    db.session.commit()

    all_skills = Skill.query.all()
    assert len(all_skills) == 2
    assert all(sk.name == "Python" for sk in all_skills)


def test_skill_update(sample_skill):
    """Test updating a skill's name."""
    skill = sample_skill
    new_name = "Advanced Python"
    skill.name = new_name
    db.session.commit()

    updated_skill = Skill.query.get(skill.id)
    assert updated_skill.name == new_name


def test_skill_deletion(sample_skill):
    """Test deleting a skill."""
    skill = sample_skill
    db.session.delete(skill)
    db.session.commit()

    deleted_skill = Skill.query.get(skill.id)
    assert deleted_skill is None


def test_dynamic_skill_generation(init_db, sample_user):
    """Test creating skills with random data to simulate real-world conditions."""
    skill_names = ["Python", "JavaScript", "Java", "Ruby", "Go", "Swift", "Rust", "Kotlin"]

    # Generate unique skill names
    unique_skills = set(random.choices(skill_names, k=10))

    for skill_name in unique_skills:
        skill = Skill(
            name=skill_name,
            user_id=sample_user.id
)
        db.session.add(skill)
    db.session.commit()

    # Retrieve skills and assert
    skills = Skill.query.filter_by(user_id=sample_user.id).all()
    assert len(skills) == len(unique_skills)
    assert all(isinstance(skill, Skill) for skill in skills)


