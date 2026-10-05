"""Keep the AI workflow in step with the scripts it runs.

ai-coder.yml runs on GitHub only, so CI cannot execute it. These checks read the workflow and the
scripts in .github as text and pin the properties that have gone wrong before.
"""

import ast
import re
import sys
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
