"""
File: test_moderation_service.py
Type: py
Summary: Unit tests for banned-word moderation and its wiring into
         the message save pipeline.
"""

from contextlib import contextmanager

from application.extensions import db
from application.models.banned_words import BannedWords
from application.models.user import User
from application.services import moderation_service
from application.services.moderation_service import is_appropriate
from application.utilities.db_helpers import save_message_to_db
from sqlalchemy import event


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

    def test_zero_width_characters_blocked(self):
        for hidden in ("\u200b", "\u200c", "\u200d", "\u2060", "\ufeff", "\u00ad"):
            message = f"b{hidden}a{hidden}d{hidden}word"
            assert not is_appropriate(message, banned_words=["badword"]), repr(hidden)

    def test_zero_width_character_at_the_edges_blocked(self):
        assert not is_appropriate("\ufeffbadword\u200b", banned_words=["badword"])

    def test_fullwidth_letters_blocked(self):
        assert not is_appropriate("\uff42\uff41\uff44\uff57\uff4f\uff52\uff44", banned_words=["badword"])
        assert not is_appropriate("\uff22\uff21\uff24WORD", banned_words=["badword"])

    def test_combining_marks_blocked(self):
        assert not is_appropriate("b\u0337a\u0337d\u0337word", banned_words=["badword"])

    def test_case_folding_that_adds_a_combining_mark_is_cleaned(self):
        # A dotted capital I folds to "i" plus a combining dot
        assert not is_appropriate("K\u0130N", banned_words=["kin"])

    def test_banned_word_with_invisible_characters_still_matches(self):
        assert not is_appropriate("a badword here", banned_words=["bad\u200bword"])
        assert not is_appropriate("a badword here", banned_words=["\uff42\uff41\uff44word"])

    def test_invisible_characters_do_not_flag_innocent_text(self):
        assert is_appropriate("hel\u200blo wor\u200dld", banned_words=["badword"])
        # The word boundary still protects words that merely contain a banned one
        assert is_appropriate("cl\u200bass", banned_words=["ass"])

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


@contextmanager
def _count_statements():
    statements = []

    def record(conn, cursor, statement, parameters, context, executemany):
        statements.append(statement)

    event.listen(db.engine, "before_cursor_execute", record)
    try:
        yield statements
    finally:
        event.remove(db.engine, "before_cursor_execute", record)


def _add_word(word, active=True):
    row = BannedWords(word=word, active=active)
    db.session.add(row)
    db.session.commit()
    return row


class TestBannedWordCache:
    def test_words_are_read_once_for_repeated_checks(self, init_db):
        _add_word("badword")

        with _count_statements() as statements:
            assert not is_appropriate("you badword")
            assert is_appropriate("hello there")
            assert is_appropriate("hello again")

        assert len(statements) == 1

    def test_an_empty_word_list_is_cached_too(self, init_db):
        with _count_statements() as statements:
            assert is_appropriate("hello")
            assert is_appropriate("hello again")

        assert len(statements) == 1

    def test_cache_expires_after_the_ttl(self, init_db, monkeypatch):
        clock = [1000.0]
        monkeypatch.setattr(moderation_service, "_now", lambda: clock[0])
        assert is_appropriate("lateword")  # caches the empty list
        _add_word("lateword")

        clock[0] += moderation_service._CACHE_TTL_SECONDS - 1
        assert is_appropriate("lateword")  # still the cached, empty list

        clock[0] += 2
        assert not is_appropriate("lateword")

    def test_clear_cache_picks_up_new_words(self, init_db):
        assert is_appropriate("lateword")
        _add_word("lateword")
        assert is_appropriate("lateword")

        moderation_service.clear_cache()

        assert not is_appropriate("lateword")

    def test_explicit_word_list_bypasses_the_cache(self, init_db):
        _add_word("storedword")

        with _count_statements() as statements:
            assert not is_appropriate("explicitword here", banned_words=["explicitword"])
            assert is_appropriate("storedword here", banned_words=["explicitword"])

        assert statements == []
        assert moderation_service._cache is None

    def test_a_clear_during_a_load_is_not_overwritten_by_the_stale_read(self, init_db, monkeypatch):
        _add_word("badword")
        real_compile = moderation_service._compile_patterns

        def compile_then_clear(words):
            patterns = real_compile(words)
            moderation_service.clear_cache()  # an admin edit lands while this load runs
            return patterns

        monkeypatch.setattr(moderation_service, "_compile_patterns", compile_then_clear)

        assert not is_appropriate("badword")
        assert moderation_service._cache is None

    def test_cache_is_filled_by_a_check(self, init_db):
        assert moderation_service._cache is None
        is_appropriate("hello")
        assert moderation_service._cache is not None

    def test_cache_does_not_leak_into_the_next_test(self, init_db):
        # The autouse fixture in conftest.py clears the cache around every test
        assert moderation_service._cache is None

    def test_admin_adding_a_word_takes_effect_immediately(self, logged_in_admin, init_db):
        assert is_appropriate("freshword")  # warms the cache

        response = logged_in_admin.post("/api/admin/add-banned-word", data={"word": "freshword"})

        assert response.status_code == 200
        assert not is_appropriate("freshword")

    def test_admin_crud_create_update_delete_take_effect_immediately(self, logged_in_admin, init_db):
        assert is_appropriate("crudword")

        created = logged_in_admin.post("/api/admin/crud/bannedwords", json={"word": "crudword"})
        assert created.status_code == 200
        word_id = created.get_json()["data"]["id"]
        assert not is_appropriate("crudword")

        toggled = logged_in_admin.put(f"/api/admin/crud/bannedwords/{word_id}", json={"active": False})
        assert toggled.status_code == 200
        assert is_appropriate("crudword")

        toggled = logged_in_admin.put(f"/api/admin/crud/bannedwords/{word_id}", json={"active": True})
        assert toggled.status_code == 200
        assert not is_appropriate("crudword")

        deleted = logged_in_admin.delete(f"/api/admin/crud/bannedwords/{word_id}")
        assert deleted.status_code == 200
        assert is_appropriate("crudword")

    def test_editing_another_model_leaves_the_cache_alone(self, logged_in_admin, init_db):
        assert is_appropriate("hello")
        cached = moderation_service._cache

        response = logged_in_admin.post(
            "/api/admin/crud/courses", json={"id": "cache-course", "name": "N", "domain": "d"}
        )

        assert response.status_code == 200
        assert moderation_service._cache is cached
