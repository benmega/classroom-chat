"""
Unit tests for application initialization (__init__.py) and seed command (commands/seed.py).
"""

import importlib.util
import logging
import os
import subprocess
import sys
from contextlib import contextmanager
from types import SimpleNamespace
from typing import ClassVar
from unittest.mock import MagicMock, patch

import application.config as config_module
import pytest
from application import (
    _configure_logging,
    _should_start_scheduler,
    create_app,
    ensure_default_configuration,
    reloader_enabled,
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
from application.extensions import db, limiter, rate_limit_key, scheduler, socketio
from application.models.classroom import Classroom
from application.models.configuration import Configuration
from application.models.course import Course
from application.models.course_instance import CourseInstance
from application.models.project_template import ProjectTemplate
from flask import Flask, request, session
from flask_limiter import Limiter, RateLimitExceeded
from werkzeug.exceptions import RequestEntityTooLarge
from werkzeug.middleware.proxy_fix import ProxyFix


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
            # One trusted proxy (nginx) by default, with the same hop count for
            # every forwarded header.
            assert isinstance(app.wsgi_app, ProxyFix)
            assert (
                app.wsgi_app.x_for,
                app.wsgi_app.x_proto,
                app.wsgi_app.x_host,
                app.wsgi_app.x_port,
            ) == (1, 1, 1, 1)


def test_create_app_without_trusted_proxy_does_not_wrap_wsgi_app():
    class NoProxyProduction(ProductionConfig):
        TRUSTED_PROXY_COUNT = 0

    with patch.object(scheduler, "start"), patch.object(socketio, "init_app"):
        with patch.dict(os.environ, {"FLASK_ENV": "production"}):
            app = create_app(NoProxyProduction)
            assert not isinstance(app.wsgi_app, ProxyFix)

        with patch.dict(os.environ, {"FLASK_ENV": "development"}):
            # Development trusts no proxy: X-Forwarded-For must not be spoofable
            app = create_app(DevelopmentConfig)
            assert not isinstance(app.wsgi_app, ProxyFix)


def test_create_app_trusted_proxy_count_sets_the_hop_count():
    class TwoProxies(TestingConfig):
        TRUSTED_PROXY_COUNT = 2

    class OneProxy(TestingConfig):
        TRUSTED_PROXY_COUNT = 1

    def remote_addr_seen_by(config_class):
        with patch.object(scheduler, "start"), patch.object(socketio, "init_app"):
            app = create_app(config_class)
        app.add_url_rule("/_remote_addr", "remote_addr", lambda: request.remote_addr)
        resp = app.test_client().get(
            "/_remote_addr",
            headers={"X-Forwarded-For": "1.1.1.1, 2.2.2.2"},
            environ_base={"REMOTE_ADDR": "9.9.9.9"},
        )
        return resp.get_data(as_text=True)

    assert remote_addr_seen_by(TwoProxies) == "1.1.1.1"
    assert remote_addr_seen_by(OneProxy) == "2.2.2.2"
    # No trusted proxy: the forwarded header is ignored, the socket address wins
    assert remote_addr_seen_by(TestingConfig) == "9.9.9.9"


@pytest.mark.parametrize("origin", ["http://localhost:4173", "http://127.0.0.1:4173"])
def test_dev_cors_allows_vite_preview_origin(origin):
    # `vite preview` serves the production build on port 4173 and proxies the API and
    # Socket.IO to this backend, so both CORS and the Socket.IO handshake must accept it.
    with patch.object(scheduler, "start"), patch.object(socketio, "init_app") as socketio_init:
        app = create_app(TestingConfig)

    assert origin in socketio_init.call_args.kwargs["cors_allowed_origins"]
    res = app.test_client().get("/server/health", headers={"Origin": origin})
    assert res.headers["Access-Control-Allow-Origin"] == origin


def test_dev_cors_still_rejects_unlisted_origin():
    with patch.object(scheduler, "start"), patch.object(socketio, "init_app") as socketio_init:
        app = create_app(TestingConfig)

    assert "http://localhost:4174" not in socketio_init.call_args.kwargs["cors_allowed_origins"]
    res = app.test_client().get("/server/health", headers={"Origin": "http://localhost:4174"})
    assert "Access-Control-Allow-Origin" not in res.headers


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


# --- Scheduler gate (T1) -------------------------------------------------------

_RELOADER_ENV = ("FLASK_ENV", "FLASK_USE_RELOADER", "WERKZEUG_RUN_MAIN")


@contextmanager
def _process_env(**env):
    """Run with exactly these reloader-related variables set (others removed)."""
    with patch.dict(os.environ, env):
        for key in _RELOADER_ENV:
            if key not in env:
                os.environ.pop(key, None)
        yield


def _app_config(**config):
    return SimpleNamespace(config={"TESTING": False, "SCHEDULER_ENABLED": True, **config})


@pytest.mark.parametrize(
    ("env", "config", "argv", "expected"),
    [
        # gunicorn in production: the single worker runs the cleanup
        ({"FLASK_ENV": "production"}, {}, ["gunicorn", "main:app"], True),
        # production never counts as a reloader parent, whatever FLASK_USE_RELOADER says
        ({"FLASK_ENV": "production", "FLASK_USE_RELOADER": "True"}, {}, ["gunicorn"], True),
        # development: the reloader child runs it, the reloader parent does not
        ({"WERKZEUG_RUN_MAIN": "true"}, {}, ["main.py"], True),
        ({}, {}, ["main.py"], False),
        ({"FLASK_ENV": "development", "FLASK_USE_RELOADER": "1"}, {}, ["main.py"], False),
        # development without the reloader: the one process runs it
        ({"FLASK_USE_RELOADER": "False"}, {}, ["main.py"], True),
        # explicit off switch, for all workers but one
        ({"FLASK_ENV": "production"}, {"SCHEDULER_ENABLED": False}, ["gunicorn"], False),
        ({"WERKZEUG_RUN_MAIN": "true"}, {"SCHEDULER_ENABLED": False}, ["main.py"], False),
        # tests and 'flask db ...' never start it
        ({"FLASK_ENV": "production"}, {"TESTING": True}, ["pytest"], False),
        ({"FLASK_ENV": "production"}, {}, ["flask", "db", "upgrade"], False),
    ],
)
def test_should_start_scheduler_matrix(env, config, argv, expected):
    with _process_env(**env), patch.object(sys, "argv", argv):
        assert _should_start_scheduler(_app_config(**config)) is expected


def test_should_start_scheduler_defaults_to_on_without_config_key():
    with _process_env(FLASK_ENV="production"), patch.object(sys, "argv", ["gunicorn"]):
        assert _should_start_scheduler(SimpleNamespace(config={})) is True


def test_reloader_enabled_follows_main_defaults():
    with _process_env():
        assert reloader_enabled() is True
    with _process_env(FLASK_ENV="production"):
        assert reloader_enabled() is False
    for value in ("false", "0", "f", "no"):
        with _process_env(FLASK_USE_RELOADER=value):
            assert reloader_enabled() is False
    with _process_env(), patch.object(sys, "frozen", True, create=True):
        assert reloader_enabled() is False


def test_create_app_starts_scheduler_under_production_defaults():
    with patch.object(scheduler, "start") as start, patch.object(socketio, "init_app"):
        with _process_env(FLASK_ENV="production"), patch.object(sys, "argv", ["gunicorn"]):
            create_app(ProductionConfig)
    start.assert_called_once()


def test_create_app_leaves_scheduler_to_the_reloader_child():
    with patch.object(scheduler, "start") as start, patch.object(socketio, "init_app"):
        with _process_env(), patch.object(sys, "argv", ["main.py"]):
            create_app(DevelopmentConfig)
        start.assert_not_called()

        with _process_env(WERKZEUG_RUN_MAIN="true"), patch.object(sys, "argv", ["main.py"]):
            create_app(DevelopmentConfig)
        start.assert_called_once()


def test_create_app_does_not_start_scheduler_when_disabled_or_testing():
    class SchedulerOff(ProductionConfig):
        SCHEDULER_ENABLED = False

    with patch.object(scheduler, "start") as start, patch.object(socketio, "init_app"):
        with _process_env(FLASK_ENV="production"), patch.object(sys, "argv", ["gunicorn"]):
            create_app(SchedulerOff)
            create_app(TestingConfig)
    start.assert_not_called()


def test_create_app_survives_and_logs_a_scheduler_start_failure(caplog):
    with (
        patch.object(scheduler, "start", side_effect=RuntimeError("no scheduler")),
        patch.object(socketio, "init_app"),
        _process_env(FLASK_ENV="production"),
        patch.object(sys, "argv", ["gunicorn"]),
        caplog.at_level("ERROR", logger="application"),
    ):
        app = create_app(ProductionConfig)

    assert app is not None
    assert "Could not start the session cleanup scheduler" in caplog.text
    assert "no scheduler" in caplog.text


# --- Configuration from the environment (T1, T2b, T4b, T7) ----------------------

_CONFIG_ENV = (
    "RATELIMIT_STORAGE_URI",
    "SCHEDULER_ENABLED",
    "SESSION_STALE_TIMEOUT_MINUTES",
    "TRUSTED_PROXY_COUNT",
)


def _load_config(**env):
    """Evaluate application/config.py afresh under the given environment."""
    spec = importlib.util.spec_from_file_location("config_under_test", config_module.__file__)
    module = importlib.util.module_from_spec(spec)
    with patch.dict(os.environ, env), patch("dotenv.load_dotenv"):
        for key in _CONFIG_ENV:
            if key not in env:
                os.environ.pop(key, None)
        spec.loader.exec_module(module)
    return module


def test_config_defaults_keep_todays_production_behaviour():
    cfg = _load_config()

    assert cfg.Config.RATELIMIT_STORAGE_URI == "memory://"
    assert cfg.ProductionConfig.RATELIMIT_STORAGE_URI == "memory://"
    assert cfg.DevelopmentConfig.RATELIMIT_STORAGE_URI == "memory://"
    assert cfg.ProductionConfig.SCHEDULER_ENABLED is True
    assert cfg.ProductionConfig.SESSION_STALE_TIMEOUT_MINUTES == 10
    # nginx is the one proxy in production; nothing is trusted elsewhere
    assert cfg.ProductionConfig.TRUSTED_PROXY_COUNT == 1
    assert cfg.Config.TRUSTED_PROXY_COUNT == 0
    assert cfg.DevelopmentConfig.TRUSTED_PROXY_COUNT == 0
    assert cfg.TestingConfig.TRUSTED_PROXY_COUNT == 0


def test_config_reads_overrides_from_the_environment():
    cfg = _load_config(
        RATELIMIT_STORAGE_URI="redis://localhost:6379/1",
        SESSION_STALE_TIMEOUT_MINUTES="25",
        TRUSTED_PROXY_COUNT="2",
    )

    assert cfg.ProductionConfig.RATELIMIT_STORAGE_URI == "redis://localhost:6379/1"
    assert cfg.ProductionConfig.SESSION_STALE_TIMEOUT_MINUTES == 25
    assert cfg.ProductionConfig.TRUSTED_PROXY_COUNT == 2
    assert _load_config(TRUSTED_PROXY_COUNT="0").ProductionConfig.TRUSTED_PROXY_COUNT == 0


@pytest.mark.parametrize(
    ("value", "enabled"),
    [
        ("0", False),
        ("false", False),
        ("No", False),
        (" FALSE ", False),
        ("1", True),
        ("true", True),
        ("", True),
    ],
)
def test_config_scheduler_enabled_flag(value, enabled):
    assert _load_config(SCHEDULER_ENABLED=value).Config.SCHEDULER_ENABLED is enabled


def test_create_app_exposes_the_new_settings():
    with patch.object(scheduler, "start"), patch.object(socketio, "init_app"):
        app = create_app(TestingConfig)

    assert app.config["RATELIMIT_STORAGE_URI"] == "memory://"
    assert app.config["SESSION_STALE_TIMEOUT_MINUTES"] == 10


# --- Rate limit key (T2c) ---------------------------------------------------------


def test_rate_limit_key_is_per_user_when_logged_in_and_per_address_otherwise():
    app = Flask(__name__)
    app.secret_key = "test"

    with app.test_request_context(environ_base={"REMOTE_ADDR": "10.1.2.3"}):
        assert rate_limit_key() == "10.1.2.3"
        session["user"] = 7
        assert rate_limit_key() == "user:7"
        session["user"] = 8
        assert rate_limit_key() == "user:8"
        session.pop("user")
        assert rate_limit_key() == "10.1.2.3"


def test_global_limiter_uses_the_rate_limit_key():
    assert limiter._key_func is rate_limit_key


def test_users_on_one_address_get_independent_buckets():
    app = Flask(__name__)
    app.secret_key = "test"
    own_limiter = Limiter(rate_limit_key, app=app, storage_uri="memory://")

    @app.route("/limited")
    @own_limiter.limit("2 per minute")
    def limited():
        return "ok"

    def hit(client):
        return client.get("/limited", environ_base={"REMOTE_ADDR": "10.0.0.1"}).status_code

    def logged_in_client(user_id):
        client = app.test_client()
        with client.session_transaction() as sess:
            sess["user"] = user_id
        return client

    user_1, user_2, anonymous = logged_in_client(1), logged_in_client(2), app.test_client()

    assert [hit(user_1) for _ in range(3)] == [200, 200, 429]
    # Same address, but user 2 has a bucket of their own
    assert [hit(user_2) for _ in range(3)] == [200, 200, 429]
    # Anonymous requests are still bucketed by address, apart from both users
    assert [hit(anonymous) for _ in range(3)] == [200, 200, 429]
    other_address = anonymous.get("/limited", environ_base={"REMOTE_ADDR": "10.0.0.2"})
    assert other_address.status_code == 200


@pytest.fixture
def rate_limited_app():
    """A real app with the global limiter switched on (it is off in TestingConfig)."""

    class RateLimitedTesting(TestingConfig):
        RATELIMIT_ENABLED = True

    was_enabled = limiter.enabled
    try:
        with patch.object(socketio, "init_app"):
            app = create_app(RateLimitedTesting)
        limiter.reset()
        yield app
    finally:
        # The limiter is a module-level singleton shared with every other app
        limiter.enabled = was_enabled
        if limiter._storage is not None:
            limiter.reset()


@pytest.mark.parametrize(
    ("path", "limit"),
    [
        ("/user/login", 10),
        ("/user/signup", 5),
        ("/api/auth/cognito/register", 10),
        ("/api/auth/cognito/login", 20),
        ("/api/auth/cognito/forgot-password", 5),
    ],
)
def test_credential_routes_stay_keyed_by_address(rate_limited_app, path, limit):
    # An open session must not buy extra attempts: every user on one address
    # shares the bucket of the login/signup/Cognito routes.
    def post_as(user_id):
        client = rate_limited_app.test_client()
        if user_id is not None:
            with client.session_transaction() as sess:
                sess["user"] = user_id
        return client.post(path, json={}).status_code

    assert all(post_as(1) != 429 for _ in range(limit))
    assert post_as(1) == 429
    assert post_as(2) == 429
    assert post_as(None) == 429
