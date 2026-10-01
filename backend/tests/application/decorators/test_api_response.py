"""
File: test_api_response.py
Type: py
Summary: Unit tests for the @api_response decorator (envelope, return shapes, errors).
"""

from unittest.mock import patch

from application.decorators.api_response import api_response
from application.extensions import db
from application.models.banned_words import BannedWords
from flask import Response, abort, redirect


def _call(test_app, view):
    """Run the decorated view in a request context; return (status code, response)."""
    with test_app.test_request_context("/"):
        result = api_response(view)()
    if isinstance(result, tuple):
        response, status = result
        return status, response
    return result.status_code, result


class TestEnvelope:
    def test_plain_value_is_wrapped_as_success(self, test_app):
        status, response = _call(test_app, lambda: {"items": [1, 2]})
        assert status == 200
        assert response.get_json() == {"status": "success", "data": {"items": [1, 2]}, "error": None}

    def test_body_with_status_code(self, test_app):
        status, response = _call(test_app, lambda: ({"id": 7}, 201))
        assert status == 201
        assert response.get_json()["data"] == {"id": 7}

    def test_success_dict_with_an_error_key_is_left_alone(self, test_app):
        status, response = _call(test_app, lambda: ({"error": "not an error"}, 200))
        assert status == 200
        assert response.get_json()["data"] == {"error": "not an error"}

    def test_response_object_is_returned_as_is(self, test_app):
        with test_app.test_request_context("/"):
            result = api_response(lambda: redirect("/elsewhere"))()
        assert result.status_code == 302
        assert result.headers["Location"] == "/elsewhere"


class TestReturnShapes:
    def test_body_status_and_headers(self, test_app):
        status, response = _call(test_app, lambda: ({"ok": True}, 201, {"X-Test": "yes"}))
        assert status == 201
        assert response.headers["X-Test"] == "yes"
        assert response.get_json()["data"] == {"ok": True}

    def test_error_status_with_headers(self, test_app):
        status, response = _call(test_app, lambda: ("Too many requests", 429, {"Retry-After": "30"}))
        assert status == 429
        assert response.headers["Retry-After"] == "30"
        assert response.get_json()["error"] == "Too many requests"

    def test_body_and_headers_dict_without_status(self, test_app):
        status, response = _call(test_app, lambda: ({"ok": True}, {"X-Test": "yes"}))
        assert status == 200
        assert response.headers["X-Test"] == "yes"
        assert response.get_json()["data"] == {"ok": True}

    def test_body_and_headers_list_without_status(self, test_app):
        status, response = _call(test_app, lambda: ({"ok": True}, [("X-Test", "yes")]))
        assert status == 200
        assert response.headers["X-Test"] == "yes"

    def test_numeric_string_status_is_coerced(self, test_app):
        status, response = _call(test_app, lambda: ({"ok": True}, "202"))
        assert status == 202
        assert response.get_json()["status"] == "success"

    def test_none_status_defaults_to_200(self, test_app):
        status, _ = _call(test_app, lambda: ({"ok": True}, None))
        assert status == 200

    def test_response_object_with_status(self, test_app):
        def view():
            return Response("<p>hi</p>", mimetype="text/html"), 202

        status, response = _call(test_app, view)
        assert status == 202
        assert response.get_data(as_text=True) == "<p>hi</p>"
        assert response.mimetype == "text/html"

    def test_response_object_with_status_and_headers(self, test_app):
        def view():
            return Response("x"), 200, {"X-Test": "yes"}

        status, response = _call(test_app, view)
        assert status == 200
        assert response.headers["X-Test"] == "yes"
        assert response.get_data(as_text=True) == "x"

    def test_unsupported_tuple_is_an_internal_error(self, test_app):
        status, response = _call(test_app, lambda: ("a", 200, {}, "extra"))
        assert status == 500
        assert response.get_json()["error"] == "Internal server error"

    def test_non_numeric_status_is_an_internal_error(self, test_app):
        status, response = _call(test_app, lambda: ("a", "not-a-status"))
        assert status == 500
        assert response.get_json()["error"] == "Internal server error"


