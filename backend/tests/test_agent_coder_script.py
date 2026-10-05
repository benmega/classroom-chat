"""
File: test_agent_coder_script.py
Type: py
Summary: Tests for the AI agent helper script (.github/scripts/agent_coder.py) that the
         ai-coder workflow runs: how it runs the backend tests, the issue text and plan it
         hands the model and how it reads the discussion from GitHub.
"""

import importlib.util
import json
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


def test_main_sends_the_issue_description(agent_coder, monkeypatch):
    monkeypatch.setenv("ISSUE_BODY", "The login page shows a 500.")

    prompt = _first_user_message(agent_coder, monkeypatch)

    assert "Title: Fix the thing" in prompt
    assert "Description: The login page shows a 500." in prompt


@pytest.mark.parametrize("body_env", [None, ""])
def test_main_falls_back_when_the_description_is_empty(agent_coder, monkeypatch, body_env):
    # An issue can be filed without a body, which the workflow passes as "".
    if body_env is None:
        monkeypatch.delenv("ISSUE_BODY", raising=False)
    else:
        monkeypatch.setenv("ISSUE_BODY", body_env)

    prompt = _first_user_message(agent_coder, monkeypatch)

    assert "Description: No description provided." in prompt


def _fake_gh(calls, payload=None, returncode=0, stderr=""):
    def fake_run(cmd, **kwargs):
        calls.append(cmd)
        return subprocess.CompletedProcess(cmd, returncode, stdout=json.dumps(payload or {}), stderr=stderr)

    return SimpleNamespace(run=fake_run)


def test_issue_discussion_does_not_request_the_pull_request_only_reviews_field(agent_coder, monkeypatch):
    # 'gh issue view --json reviews' fails with "Unknown JSON field", so the agent never saw an issue.
    calls = []
    payload = {"body": "Steps to reproduce", "comments": [{"author": {"login": "alice"}, "body": "me too"}]}
    monkeypatch.setattr(agent_coder, "subprocess", _fake_gh(calls, payload))
    monkeypatch.setenv("OBJ_NUMBER", "90")
    monkeypatch.setenv("IS_PR", "false")

    result = agent_coder.get_discussion_context()

    assert calls[0][:4] == ["gh", "issue", "view", "90"]
    assert calls[0][calls[0].index("--json") + 1] == "body,comments"
    assert result == "Main Description: Steps to reproduce\n\nComments:\n- alice: me too\n"


def test_pull_request_discussion_includes_the_reviews(agent_coder, monkeypatch):
    calls = []
    payload = {
        "body": "Fixes the thing",
        "comments": [],
        "reviews": [{"author": {"login": "bob"}, "state": "CHANGES_REQUESTED", "body": "add a test"}],
    }
    monkeypatch.setattr(agent_coder, "subprocess", _fake_gh(calls, payload))
    monkeypatch.setenv("OBJ_NUMBER", "12")
    monkeypatch.setenv("IS_PR", "true")

    result = agent_coder.get_discussion_context()

    assert calls[0][:4] == ["gh", "pr", "view", "12"]
    assert calls[0][calls[0].index("--json") + 1] == "body,comments,reviews"
    assert "- REVIEW (CHANGES_REQUESTED) by bob: add a test" in result


def test_discussion_survives_a_comment_from_a_deleted_account(agent_coder, monkeypatch):
    payload = {"body": "b", "comments": [{"author": None, "body": "orphaned"}]}
    monkeypatch.setattr(agent_coder, "subprocess", _fake_gh([], payload))
    monkeypatch.setenv("OBJ_NUMBER", "90")
    monkeypatch.setenv("IS_PR", "false")

    assert "- ghost: orphaned" in agent_coder.get_discussion_context()


def test_discussion_reports_the_gh_error_instead_of_a_parse_failure(agent_coder, monkeypatch):
    monkeypatch.setattr(agent_coder, "subprocess", _fake_gh([], returncode=1, stderr="HTTP 404: Not Found\n"))
    monkeypatch.setenv("OBJ_NUMBER", "90")
    monkeypatch.setenv("IS_PR", "false")

    assert agent_coder.get_discussion_context() == "Error fetching discussion: HTTP 404: Not Found"
