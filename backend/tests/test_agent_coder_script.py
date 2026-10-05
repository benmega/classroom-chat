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


# ---- timeouts: no tool can hang the job ----


def test_every_subprocess_has_a_timeout(agent_coder, monkeypatch):
    seen = []

    def fake_run(cmd, **kwargs):
        seen.append((cmd[0], kwargs.get("timeout")))
        return subprocess.CompletedProcess(cmd, 0, stdout="{}", stderr="")

    monkeypatch.setattr(agent_coder, "subprocess", SimpleNamespace(run=fake_run))
    monkeypatch.setenv("OBJ_NUMBER", "90")

    agent_coder.search_code("needle")
    agent_coder.get_discussion_context()
    agent_coder.run_tests()

    assert [timeout for _, timeout in seen] == [
        agent_coder.COMMAND_TIMEOUT,
        agent_coder.COMMAND_TIMEOUT,
        agent_coder.TEST_TIMEOUT,
    ]


@pytest.mark.parametrize("partial", [b"partial output", "partial output", None])
def test_run_tests_reports_a_timeout_with_the_output_so_far(agent_coder, monkeypatch, partial):
    def fake_run(cmd, **kwargs):
        raise subprocess.TimeoutExpired(cmd, kwargs["timeout"], output=partial, stderr=partial)

    monkeypatch.setattr(agent_coder, "subprocess", SimpleNamespace(run=fake_run))

    result = agent_coder.run_tests()

    assert result.startswith(f"Tests timed out after {agent_coder.TEST_TIMEOUT} seconds")
    assert ("partial output" in result) == (partial is not None)


def test_model_calls_have_a_timeout(agent_coder):
    assert agent_coder.client.timeout == agent_coder.MODEL_TIMEOUT


# ---- the tool loop survives a model that gets a call wrong ----


def test_unknown_tool_is_reported_not_raised(agent_coder):
    result = agent_coder.run_tool("delete_everything", "{}")

    assert result.startswith("Unknown tool: delete_everything.")
    assert "read_file" in result


@pytest.mark.parametrize(
    ("name", "arguments", "expected"),
    [
        ("read_file", "{}", "missing a required argument: 'path'"),
        ("read_file", '{"path": "a.py", "mode": "w"}', "unexpected keyword argument 'mode'"),
        ("search_code", "{not json", "not valid JSON"),
        ("search_code", '["query"]', "expected a JSON object"),
        ("patch_file", '{"path": "a.py"}', "missing a required argument"),
    ],
)
def test_bad_arguments_are_reported_not_raised(agent_coder, name, arguments, expected):
    result = agent_coder.run_tool(name, arguments)

    assert result.startswith(f"Invalid arguments for {name}:")
    assert expected in result


@pytest.mark.parametrize("arguments", ["", "{}", None])
def test_tools_without_parameters_accept_empty_arguments(agent_coder, monkeypatch, arguments):
    monkeypatch.setitem(agent_coder.TOOL_FUNCTIONS, "run_tests", lambda: "all green")

    assert agent_coder.run_tool("run_tests", arguments) == "all green"


def test_a_tool_that_raises_is_reported_not_raised(agent_coder, monkeypatch):
    def broken():
        raise RuntimeError("disk on fire")

    monkeypatch.setitem(agent_coder.TOOL_FUNCTIONS, "run_tests", broken)

    assert agent_coder.run_tool("run_tests", "{}") == "Tool run_tests failed: disk on fire"


def test_main_keeps_going_after_bad_tool_calls(agent_coder, monkeypatch):
    def call(call_id, name, arguments):
        return SimpleNamespace(id=call_id, function=SimpleNamespace(name=name, arguments=arguments))

    bad_calls = [call("c1", "no_such_tool", "{}"), call("c2", "read_file", "{oops"), call("c3", "read_file", "{}")]
    turns = iter(
        [
            SimpleNamespace(tool_calls=bad_calls),
            SimpleNamespace(tool_calls=None),
        ]
    )
    sent = []

    def create(**kwargs):
        sent.append(list(kwargs["messages"]))
        return SimpleNamespace(choices=[SimpleNamespace(message=next(turns))])

    fake_client = SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=create)))
    monkeypatch.setattr(agent_coder, "client", fake_client)

    agent_coder.main()

    assert len(sent) == 2
    tool_messages = [m for m in sent[1] if isinstance(m, dict) and m["role"] == "tool"]
    assert [m["tool_call_id"] for m in tool_messages] == ["c1", "c2", "c3"]
    assert tool_messages[0]["content"].startswith("Unknown tool: no_such_tool")
    assert "not valid JSON" in tool_messages[1]["content"]
    assert "missing a required argument" in tool_messages[2]["content"]


# ---- patch_file rejects a line range outside the file ----


