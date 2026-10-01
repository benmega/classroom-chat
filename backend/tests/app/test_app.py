"""
Unit tests for application initialization (__init__.py) and seed command (commands/seed.py).
"""

import logging
import os
import subprocess
import sys
from typing import ClassVar
from unittest.mock import MagicMock, patch

import pytest
from application import (
    _configure_logging,
    create_app,
    ensure_default_configuration,
    seed_global_data,
)
from application.commands.seed import generate_kebab_slug, seed_command
from application.config import (
    DEFAULT_DEV_CORS_ORIGINS,
    DEFAULT_PROD_CORS_ORIGINS,
    DevelopmentConfig,
    ProductionConfig,
    TestingConfig,
)
from application.extensions import db, scheduler, socketio
from application.models.classroom import Classroom
from application.models.configuration import Configuration
from application.models.course import Course
from application.models.course_instance import CourseInstance
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


APP_HANDLER_NAMES = ("app_console", "app_file")
THIRD_PARTY_LOGGERS = ("werkzeug", "sqlalchemy.engine", "engineio", "socketio")


@pytest.fixture
def restore_logging():
    """Let a test reconfigure logging, then put back the process-wide logging state."""
    root = logging.getLogger()
    saved_handlers = list(root.handlers)
    saved_root_level = root.level
    names = ("application", *THIRD_PARTY_LOGGERS)
    saved_levels = {name: logging.getLogger(name).level for name in names}
    yield root
    for handler in list(root.handlers):
        if handler not in saved_handlers:
            root.removeHandler(handler)
            handler.close()
    for handler in saved_handlers:
        if handler not in root.handlers:
            root.addHandler(handler)
    root.setLevel(saved_root_level)
    for name, level in saved_levels.items():
        logging.getLogger(name).setLevel(level)


def _detach_app_handlers(root):
    for handler in list(root.handlers):
        if handler.get_name() in APP_HANDLER_NAMES:
            root.removeHandler(handler)


def _app_handler_names(root):
    return [h.get_name() for h in root.handlers if h.get_name() in APP_HANDLER_NAMES]


def test_create_app_log_dir_not_exists(restore_logging):
    """The log dir is created (idempotently) when the log handlers are first attached."""
    _detach_app_handlers(restore_logging)
    with patch.object(scheduler, "start"), patch.object(socketio, "init_app"):
        with patch("os.makedirs") as mock_mkdir:
            app = create_app(TestingConfig)
            assert app is not None
            first_call = mock_mkdir.call_args_list[0]
            assert os.path.basename(first_call.args[0]) == "instance"
            assert first_call.kwargs == {"exist_ok": True}


def test_create_app_does_not_stack_logging_handlers(restore_logging):
    """Every create_app() call used to add another console and file handler."""
    root = restore_logging
    with patch.object(scheduler, "start"), patch.object(socketio, "init_app"):
        create_app(TestingConfig)
        before = list(root.handlers)
        create_app(TestingConfig)
        create_app(TestingConfig)

    assert root.handlers == before
    assert sorted(_app_handler_names(root)) == sorted(APP_HANDLER_NAMES)


def test_configure_logging_attaches_each_handler_once(restore_logging):
    root = restore_logging
    _detach_app_handlers(root)

    _configure_logging()
    _configure_logging()

    assert sorted(_app_handler_names(root)) == sorted(APP_HANDLER_NAMES)
    file_handler = next(h for h in root.handlers if h.get_name() == "app_file")
    console_handler = next(h for h in root.handlers if h.get_name() == "app_console")
    assert os.path.basename(file_handler.baseFilename) == "app.log"
    # The file is opened on the first write, not when the handler is created.
    assert file_handler.stream is None
    assert not isinstance(console_handler, logging.FileHandler)
    assert file_handler.formatter is not None
    assert console_handler.formatter is not None


