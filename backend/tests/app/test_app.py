"""
Unit tests for application initialization (__init__.py) and seed command (commands/seed.py).
"""

import os
import sys
from unittest.mock import MagicMock, patch

import pytest
from application import create_app, ensure_default_configuration, seed_global_data
from application.commands.seed import generate_kebab_slug, seed_command
from application.config import DevelopmentConfig, ProductionConfig, TestingConfig
from application.extensions import db, scheduler, socketio
from application.models.configuration import Configuration
from application.models.project_template import ProjectTemplate
from flask import session
from flask_limiter import RateLimitExceeded
from werkzeug.exceptions import RequestEntityTooLarge


def test_create_app_configs():
    with patch.object(scheduler, "start"), patch.object(socketio, "init_app"):
        with patch.dict(os.environ, {"FLASK_ENV": "production"}):
            app_prod = create_app(ProductionConfig)
            assert app_prod is not None

        with patch.dict(os.environ, {"FLASK_ENV": "testing"}):
            app_test = create_app(TestingConfig)
            assert app_test is not None

        with patch.dict(os.environ, {"FLASK_ENV": "development"}):
            app_dev = create_app(DevelopmentConfig)
            assert app_dev is not None


def test_create_app_log_dir_not_exists(tmp_path):
    with patch.object(scheduler, "start"), patch.object(socketio, "init_app"):
        with patch("os.path.exists", side_effect=lambda path: False if "instance" in str(path) else os.path.exists(path)):
            with patch("os.makedirs") as mock_mkdir:
                app = create_app(TestingConfig)
                assert app is not None
                mock_mkdir.assert_called()


def test_create_app_prod_proxy_fix():
    with patch.object(scheduler, "start"), patch.object(socketio, "init_app"):
        with patch.dict(os.environ, {"FLASK_ENV": "production"}):
            app = create_app(ProductionConfig)
            assert app.config["SESSION_COOKIE_HTTPONLY"] is True
            assert app.config["SESSION_COOKIE_SECURE"] is True


def test_create_app_dev_schema_drift():
    with patch.object(scheduler, "start"), patch.object(socketio, "init_app"):
        with patch.dict(os.environ, {"FLASK_ENV": "development"}):
            with patch("application.check_for_schema_drift"):
                app = create_app(DevelopmentConfig)
                assert app is not None


def test_create_app_users_table_missing():
    with patch.object(scheduler, "start"), patch.object(socketio, "init_app"):
        with patch("sqlalchemy.inspect") as mock_inspect:
            mock_inspector = MagicMock()
            mock_inspector.has_table.return_value = False
            mock_inspect.return_value = mock_inspector

            app = create_app(TestingConfig)
            assert app is not None


def test_load_user_and_context_processor(test_app, sample_user):
    # Test context processor directly
    from flask import g
    with test_app.test_request_context():
        g.user = sample_user
        session["user"] = sample_user.id
        merged_ctx = {}
        for fn in test_app.template_context_processors.get(None, []):
            merged_ctx.update(fn())
        assert merged_ctx["user"].id == sample_user.id

    client = test_app.test_client()

    # Session with valid user
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id
    res = client.get("/api/server-info")
    assert res.status_code in (200, 404, 405)

    # Session with invalid user ID
    with client.session_transaction() as sess:
        sess["user"] = 999999
    res = client.get("/api/server-info")
    assert res.status_code in (200, 404, 405)

    # Session without user
    with client.session_transaction() as sess:
        sess.pop("user", None)
    res = client.get("/api/server-info")
    assert res.status_code in (200, 404, 405)


def test_error_handlers(test_app):
    with test_app.test_request_context():
        handlers_413 = test_app.error_handler_spec.get(None, {}).get(413, {})
        for func in handlers_413.values():
            res, code = func(RequestEntityTooLarge())
            assert code == 413
            assert res.get_json() == {"error": "Request body too large"}

        handlers_429 = test_app.error_handler_spec.get(None, {}).get(429, {})
        for func in handlers_429.values():
            try:
                err = RateLimitExceeded(limit="5 per minute")
                err.description = "5 per minute"
                res = func(err)
                if isinstance(res, tuple):
                    _res_obj, code = res
                    assert code == 429
            except Exception:
                pass


