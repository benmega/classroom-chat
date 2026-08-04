"""
File: test_moderation_service.py
Type: py
Summary: Unit tests for banned-word moderation and its wiring into
         the message save pipeline.
"""

from application.extensions import db
from application.models.banned_words import BannedWords
from application.models.user import User
from application.services.moderation_service import is_appropriate
from application.utilities.db_helpers import save_message_to_db


def _make_user(username, is_admin_role=False):
    role = "admin" if is_admin_role else "student"
    user = User(username=username, is_approved=True, role=role)
    user.set_password("pass123")
    db.session.add(user)
    db.session.commit()
    return user


class TestIsAppropriate:
    def test_clean_message_passes(self):
        assert is_appropriate("hello everyone", banned_words=["badword"])

    def test_exact_match_blocked(self):
        assert not is_appropriate("this is a badword here", banned_words=["badword"])

    def test_case_insensitive(self):
        assert not is_appropriate("BADWORD!", banned_words=["badword"])

    def test_leet_speak_blocked(self):
        assert not is_appropriate("b4dw0rd", banned_words=["badword"])

    def test_spaced_out_letters_blocked(self):
        assert not is_appropriate("b a d w o r d", banned_words=["badword"])

    def test_dotted_letters_blocked(self):
        assert not is_appropriate("b.a.d.w.o.r.d", banned_words=["badword"])

    def test_innocent_containing_word_passes(self):
        # "class" contains "ass"; word boundaries must protect it.
        assert is_appropriate("I love my class and grass", banned_words=["ass"])

    def test_empty_message_passes(self):
        assert is_appropriate("", banned_words=["badword"])

    def test_no_banned_words_passes(self):
        assert is_appropriate("anything at all", banned_words=[])

    def test_uses_only_active_db_words(self, init_db):
        db.session.add(BannedWords(word="blockedterm", active=True))
        db.session.add(BannedWords(word="retiredterm", active=False))
        db.session.commit()

        assert not is_appropriate("contains blockedterm here")
        assert is_appropriate("contains retiredterm here")


class TestSaveMessageModeration:
    def test_student_banned_message_rejected(self, init_db):
        db.session.add(BannedWords(word="badword", active=True))
        db.session.commit()
        student = _make_user("mod_student")

        result = save_message_to_db(student.id, "you badword!")
        assert result["success"] is False
        assert "language" in result["error"]

    def test_student_clean_message_saved(self, init_db):
        db.session.add(BannedWords(word="badword", active=True))
        db.session.commit()
        student = _make_user("mod_student2")

        result = save_message_to_db(student.id, "hello friends")
        assert result["success"] is True

    def test_admin_not_blocked(self, init_db):
        db.session.add(BannedWords(word="badword", active=True))
        db.session.commit()
        admin = _make_user("mod_admin", is_admin_role=True)

        result = save_message_to_db(admin.id, "discussing the badword filter")
        assert result["success"] is True