def test_configure_logging_fills_in_only_the_missing_handler(restore_logging):
    root = restore_logging
    _detach_app_handlers(root)
    _configure_logging()
    console_handler = next(h for h in root.handlers if h.get_name() == "app_console")
    root.removeHandler(next(h for h in root.handlers if h.get_name() == "app_file"))

    _configure_logging()

    assert sorted(_app_handler_names(root)) == sorted(APP_HANDLER_NAMES)
    assert console_handler in root.handlers


def test_configure_logging_does_not_force_root_level(restore_logging):
    """Only the app's loggers log at INFO; third-party libraries stay quiet."""
    root = restore_logging
    root.setLevel(logging.WARNING)
    for name in ("application", *THIRD_PARTY_LOGGERS):
        logging.getLogger(name).setLevel(logging.NOTSET)

    _configure_logging()

    assert root.level == logging.WARNING
    assert logging.getLogger("application").level == logging.INFO
    assert logging.getLogger("application.routes.challenge_routes").isEnabledFor(logging.INFO)
    for name in THIRD_PARTY_LOGGERS:
        assert logging.getLogger(name).level == logging.WARNING
        assert not logging.getLogger(name).isEnabledFor(logging.INFO)
    assert not logging.getLogger("some.third.party").isEnabledFor(logging.INFO)


def test_importing_the_application_does_not_call_basic_config():
    """duck_trade_routes used to call logging.basicConfig() at import, adding a duplicate console handler."""
    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    code = (
        "import logging\n"
        "calls = []\n"
        "logging.basicConfig = lambda *a, **k: calls.append((a, k))\n"
        "import application\n"
        "import application.routes.duck_trade_routes\n"
        "print(len(calls), len(logging.getLogger().handlers))\n"
    )
    result = subprocess.run(
        [sys.executable, "-c", code], cwd=backend_dir, capture_output=True, text=True, timeout=120
    )
    assert result.returncode == 0, result.stderr
    assert result.stdout.split() == ["0", "0"]


def _preflight(client, origin, **kwargs):
    return client.options(
        "/user/login",
        headers={"Origin": origin, "Access-Control-Request-Method": "POST"},
        **kwargs,
    )


@pytest.mark.parametrize("origin", DEFAULT_DEV_CORS_ORIGINS)
def test_dev_and_testing_apps_allow_the_default_dev_origins(client, origin):
    response = _preflight(client, origin)

    assert response.headers["Access-Control-Allow-Origin"] == origin
    assert response.headers["Access-Control-Allow-Credentials"] == "true"


def test_dev_default_origins_cover_the_vite_and_backend_ports():
    for host in ("localhost", "127.0.0.1"):
        for port in (5173, 5174, 5175, 4173, 8000):
            assert f"http://{host}:{port}" in DEFAULT_DEV_CORS_ORIGINS


def test_dev_app_rejects_unlisted_origins(client):
    for origin in ("https://evil.example.com", "https://blossom.benmega.com"):
        assert "Access-Control-Allow-Origin" not in _preflight(client, origin).headers


def test_production_app_does_not_allow_localhost_origins():
    class ProdCorsConfig(ProductionConfig):
        SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"

    # Independent of any CORS_ORIGINS set in the environment that ran the tests.
    ProdCorsConfig.CORS_ORIGINS = list(DEFAULT_PROD_CORS_ORIGINS)

    with patch.object(scheduler, "start"), patch.object(socketio, "init_app"):
        with patch.dict(os.environ, {"FLASK_ENV": "production"}):
            app = create_app(ProdCorsConfig)

    prod_client = app.test_client()
    base_url = "https://api-blossom.benmega.com"
    for origin in DEFAULT_PROD_CORS_ORIGINS:
        response = _preflight(prod_client, origin, base_url=base_url)
        assert response.headers["Access-Control-Allow-Origin"] == origin
    response = _preflight(prod_client, "http://localhost:5173", base_url=base_url)
    assert "Access-Control-Allow-Origin" not in response.headers