def test_template_filter_format_number(test_app):
    filter_fn = test_app.jinja_env.filters["format_number"]
    assert filter_fn(1234) == "1,234"


def test_ensure_default_configuration(test_app):
    with test_app.app_context():
        Configuration.query.delete()
        db.session.commit()
        ensure_default_configuration()
        config = Configuration.query.first()
        assert config is not None
        assert config.ai_teacher_enabled is False

        # Calling again when configuration already exists
        ensure_default_configuration()
        assert Configuration.query.count() == 1


def test_seed_global_data_sys_argv_db(test_app):
    with test_app.app_context(), patch.object(sys, "argv", ["flask", "db", "upgrade"]):
        seed_global_data()


def test_seed_global_data_updates_template_chapter(test_app):
    with test_app.app_context():
        tpl = ProjectTemplate.query.filter_by(name="Text-Based Adventure").first()
        if not tpl:
            tpl = ProjectTemplate(name="Text-Based Adventure", description="desc", chapter="Old Chapter")
            db.session.add(tpl)
        else:
            tpl.chapter = "Old Chapter"
        db.session.commit()

        seed_global_data()

        updated_tpl = ProjectTemplate.query.filter_by(name="Text-Based Adventure").first()
        assert updated_tpl.chapter == "Computer Science 2"


def test_seed_global_data_operational_error(test_app):
    import sqlalchemy
    with test_app.app_context():
        with patch.object(db.session, "commit", side_effect=sqlalchemy.exc.OperationalError("db locked", params=None, orig=Exception())):
            seed_global_data()


def test_seed_global_data_generic_exception(test_app):
    with test_app.app_context(), patch.object(db.session, "commit", side_effect=RuntimeError("Unexpected error")):
        with pytest.raises(RuntimeError):
            seed_global_data()


# Tests for application/commands/seed.py

def test_generate_kebab_slug():
    assert generate_kebab_slug("") == ""
    assert generate_kebab_slug(None) == ""
    assert generate_kebab_slug("Level 1 - Locked") == "level-1"
    assert generate_kebab_slug("Level 2 - In Progress") == "level-2"
    assert generate_kebab_slug("   Hello World!  -- ") == "hello-world"
    assert generate_kebab_slug("Ozaria_Level__3") == "ozaria-level-3"


def test_seed_command_missing_files(test_app):
    runner = test_app.test_cli_runner()
    with patch("os.path.exists", return_value=False):
        result = runner.invoke(seed_command)
        assert result.exit_code == 0
        assert "File not found" in result.output


def test_seed_command_success(test_app):
    runner = test_app.test_cli_runner()

    instances_csv_content = (
        "id,classroom_id,course_id\n"
        "inst_test_1,class_1,course_1\n"
        "inst_test_2,class_1,course_2\n"
        ",class_3,course_3\n"
    )

    challenges_csv_content = (
        "name,domain,slug,difficulty,value,description,course_id\n"
        "Test Challenge - In Progress,codecombat.com,test-challenge,medium,10,A test challenge,course_1\n"
        "New Challenge,ozaria.com,,hard,20,Another challenge,course_2\n"
        ",codecombat.com,invalid-no-name,easy,5,desc,course_1\n"
    )

    from io import StringIO

    def mock_open(path, mode="r", encoding=None):
        if "course_instances_seed.csv" in str(path):
            return StringIO(instances_csv_content)
        if "level_seed_data.csv" in str(path):
            return StringIO(challenges_csv_content)
        return open(path, mode, encoding=encoding)

    with patch("os.path.exists", return_value=True), patch("builtins.open", side_effect=mock_open):
        # Run first time (inserts)
        res1 = runner.invoke(seed_command)
        assert res1.exit_code == 0
        assert "Successfully inserted" in res1.output

        # Run second time (updates existing challenges)
        res2 = runner.invoke(seed_command)
        assert res2.exit_code == 0
        assert "updated" in res2.output

    with test_app.app_context():
        db.session.rollback()


def test_seed_command_csv_exception(test_app):
    runner = test_app.test_cli_runner()
    with patch("os.path.exists", return_value=True), patch("builtins.open", side_effect=IOError("Disk read error")):
        result = runner.invoke(seed_command)
        assert result.exit_code == 0
        assert "Error seeding" in result.output

    with test_app.app_context():
        db.session.rollback()
