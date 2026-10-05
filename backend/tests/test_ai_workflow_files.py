"""Keep the AI workflow in step with the scripts it runs.

ai-coder.yml runs on GitHub only, so CI cannot execute it. These checks read the workflow and the
scripts in .github as text and pin the properties that have gone wrong before.
"""

import ast
import os
import re
import shutil
import subprocess
import sys
import textwrap
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
WORKFLOWS = REPO_ROOT / ".github" / "workflows"
SCRIPTS = REPO_ROOT / ".github" / "scripts"
AI_WORKFLOW = WORKFLOWS / "ai-coder.yml"
SCRIPT_REQUIREMENTS = SCRIPTS / "requirements.txt"

pytestmark = pytest.mark.skipif(
    not AI_WORKFLOW.exists(), reason="repository .github/workflows is not present"
)


def _text(path):
    return path.read_text(encoding="utf-8").replace("\r\n", "\n")


def _jobs():
    """Map each job name in ai-coder.yml to the text of that job."""
    body = _text(AI_WORKFLOW).split("\njobs:\n", 1)[1]
    parts = re.split(r"^  ([\w-]+):\n", body, flags=re.M)
    return dict(zip(parts[1::2], parts[2::2], strict=True))


def _declared_packages(requirements):
    names = set()
    for line in _text(requirements).splitlines():
        line = line.split("#", 1)[0].strip()
        if line:
            names.add(re.split(r"[<>=~!\[; ]", line, maxsplit=1)[0].lower())
    return names


