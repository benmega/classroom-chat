"""
File: test_banned_words.py
Type: py
Summary: Unit tests for banned words model.
"""

from datetime import datetime

import pytest

from application import db
from application.models.banned_words import BannedWords


def test_banned_words_creation(init_db):
    """Test creating a BannedWords entry."""
    banned_word = BannedWords(word="prohibited", reason="Test reason", active=True)
    db.session.add(banned_word)
    db.session.commit()

    retrieved_word = BannedWords.query.filter_by(word="prohibited").first()
    assert retrieved_word is not None
    assert retrieved_word.word == "prohibited"
    assert retrieved_word.reason == "Test reason"
    assert retrieved_word.active is True
    assert isinstance(retrieved_word.added_on, datetime)


def test_banned_words_uniqueness(init_db):
    """Test that duplicate words cannot be added."""
    word = BannedWords(word="duplicate", reason="Test uniqueness", active=True)
    db.session.add(word)
    db.session.commit()

    duplicate_word = BannedWords(word="duplicate", reason="Duplicate entry")
    db.session.add(duplicate_word)
    with pytest.raises(Exception):
        db.session.commit()


def test_banned_words_query_active(sample_banned_words):
    """Test querying only active banned words."""
    active_words = BannedWords.query.filter_by(active=True).all()
    assert len(active_words) == 1
    assert active_words[0].word == "forbidden"


def test_banned_words_repr(sample_banned_words):
    """Test the __repr__ method of BannedWords."""
    banned_word = sample_banned_words[0]
    assert repr(banned_word) == "<BannedWords forbidden>"