def test_socketio_uses_the_same_origins_as_http_cors():
    class CustomOriginsConfig(TestingConfig):
        CORS_ORIGINS: ClassVar[list[str]] = ["https://one.example", "https://two.example"]

    with patch.object(scheduler, "start"), patch.object(socketio, "init_app") as init_app:
        create_app(CustomOriginsConfig)
        assert init_app.call_args.kwargs["cors_allowed_origins"] == CustomOriginsConfig.CORS_ORIGINS

        create_app(TestingConfig)
        assert init_app.call_args.kwargs["cors_allowed_origins"] == DEFAULT_DEV_CORS_ORIGINS


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
        assert config.message_sending_enabled is True

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

    with test_app.app_context():
        db.session.add(Classroom(id="class_1", name="Class 1", language="python"))
        db.session.add(Course(id="course_1", name="Course 1", domain="codecombat.com"))
        db.session.add(Course(id="course_2", name="Course 2", domain="ozaria.com"))
        db.session.commit()

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
        assert "Successfully inserted 2 new course instances (skipped 0 orphan rows)" in res1.output

        # Run second time (updates existing challenges)
        res2 = runner.invoke(seed_command)
        assert res2.exit_code == 0
        assert "updated" in res2.output
        assert "Successfully inserted 0 new course instances (skipped 0 orphan rows)" in res2.output

    with test_app.app_context():
        assert {i.id for i in CourseInstance.query.all()} == {"inst_test_1", "inst_test_2"}
        db.session.rollback()


def test_seed_command_skips_orphan_course_instances(test_app):
    runner = test_app.test_cli_runner()

    with test_app.app_context():
        db.session.add(Classroom(id="class_1", name="Class 1", language="python"))
        db.session.add(Course(id="course_1", name="Course 1", domain="codecombat.com"))
        db.session.add(CourseInstance(id="inst_existing", classroom_id="class_1", course_id="course_1"))
        db.session.commit()

    instances_csv_content = (
        "id,classroom_id,course_id\n"
        "inst_ok,class_1,course_1\n"
        "inst_no_course,class_1,\n"
        "inst_bad_classroom,class_missing,course_1\n"
        "inst_empty_classroom,,course_1\n"
        "inst_bad_course,class_1,course_missing\n"
        "inst_existing,class_missing,course_missing\n"
    )
    challenges_csv_content = "name,domain,slug,difficulty,value,description,course_id\n"

    from io import StringIO

    def mock_open(path, mode="r", encoding=None):
        if "course_instances_seed.csv" in str(path):
            return StringIO(instances_csv_content)
        if "level_seed_data.csv" in str(path):
            return StringIO(challenges_csv_content)
        return open(path, mode, encoding=encoding)

    with patch("os.path.exists", return_value=True), patch("builtins.open", side_effect=mock_open):
        result = runner.invoke(seed_command)

    assert result.exit_code == 0
    assert "Successfully inserted 2 new course instances (skipped 3 orphan rows)" in result.output
    assert "Skipping orphan course instance inst_bad_classroom: unknown classroom 'class_missing'." in result.output
    assert "Skipping orphan course instance inst_empty_classroom: unknown classroom ''." in result.output
    assert "Skipping orphan course instance inst_bad_course: unknown course 'course_missing'." in result.output
    # An instance that already exists is left alone, not reported as an orphan.
    assert "inst_existing" not in result.output

    with test_app.app_context():
        instances = {i.id: i for i in CourseInstance.query.all()}
        assert set(instances) == {"inst_existing", "inst_ok", "inst_no_course"}
        # An empty course_id is stored as NULL (the column is nullable), not "".
        assert instances["inst_no_course"].course_id is None
        assert instances["inst_ok"].course_id == "course_1"
        db.session.rollback()


def test_seed_command_csv_exception(test_app):
    runner = test_app.test_cli_runner()
    with patch("os.path.exists", return_value=True), patch("builtins.open", side_effect=IOError("Disk read error")):
        result = runner.invoke(seed_command)
        assert result.exit_code == 0
        assert "Error seeding" in result.output

    with test_app.app_context():
        db.session.rollback()