class TestErrorBodies:
    def test_string_body_is_the_error(self, test_app):
        status, response = _call(test_app, lambda: ("Not allowed", 403))
        assert status == 403
        assert response.get_json() == {"status": "error", "data": None, "error": "Not allowed"}

    def test_dict_error_is_not_nested(self, test_app):
        status, response = _call(test_app, lambda: ({"error": "Template not found"}, 404))
        assert status == 404
        assert response.get_json() == {"status": "error", "data": None, "error": "Template not found"}

    def test_message_becomes_the_error_when_there_is_no_error_key(self, test_app):
        status, response = _call(test_app, lambda: ({"message": "Try again later"}, 429))
        body = response.get_json()
        assert status == 429
        assert body["error"] == "Try again later"
        assert body["message"] == "Try again later"

    def test_extra_keys_move_to_the_top_level(self, test_app):
        def view():
            return {"conflict": True, "message": "Drawer taken.", "current_owner": "ada"}, 409

        status, response = _call(test_app, view)
        body = response.get_json()
        assert status == 409
        assert body == {
            "status": "error",
            "data": None,
            "error": "Drawer taken.",
            "conflict": True,
            "message": "Drawer taken.",
            "current_owner": "ada",
        }

    def test_error_wins_over_message_and_message_is_kept(self, test_app):
        status, response = _call(
            test_app, lambda: ({"error": "Internal server error", "message": "detail", "logged_in": False}, 500)
        )
        body = response.get_json()
        assert status == 500
        assert body["error"] == "Internal server error"
        assert body["message"] == "detail"
        assert body["logged_in"] is False

    def test_envelope_keys_in_the_body_are_not_overwritten(self, test_app):
        status, response = _call(
            test_app, lambda: ({"status": "weird", "data": [1], "error": "Nope", "success": False}, 400)
        )
        assert status == 400
        assert response.get_json() == {"status": "error", "data": None, "error": "Nope", "success": False}

    def test_dict_without_a_message_gets_a_generic_error(self, test_app):
        status, response = _call(test_app, lambda: ({"code": 17}, 400))
        body = response.get_json()
        assert status == 400
        assert body["error"] == "An error occurred"
        assert body["code"] == 17

    def test_error_is_always_a_string_for_dict_bodies(self, test_app):
        _, response = _call(test_app, lambda: ({"error": {"field": "bad"}, "message": "Invalid input"}, 400))
        assert response.get_json()["error"] == "Invalid input"

        _, response = _call(test_app, lambda: ({"error": ["a", "b"]}, 400))
        assert response.get_json()["error"] == "An error occurred"

        _, response = _call(test_app, lambda: ({"error": ""}, 400))
        assert response.get_json()["error"] == "An error occurred"

    def test_non_dict_non_string_body_is_kept_as_is(self, test_app):
        _, response = _call(test_app, lambda: (["a", "b"], 400))
        assert response.get_json()["error"] == ["a", "b"]


class TestUnhandledErrors:
    def test_unhandled_error_is_a_generic_500(self, test_app):
        def view():
            raise RuntimeError("secret detail")

        status, response = _call(test_app, view)
        assert status == 500
        assert response.get_json() == {"status": "error", "data": None, "error": "Internal server error"}

    def test_exception_text_is_not_returned_in_debug_mode(self, test_app, monkeypatch):
        monkeypatch.setitem(test_app.config, "DEBUG", True)

        def view():
            raise RuntimeError("secret detail")

        with patch.object(test_app.logger, "error") as log_error:
            status, response = _call(test_app, view)

        assert status == 500
        assert response.get_json()["error"] == "Internal server error"
        assert "secret detail" not in response.get_data(as_text=True)
        # The detail is still available to developers in the log
        assert "secret detail" in log_error.call_args.args[0]

    def test_http_exception_keeps_its_status_and_description(self, test_app):
        def view():
            abort(404, description="Gone fishing")

        status, response = _call(test_app, view)
        assert status == 404
        assert response.get_json() == {"status": "error", "data": None, "error": "Gone fishing"}


class TestRollback:
    def test_session_is_rolled_back_when_a_view_raises(self, test_app):
        def view():
            raise RuntimeError("boom")

        with patch.object(db.session, "rollback") as rollback:
            status, _ = _call(test_app, view)

        assert status == 500
        rollback.assert_called_once_with()

    def test_http_exceptions_do_not_roll_back(self, test_app):
        def view():
            abort(403)

        with patch.object(db.session, "rollback") as rollback:
            status, _ = _call(test_app, view)

        assert status == 403
        rollback.assert_not_called()

    def test_success_does_not_roll_back(self, test_app):
        with patch.object(db.session, "rollback") as rollback:
            status, _ = _call(test_app, lambda: {"ok": True})

        assert status == 200
        rollback.assert_not_called()

    def test_failing_rollback_still_gives_the_generic_500(self, test_app):
        def view():
            raise RuntimeError("boom")

        with patch.object(db.session, "rollback", side_effect=RuntimeError("rollback failed")):
            status, response = _call(test_app, view)

        assert status == 500
        assert response.get_json()["error"] == "Internal server error"

    def test_failed_commit_leaves_a_usable_session(self, test_app, init_db):
        db.session.add(BannedWords(word="duplicate"))
        db.session.commit()

        def view():
            db.session.add(BannedWords(word="duplicate"))
            db.session.commit()  # violates the unique constraint

        status, _ = _call(test_app, view)

        assert status == 500
        # Without the rollback this raises PendingRollbackError
        assert BannedWords.query.count() == 1
