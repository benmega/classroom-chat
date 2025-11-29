"""
File: test_project.py
Type: py
Summary: Unit tests for project model.
"""

import random
import string

from application import db
from application.models.project import Project


def test_project_creation(init_db, sample_user):
    """Test creating a project."""
    name = "Test Project"
    description = "A test project description."
    link = "https://testproject.com"

    project = Project(
        name=name,
        description=description,
        link=link,
        user_id=sample_user.id
    )
    db.session.add(project)
    db.session.commit()

    retrieved_project = Project.query.first()
    assert retrieved_project is not None
    assert retrieved_project.name == name
    assert retrieved_project.description == description
    assert retrieved_project.link == link
    assert retrieved_project.user_id == sample_user.id


def test_project_repr(sample_project):
    """Test the __repr__ method of Project."""
    project = sample_project
    expected_repr = f"<Project {project.name}>"
    assert repr(project) == expected_repr


def test_project_optional_fields(init_db, sample_user):
    """Test creating a project without optional fields."""
    project = Project(
        name="Minimal Project",
        user_id=sample_user.id
    )
    db.session.add(project)
    db.session.commit()

    retrieved_project = Project.query.first()
    assert retrieved_project.name == "Minimal Project"
    assert retrieved_project.description is None
    assert retrieved_project.link is None


def test_project_update(sample_project):
    """Test updating a project's details."""
    project = sample_project
    new_name = "Updated Project Name"
    new_description = "Updated project description."
    new_link = "https://updatedlink.com"

    project.name = new_name
    project.description = new_description
    project.link = new_link
    db.session.commit()

    updated_project = Project.query.get(project.id)
    assert updated_project.name == new_name
    assert updated_project.description == new_description
    assert updated_project.link == new_link


def test_project_deletion(sample_project):
    """Test deleting a project."""
    project = sample_project
    db.session.delete(project)
    db.session.commit()

    deleted_project = Project.query.get(project.id)
    assert deleted_project is None


def test_dynamic_project_generation(init_db, sample_user):
    """Test creating projects with random data to simulate real-world conditions."""
    for _ in range(10):  # Generate 10 random projects
        name = ''.join(random.choices(string.ascii_letters, k=10))
        description = ''.join(random.choices(string.ascii_letters + string.digits, k=50))
        link = f"http://{''.join(random.choices(string.ascii_lowercase, k=5))}.com"

        project = Project(
            name=name,
            description=description,
            link=link,
            user_id=sample_user.id
***REMOVED***
        db.session.add(project)
    db.session.commit()

    projects = Project.query.all()
    assert len(projects) == 10
    assert all(isinstance(proj, Project) for proj in projects)