@pytest.fixture
def sample_file(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    target = tmp_path / "sample.txt"
    target.write_text("one\ntwo\nthree\n", encoding="utf-8")
    return target


@pytest.mark.parametrize(("start", "end"), [(0, 1), (-1, 2), (2, 1), (1, 4), (4, 4)])
def test_patch_file_rejects_a_range_outside_the_file(agent_coder, sample_file, start, end):
    result = agent_coder.patch_file("sample.txt", start, end, "X")

    assert result == f"Invalid line range {start}-{end}: sample.txt has 3 lines."
    assert sample_file.read_text(encoding="utf-8") == "one\ntwo\nthree\n"


def test_patch_file_replaces_the_given_lines(agent_coder, sample_file):
    assert agent_coder.patch_file("sample.txt", 2, "3", "TWO-THREE") == "Updated sample.txt from line 2 to 3."

    assert sample_file.read_text(encoding="utf-8") == "one\nTWO-THREE\n"


# ---- the file tools stay inside the repository ----


@pytest.fixture
def repo(tmp_path, monkeypatch):
    """A repository root (the working directory) with git and CI directories, and a file outside it."""
    root = tmp_path / "repo"
    (root / "src").mkdir(parents=True)
    (root / ".git").mkdir()
    (root / ".github" / "workflows").mkdir(parents=True)
    (root / "src" / "app.py").write_text("print('hi')\n", encoding="utf-8")
    (root / ".git" / "HEAD").write_text("ref: refs/heads/main\n", encoding="utf-8")
    (root / ".github" / "workflows" / "ai.yml").write_text("name: x\n", encoding="utf-8")
    (tmp_path / "outside.txt").write_text("SECRET\n", encoding="utf-8")
    monkeypatch.chdir(root)
    return root


def _forbidden_paths(repo):
    outside = repo.parent / "outside.txt"
    return [
        "../outside.txt",
        "src/../../outside.txt",
        str(outside),
        ".git/HEAD",
        "src/../.git/HEAD",
        ".github/workflows/ai.yml",
        str(repo / ".git" / "HEAD"),
    ]


def test_read_file_reads_inside_the_repository(agent_coder, repo):
    assert agent_coder.read_file("src/app.py") == "1: print('hi')\n"
    assert agent_coder.read_file(str(repo / "src" / "app.py")) == "1: print('hi')\n"


def test_read_file_refuses_paths_outside_the_repository_and_protected_directories(agent_coder, repo):
    for path in _forbidden_paths(repo):
        result = agent_coder.read_file(path)

        assert result.startswith(path), path
        assert result.endswith(("is outside the repository.", "is not available to the agent.")), path
        assert "SECRET" not in result
        assert "refs/heads" not in result


def test_patch_file_refuses_paths_outside_the_repository_and_protected_directories(agent_coder, repo):
    before = {p: p.read_text(encoding="utf-8") for p in (repo / ".git" / "HEAD", repo / ".github" / "workflows" / "ai.yml", repo.parent / "outside.txt")}

    for path in _forbidden_paths(repo):
        result = agent_coder.patch_file(path, 1, 1, "overwritten")

        assert result.endswith(("is outside the repository.", "is not available to the agent.")), path

    assert {p: p.read_text(encoding="utf-8") for p in before} == before


def test_patch_file_still_patches_a_repository_file(agent_coder, repo):
    assert agent_coder.patch_file("src/app.py", 1, 1, "print('bye')") == "Updated src/app.py from line 1 to 1."

    assert (repo / "src" / "app.py").read_text(encoding="utf-8") == "print('bye')\n"


def test_a_symlink_inside_the_repository_cannot_lead_out_of_it(agent_coder, repo):
    link = repo / "src" / "link.txt"
    try:
        link.symlink_to(repo.parent / "outside.txt")
    except (OSError, NotImplementedError):
        pytest.skip("symlinks are not available here")

    assert agent_coder.read_file("src/link.txt") == "src/link.txt is outside the repository."
    assert agent_coder.patch_file("src/link.txt", 1, 1, "x") == "src/link.txt is outside the repository."
    assert (repo.parent / "outside.txt").read_text(encoding="utf-8") == "SECRET\n"


# ---- tool subprocesses cannot see the agent's secrets ----


@pytest.fixture
def secret_env(monkeypatch):
    for name in ("OPENAI_API_KEY", "GH_TOKEN", "MY_WORKFLOW_TOKEN", "PUSH_TOKEN"):
        monkeypatch.setenv(name, f"{name.lower()}-value")


def _capture_run(agent_coder, monkeypatch):
    calls = []

    def fake_run(cmd, **kwargs):
        calls.append((cmd, kwargs))
        return subprocess.CompletedProcess(cmd, 0, stdout="", stderr="")

    monkeypatch.setattr(agent_coder, "subprocess", SimpleNamespace(run=fake_run))
    return calls


def test_pytest_does_not_inherit_the_agents_secrets(agent_coder, monkeypatch, secret_env):
    calls = _capture_run(agent_coder, monkeypatch)

    agent_coder.run_tests()

    env = calls[0][1]["env"]
    assert env["FLASK_ENV"] == "testing"
    assert env["PATH"]
    assert not {"OPENAI_API_KEY", "GH_TOKEN", "MY_WORKFLOW_TOKEN", "PUSH_TOKEN"} & set(env)


def test_grep_does_not_inherit_the_agents_secrets_and_skips_protected_directories(agent_coder, monkeypatch, secret_env):
    calls = _capture_run(agent_coder, monkeypatch)

    agent_coder.search_code("--files-without-match")

    cmd, kwargs = calls[0]
    assert "--exclude-dir=.git" in cmd
    assert "--exclude-dir=.github" in cmd
    # The query is passed as the value of -e, so it can never be read as an option.
    assert cmd[cmd.index("-e") + 1] == "--files-without-match"
    assert "OPENAI_API_KEY" not in kwargs["env"]
    assert "GH_TOKEN" not in kwargs["env"]
