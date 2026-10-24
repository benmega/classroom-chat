"""
Unit tests for application/config.py and the environment handling in main.py.
"""

import ast
import importlib.util
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

import pytest
from application.config import (
    BOOKMARKLET_ORIGINS,
    DEFAULT_DEV_CORS_ORIGINS,
    DEFAULT_PROD_CORS_ORIGINS,
    Config,
    cors_origins_from_env,
    split_csv,
)

BACKEND_DIR = Path(__file__).resolve().parents[2]
CONFIG_PATH = BACKEND_DIR / "application" / "config.py"
MAIN_PATH = BACKEND_DIR / "main.py"

CONFIGURABLE_ENV_VARS = (
    "AWS_REGION",
    "CORS_ORIGINS",
    "S3_NOTES_BUCKET",
    "S3_UPLOAD_BUCKET",
    "SOCKETIO_ASYNC_MODE",
)


@pytest.fixture
def load_config(monkeypatch):
    """Import a fresh copy of application/config.py under the current environment, ignoring any .env file."""
    for name in CONFIGURABLE_ENV_VARS:
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setattr("dotenv.load_dotenv", lambda *args, **kwargs: False)

    def _load():
        spec = importlib.util.spec_from_file_location("application_config_under_test", CONFIG_PATH)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module

    return _load


# ---- CORS origins ----------------------------------------------------------


def test_split_csv_strips_whitespace_and_drops_empty_entries():
    assert split_csv("https://a.example, https://b.example ,,  ,https://c.example") == [
        "https://a.example",
        "https://b.example",
        "https://c.example",
    ]
    assert split_csv("") == []
    assert split_csv(" , ") == []