def _third_party_imports(script):
    names = set()
    for node in ast.walk(ast.parse(_text(script))):
        if isinstance(node, ast.Import):
            names.update(alias.name.split(".")[0] for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.level == 0 and node.module:
            names.add(node.module.split(".")[0])
    return {name for name in names if name not in sys.stdlib_module_names}


# ---- dependencies: the scripts' imports are installed before they run ----


def test_script_requirements_list_everything_the_scripts_import():
    declared = _declared_packages(SCRIPT_REQUIREMENTS)

    for script in sorted(SCRIPTS.glob("*.py")):
        assert _third_party_imports(script) <= declared, script.name


@pytest.mark.parametrize("job", ["analyze", "code"])
def test_each_job_installs_the_script_requirements(job):
    assert re.search(r"pip install [^\n]*-r \.github/scripts/requirements\.txt", _jobs()[job])


def test_tests_workflow_installs_the_script_requirements_so_their_tests_run():
    assert "../.github/scripts/requirements.txt" in _text(WORKFLOWS / "tests.yml")


# ---- every job has a timeout, so a stuck run cannot hold a runner for GitHub's 6-hour default ----


@pytest.mark.parametrize("job", ["analyze", "code"])
def test_each_job_has_a_timeout(job):
    match = re.search(r"^    timeout-minutes: (\d+)$", _jobs()[job], flags=re.M)

    assert match, f"{job} has no timeout-minutes"
    assert 0 < int(match.group(1)) <= 60


# ---- least privilege: read-only tokens, and the personal access token only after the agent ran ----


def _steps(job):
    """Map each step name in a job of ai-coder.yml to the text of that step."""
    parts = re.split(r"^      - name: (.+)\n", _jobs()[job], flags=re.M)
    return dict(zip(parts[1::2], parts[2::2], strict=True))


def _job_header(job):
    """The job's own settings: everything before its first step."""
    return _jobs()[job].split("\n    steps:\n", 1)[0]


def test_workflow_default_permissions_are_read_only():
    header = _text(AI_WORKFLOW).split("\njobs:\n", 1)[0]

    assert re.search(r"^permissions:\n  contents: read$", header, flags=re.M)
    assert not re.search(r"^\s+[\w-]+: write$", header, flags=re.M)


def test_code_job_token_is_read_only():
    assert not re.search(r": write$", _job_header("code"), flags=re.M)
    assert not re.search(r": write$", "\n".join(_steps("code").values()), flags=re.M)


def test_analyze_job_only_writes_issues_and_pull_requests():
    writes = re.findall(r"^      ([\w-]+): write$", _job_header("analyze"), flags=re.M)

    assert sorted(writes) == ["issues", "pull-requests"]


@pytest.mark.parametrize("job", ["analyze", "code"])
def test_checkout_leaves_no_credentials_in_the_repository(job):
    checkout = _steps(job)["Checkout Code"]

    assert "persist-credentials: false" in checkout
    assert "token:" not in checkout


def test_analyze_job_does_not_use_the_personal_access_token():
    assert "MY_WORKFLOW_TOKEN" not in _jobs()["analyze"]


def test_agent_step_holds_no_personal_access_token():
    step = _steps("code")["Run Agent Loop"]

    assert "MY_WORKFLOW_TOKEN" not in step
    assert "GH_TOKEN: ${{ github.token }}" in step


def test_personal_access_token_is_used_only_after_the_agent_ran_and_protected_paths_were_reset():
    names = list(_steps("code"))
    ran = names.index("Run Agent Loop")
    reset = names.index("Discard Changes To Protected Paths")

    assert ran < reset < names.index("Push Changes (Iterative PR)") < names.index("Create Pull Request (New Issue)")
    for index, (name, step) in enumerate(_steps("code").items()):
        if "MY_WORKFLOW_TOKEN" in step:
            assert index > reset, name


def test_push_step_does_not_run_git_hooks():
    push = _steps("code")["Push Changes (Iterative PR)"]

    assert push.count("git -c core.hooksPath=/dev/null ") == 2
    assert "git add ." in push
    assert not re.search(r"^\s*git (commit|push) ", push, flags=re.M)


@pytest.mark.parametrize("job", ["analyze", "code"])
def test_only_the_repository_owner_can_start_an_ai_run(job):
    assert "github.event.sender.login == github.repository_owner" in _job_header(job)


# ---- the protected paths are restored from the commit that was checked out ----


def _run_script(job, step):
    """The shell script of a step, as the runner would write it to a file."""
    text = _steps(job)[step]
    block = re.search(r"^        run: \|\n((?:(?: {10}.*)?\n)+)", text, flags=re.M)
    if block:
        return textwrap.dedent(block.group(1))
    return re.search(r"^        run: (.+)$", text, flags=re.M).group(1) + "\n"


def _bash():
    found = shutil.which("bash")
    # Windows' System32 bash.exe starts WSL, which cannot run the repository paths below.
    if shutil.which("git") is None or found is None or "system32" in found.lower().replace("/", "\\"):
        pytest.skip("git and a POSIX bash are needed to run the workflow's shell steps")
    return found


def _git(repo, *args):
    done = subprocess.run(["git", *args], cwd=repo, check=True, capture_output=True, text=True)
    return done.stdout.strip()


def _make_repo(path, files):
    path.mkdir()
    _git(path, "init", "-q")
    for key, value in (("user.name", "test"), ("user.email", "test@example.com"), ("core.autocrlf", "false")):
        _git(path, "config", key, value)
    for name, content in files.items():
        (path / name).parent.mkdir(parents=True, exist_ok=True)
        (path / name).write_text(content, encoding="utf-8", newline="\n")
    _git(path, "add", "-A")
    _git(path, "commit", "-qm", "base")
    return path


def _run_step(repo, job, step, **env):
    return subprocess.run(
        [_bash(), "-e", "-c", _run_script(job, step)],
        cwd=repo,
        env={**os.environ, **env},
        check=True,
        capture_output=True,
        text=True,
    )


def test_checked_out_commit_is_recorded_before_the_agent_runs():
    steps = _steps("code")
    names = list(steps)

    assert names.index("Record Checked-Out Commit") < names.index("Run Agent Loop")
    assert "id: base" in steps["Record Checked-Out Commit"]
    assert 'echo "sha=$(git rev-parse HEAD)" >> "$GITHUB_OUTPUT"' in steps["Record Checked-Out Commit"]


def test_protected_paths_are_reset_to_the_recorded_commit_not_to_head():
    reset = _steps("code")["Discard Changes To Protected Paths"]

    assert "BASE: ${{ steps.base.outputs.sha }}" in reset
    assert '--source="$BASE"' in reset
    assert "HEAD" not in _run_script("code", "Discard Changes To Protected Paths")


def test_a_pipeline_change_committed_while_the_agent_ran_is_not_pushed(tmp_path):
    """Code run by the agent's tests can commit: restoring from HEAD would keep that commit."""
    repo = _make_repo(
        tmp_path / "repo",
        {".github/workflows/ci.yml": "name: ci\n", "backend/app.py": "print(1)\n"},
    )
    base = _git(repo, "rev-parse", "HEAD")
    # A pipeline change committed during the run, a new pipeline file, and one other edit.
    (repo / ".github/workflows/ci.yml").write_text("name: changed\n", newline="\n")
    _git(repo, "commit", "-aqm", "committed during the run")
    (repo / ".github/workflows/extra.yml").write_text("name: extra\n", newline="\n")
    (repo / "backend/app.py").write_text("print(2)\n", newline="\n")

    _run_step(repo, "code", "Discard Changes To Protected Paths", BASE=base)
    # What the push step then does.
    _git(repo, "add", ".")
    _git(repo, "commit", "-qm", "AI Agent")

    assert _git(repo, "diff", "--name-only", base, "HEAD").splitlines() == ["backend/app.py"]
    assert not (repo / ".github/workflows/extra.yml").exists()
