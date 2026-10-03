import pytest


def test_note_url_property(sample_note):
    """Test that the S3 URL is generated correctly based on the filename."""
    expected_bucket = "classroom-chat-student-notes"
    expected_region = "ap-southeast-1"

    expected_url = f"https://{expected_bucket}.s3.{expected_region}.amazonaws.com/{sample_note.filename}"

    assert sample_note.url == expected_url


def test_note_user_relationship(sample_note, sample_user):
    """Test that a note correctly resolves its user."""
    assert sample_note.user_id == sample_user.id
    assert sample_note.user == sample_user
    assert sample_note in sample_user.notes


def test_note_url_uses_configured_bucket_and_region(test_app, sample_note, monkeypatch):
    """The S3 bucket and region come from the app config, not literals in the model."""
    monkeypatch.setitem(test_app.config, "S3_NOTES_BUCKET", "other-notes-bucket")
    monkeypatch.setitem(test_app.config, "AWS_REGION", "eu-west-1")

    assert sample_note.url == (
        f"https://other-notes-bucket.s3.eu-west-1.amazonaws.com/{sample_note.filename}"
    )


def test_note_url_outside_app_context_falls_back_to_config_defaults(
    test_app, monkeypatch
):
    """Note.url can run without an app context; it then reads the Config class."""
    from application.config import Config
    from application.models.note import Note

    monkeypatch.setattr("application.models.note.has_app_context", lambda: False)
    # Would change the URL if the app config were consulted.
    monkeypatch.setitem(test_app.config, "S3_NOTES_BUCKET", "ignored-bucket")

    note = Note(user_id=1, filename="notes/someone/a.png")
    assert note.url == (
        f"https://{Config.S3_NOTES_BUCKET}.s3.{Config.AWS_REGION}.amazonaws.com/notes/someone/a.png"
    )


@pytest.mark.parametrize(
    "filename",
    ["https://cdn.example.com/a.png", "http://cdn.example.com/a.png"],
)
def test_note_url_passes_full_urls_through(filename):
    from application.models.note import Note

    assert Note(user_id=1, filename=filename).url == filename


def test_note_url_does_not_treat_http_prefixed_names_as_urls(init_db):
    """A name that merely starts with "http" is a local file, or an S3 key if it has a slash."""
    from application.models.note import Note

    local = Note(user_id=1, filename="httpfoo.png")
    assert local.url != "httpfoo.png"
    assert local.url.endswith("/notes/view/httpfoo.png")

    s3_key = Note(user_id=1, filename="httpfoo/bar.png")
    assert s3_key.url == (
        "https://classroom-chat-student-notes.s3.ap-southeast-1.amazonaws.com/httpfoo/bar.png"
    )


def test_note_url_empty_filename():
    from application.models.note import Note

    assert Note(user_id=1, filename="").url == ""