def test_cors_origins_from_env_uses_the_stripped_override(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", " https://a.example , https://b.example ,")

    assert cors_origins_from_env(DEFAULT_PROD_CORS_ORIGINS) == ["https://a.example", "https://b.example"]


@pytest.mark.parametrize("value", [None, "", " , "])
def test_cors_origins_from_env_falls_back_to_a_copy_of_the_defaults(monkeypatch, value):
    if value is None:
        monkeypatch.delenv("CORS_ORIGINS", raising=False)
    else:
        monkeypatch.setenv("CORS_ORIGINS", value)

    origins = cors_origins_from_env(DEFAULT_PROD_CORS_ORIGINS)

    assert origins == DEFAULT_PROD_CORS_ORIGINS
    assert origins is not DEFAULT_PROD_CORS_ORIGINS


def test_production_config_cors_origins(load_config, monkeypatch):
    assert load_config().ProductionConfig.CORS_ORIGINS == DEFAULT_PROD_CORS_ORIGINS

    monkeypatch.setenv("CORS_ORIGINS", "https://a.example , https://b.example")
    assert load_config().ProductionConfig.CORS_ORIGINS == ["https://a.example", "https://b.example"]


# ---- Production secrets ----------------------------------------------------

REAL_SECRETS = {
    "SECRET_KEY": "k" * 64,
    "ADMIN_PASSWORD": "p" * 64,
    "WEBHOOK_SECRET": "w" * 38,
}


@pytest.fixture
def production_env(monkeypatch):
    monkeypatch.setenv("FLASK_ENV", "production")
    for name, value in REAL_SECRETS.items():
        monkeypatch.setenv(name, value)


def test_production_accepts_real_secrets(load_config, production_env):
    config = load_config().Config
    assert REAL_SECRETS["SECRET_KEY"] == config.SECRET_KEY
    assert REAL_SECRETS["ADMIN_PASSWORD"] == config.ADMIN_PASSWORD


@pytest.mark.parametrize("name", sorted(REAL_SECRETS))
@pytest.mark.parametrize("value", ["change_me", "ChangeMe", " 'admin' ", "your-secret-key", "dev-secret-key-change-me"])
def test_production_rejects_placeholder_secrets(load_config, production_env, monkeypatch, name, value):
    monkeypatch.setenv(name, value)
    with pytest.raises(RuntimeError, match=f"{name} is set to a placeholder") as excinfo:
        load_config()
    assert value.strip() not in str(excinfo.value)


def test_production_allows_an_unset_webhook_secret(load_config, production_env, monkeypatch):
    monkeypatch.delenv("WEBHOOK_SECRET")
    load_config()


def test_development_allows_placeholder_secrets(load_config, monkeypatch):
    monkeypatch.setenv("FLASK_ENV", "development")
    monkeypatch.setenv("SECRET_KEY", "change_me")
    monkeypatch.setenv("ADMIN_PASSWORD", "admin")
    assert load_config().Config.SECRET_KEY == "change_me"


def test_default_origin_lists():
    assert not any("localhost" in o or "127.0.0.1" in o for o in DEFAULT_PROD_CORS_ORIGINS)
    assert all(o.startswith(("http://localhost:", "http://127.0.0.1:")) for o in DEFAULT_DEV_CORS_ORIGINS)
    assert not set(BOOKMARKLET_ORIGINS) & set(DEFAULT_PROD_CORS_ORIGINS + DEFAULT_DEV_CORS_ORIGINS)
    assert all(o.startswith("https://") for o in BOOKMARKLET_ORIGINS)


# ---- Upload limits ----------------------------------------------------------


def test_upload_limits():
    # The global cap covers the largest ordinary upload (a submission) plus multipart overhead...
    assert Config.SUBMISSION_MAX_BYTES < Config.MAX_CONTENT_LENGTH <= 30 * 1024 * 1024
    # ...and only the video-upload endpoints get the old 500 MB limit.
    assert Config.LARGE_UPLOAD_MAX_CONTENT_LENGTH == 500 * 1024 * 1024
    assert {"user.new_project", "user.edit_project"} == Config.LARGE_UPLOAD_ENDPOINTS


# ---- S3 settings ------------------------------------------------------------


def test_s3_settings_default_to_the_production_values(load_config):
    cfg = load_config().Config

    assert cfg.S3_NOTES_BUCKET == "classroom-chat-student-notes"
    assert cfg.S3_UPLOAD_BUCKET == "youtube-upload-source-classroom-chat"
    assert cfg.AWS_REGION == "ap-southeast-1"


def test_s3_settings_come_from_the_environment(load_config, monkeypatch):
    monkeypatch.setenv("S3_NOTES_BUCKET", "notes-elsewhere")
    monkeypatch.setenv("S3_UPLOAD_BUCKET", "videos-elsewhere")
    monkeypatch.setenv("AWS_REGION", "eu-west-1")

    cfg = load_config().Config

    assert cfg.S3_NOTES_BUCKET == "notes-elsewhere"
    assert cfg.S3_UPLOAD_BUCKET == "videos-elsewhere"
    assert cfg.AWS_REGION == "eu-west-1"


# ---- Socket.IO async mode ---------------------------------------------------


def test_socketio_async_mode_defaults_to_gevent(load_config, monkeypatch):
    assert load_config().Config.SOCKETIO_ASYNC_MODE == "gevent"

    monkeypatch.setenv("SOCKETIO_ASYNC_MODE", "")
    assert load_config().Config.SOCKETIO_ASYNC_MODE == "gevent"


def test_socketio_async_mode_is_read_from_the_environment(load_config, monkeypatch):
    monkeypatch.setenv("SOCKETIO_ASYNC_MODE", "threading")

    assert load_config().Config.SOCKETIO_ASYNC_MODE == "threading"


def _run_main_header(tmp_path, env_file_text=None, extra_env=None):
    """
    Run main.py's module-level code against a stub ``application`` package
    (so no real app is created) and report whether gevent was monkey-patched.
    """
    shutil.copy(MAIN_PATH, tmp_path / "main.py")
    package = tmp_path / "application"
    package.mkdir()
    (package / "__init__.py").write_text(
        "def create_app():\n    return object()\n\n\ndef reloader_enabled():\n    return False\n"
    )
    (package / "extensions.py").write_text("socketio = object()\n")
    if env_file_text is not None:
        (tmp_path / ".env").write_text(env_file_text)

    env = {k: v for k, v in os.environ.items() if k != "SOCKETIO_ASYNC_MODE"}
    env.update(extra_env or {})
    code = "import sys, main; print('gevent.monkey' in sys.modules)"
    result = subprocess.run(
        [sys.executable, "-c", code], cwd=tmp_path, env=env, capture_output=True, text=True, timeout=120
    )
    assert result.returncode == 0, result.stderr
    return result.stdout.strip() == "True"


def test_main_patches_gevent_by_default(tmp_path):
    assert _run_main_header(tmp_path) is True


def test_main_honours_async_mode_set_only_in_dotenv(tmp_path):
    """The .env file must be loaded before main.py decides whether to monkey-patch."""
    assert _run_main_header(tmp_path, env_file_text="SOCKETIO_ASYNC_MODE=threading\n") is False


def test_main_honours_async_mode_set_in_the_environment(tmp_path):
    assert _run_main_header(tmp_path, extra_env={"SOCKETIO_ASYNC_MODE": "threading"}) is False


def test_main_loads_dotenv_before_the_monkey_patch_decision():
    tree = ast.parse(MAIN_PATH.read_text(encoding="utf-8"))
    load_line = patch_line = import_app_line = None
    for node in tree.body:
        if isinstance(node, ast.Expr) and isinstance(node.value, ast.Call):
            func = node.value.func
            if isinstance(func, ast.Name) and func.id == "load_dotenv":
                load_line = node.lineno
        elif isinstance(node, ast.If) and "SOCKETIO_ASYNC_MODE" in ast.unparse(node.test):
            patch_line = node.lineno
        elif isinstance(node, ast.ImportFrom) and node.module == "application":
            import_app_line = node.lineno

    assert load_line is not None
    assert load_line < patch_line < import_app_line


# ---- .env.example -----------------------------------------------------------

ENV_EXAMPLE_PATH = BACKEND_DIR / ".env.example"
ENV_READERS = (
    CONFIG_PATH,
    MAIN_PATH,
    BACKEND_DIR / "application" / "services" / "email_service.py",
)


def test_env_example_is_safe_to_copy_for_local_development():
    """Copying the template must not make a dev machine production or install placeholder secrets."""
    from dotenv import dotenv_values

    values = dotenv_values(ENV_EXAMPLE_PATH)

    assert values["FLASK_ENV"] == "development"
    # Empty is falsy: production refuses to start and the webhook endpoints reject every call.
    for name in ("SECRET_KEY", "ADMIN_PASSWORD", "WEBHOOK_SECRET"):
        assert values[name] == "", name
    assert "DATABASE_URL" not in values


def test_env_example_documents_every_variable_read_by_config_and_main():
    example = ENV_EXAMPLE_PATH.read_text(encoding="utf-8")
    read = set()
    for path in ENV_READERS:
        read.update(re.findall(r'(?:getenv|environ\.get)\(\s*"([A-Z][A-Z0-9_]+)"', path.read_text(encoding="utf-8")))

    assert {"FLASK_ENV", "SOCKETIO_ASYNC_MODE", "AWS_SES_ACCESS_KEY_ID"} <= read
    undocumented = sorted(name for name in read if not re.search(rf"^#?\s*{name}=", example, re.MULTILINE))
    assert undocumented == []
