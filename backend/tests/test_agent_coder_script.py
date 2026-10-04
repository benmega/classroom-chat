"""
File: test_agent_coder_script.py
Type: py
Summary: Tests for the AI agent helper script (.github/scripts/agent_coder.py) that the
         ai-coder workflow runs: how it runs the backend tests and its plan fallback.
"""

import importlib.util
import pathlib
import subprocess
import sys
from types import SimpleNamespace

import pytest

SCRIPT = pathlib.Path(__file__).resolve().parents[2] / ".github" / "scripts" / "agent_coder.py"

pytestmark = pytest.mark.skipif(not SCRIPT.exists(), reason="repository .github/scripts is not present")


@pytest.fixture
def agent_coder(monkeypatch):
    pytest.importorskip("openai")
    # The module builds its OpenAI client at import time, which needs some key (no network call).
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    spec = importlib.util.spec_from_file_location("agent_coder_under_test", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_run_tests_runs_pytest_from_backend_in_testing_mode(agent_coder, monkeypatch):
    calls = {}

    def fake_run(cmd, **kwargs):
        calls["cmd"] = cmd
        calls["kwargs"] = kwargs
        return subprocess.CompletedProcess(cmd, 1, stdout="1 failed", stderr="")

    monkeypatch.setattr(agent_coder, "subprocess", SimpleNamespace(run=fake_run))
    monkeypatch.delenv("FLASK_ENV", raising=False)

    result = agent_coder.run_tests()

    assert calls["cmd"][:3] == [sys.executable, "-m", "pytest"]
    assert "-x" in calls["cmd"]
    assert calls["kwargs"]["cwd"] == "backend"
    assert calls["kwargs"]["env"]["FLASK_ENV"] == "testing"
    assert calls["kwargs"]["capture_output"] is True
    assert result == "STDOUT: 1 failed\nSTDERR: \nCode: 1"


def test_run_tests_keeps_only_the_tail_of_long_output(agent_coder, monkeypatch):
    limit = agent_coder.MAX_TEST_OUTPUT
    noisy = "HEAD" + "x" * (limit * 3) + "FAILURE SUMMARY"

    def fake_run(cmd, **kwargs):
        return subprocess.CompletedProcess(cmd, 1, stdout=noisy, stderr=noisy)

    monkeypatch.setattr(agent_coder, "subprocess", SimpleNamespace(run=fake_run))

    result = agent_coder.run_tests()

    assert result.count("FAILURE SUMMARY") == 2
    assert "HEAD" not in result
    assert len(result) < 2 * limit + 100


def _first_user_message(agent_coder, monkeypatch):
    """Run main() against a fake model that stops immediately; return the user prompt it was sent."""
    sent = {}

    def create(**kwargs):
        sent["messages"] = list(kwargs["messages"])
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(tool_calls=None))])

    fake_client = SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=create)))
    monkeypatch.setattr(agent_coder, "client", fake_client)
    monkeypatch.setenv("ISSUE_TITLE", "Fix the thing")

    agent_coder.main()

    return sent["messages"][1]["content"]


@pytest.mark.parametrize("plan_env", [None, ""])
def test_main_falls_back_when_no_plan_is_given(agent_coder, monkeypatch, plan_env):
    # A directly applied 'ai-draft' skips the analyze job, so the workflow passes ISSUE_PLAN as "".
    if plan_env is None:
        monkeypatch.delenv("ISSUE_PLAN", raising=False)
    else:
        monkeypatch.setenv("ISSUE_PLAN", plan_env)

    prompt = _first_user_message(agent_coder, monkeypatch)

    assert "Architect Plan: No plan provided." in prompt


def test_main_passes_the_architect_plan_through(agent_coder, monkeypatch):
    monkeypatch.setenv("ISSUE_PLAN", "1. Edit the one file")

    prompt = _first_user_message(agent_coder, monkeypatch)

    assert "Architect Plan: 1. Edit the one file" in prompt
