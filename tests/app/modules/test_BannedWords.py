from sqlalchemy.testing import db

from application.models.banned_words import BannedWords


def test_create_banned_word(init_db):
    banned_word = BannedWords(word="test", reason="Test reason")
    db.session.add(banned_word)
    db.session.commit()

    # Ensure banned word is added
    word = BannedWords.query.filter_by(word="test").first()
    assert word is not None
    assert word.reason == "Test reason"


def test_read_banned_words(init_db):
    banned_word = BannedWords(word="test", reason="Test reason")
    db.session.add(banned_word)
    db.session.commit()

    # Read from the database
    word = BannedWords.query.filter_by(word="test").first()
    assert word is not None
    assert word.word == "test"


def test_update_banned_word(init_db):
    banned_word = BannedWords(word="test", reason="Test reason")
    db.session.add(banned_word)
    db.session.commit()

    # Update the reason
    banned_word.reason = "Updated reason"
    db.session.commit()

    # Ensure the reason is updated
    word = BannedWords.query.filter_by(word="test").first()
    assert word.reason == "Updated reason"


def test_delete_banned_word(init_db):
    banned_word = BannedWords(word="test", reason="Test reason")
    db.session.add(banned_word)
    db.session.commit()

    # Delete the banned word
    db.session.delete(banned_word)
    db.session.commit()

    # Ensure the banned word is deleted
    word = BannedWords.query.filter_by(word="test").first()
    assert word is None
