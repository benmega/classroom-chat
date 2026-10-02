"""
File: test_course_instance.py
Type: py
Summary: Unit tests for course instance model.
"""


def test_course_instance_relationship(sample_course_instance, sample_classroom):
    """Test the one-to-many relationship between Classroom and CourseInstance."""
    assert sample_course_instance.classroom_id == sample_classroom.id
    assert sample_course_instance.classroom == sample_classroom

    assert len(sample_classroom.course_assignments) == 1
    assert sample_classroom.course_assignments[0].id == sample_course_instance.id
