def test_classroom_creation(sample_classroom):
    """Test that a classroom is created with correct attributes."""
    assert sample_classroom.id == "678b56dc12345"
    assert sample_classroom.name == "Sat1030 CS 4 PY"
    assert sample_classroom.language == "python"


def test_course_instance_relationship(sample_course_instance, sample_classroom):
    """Test the one-to-many relationship between Classroom and CourseInstance."""
    # Test linkage from the Instance side
    assert sample_course_instance.classroom_id == sample_classroom.id
    assert sample_course_instance.classroom == sample_classroom

    # Test linkage from the Classroom side (backref)
    assert len(sample_classroom.course_assignments) == 1
    assert sample_classroom.course_assignments[0].id == sample_course_instance.id


def test_note_url_property(sample_note):
    """Test that the S3 URL is generated correctly based on the filename."""
    expected_bucket = "classroom-chat-student-notes"
    expected_region = "ap-southeast-1"

    # Expected: https://{BUCKET}.s3.{REGION}.amazonaws.com/{filename}
    expected_url = f"https://{expected_bucket}.s3.{expected_region}.amazonaws.com/{sample_note.filename}"

    assert sample_note.url == expected_url


def test_note_user_relationship(sample_note, sample_user):
    """Test that a note correctly resolves its user."""
    assert sample_note.user_id == sample_user.id
    assert sample_note.user == sample_user
    # Ensure it appears in the user's list of notes
    assert sample_note in sample_user.notes