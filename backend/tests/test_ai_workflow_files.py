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
from types import SimpleNamespace

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


@pytest.mark.parametrize("job", ["analyze", "code", "publish", "cleanup"])
def test_each_job_has_a_timeout(job):
    match = re.search(r"^    timeout-minutes: (\d+)$", _jobs()[job], flags=re.M)

    assert match, f"{job} has no timeout-minutes"
    assert 0 < int(match.group(1)) <= 60


# ---- least privilege: read-only tokens, and the personal access token never near the agent ----


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


@pytest.mark.parametrize("job", ["code", "publish", "cleanup"])
def test_no_job_but_analyze_gets_a_write_token(job):
    assert not re.search(r": write$", _job_header(job), flags=re.M)
    assert not re.search(r": write$", "\n".join(_steps(job).values()), flags=re.M)


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


def test_the_job_that_runs_the_agent_never_holds_the_personal_access_token():
    """The agent's test runs execute code it wrote: whatever else runs in that job is not safe."""
    assert "MY_WORKFLOW_TOKEN" not in _jobs()["code"]
    assert "GH_TOKEN: ${{ github.token }}" in _steps("code")["Run Agent Loop"]


def test_personal_access_token_is_held_only_by_jobs_that_never_run_the_agent():
    holders = {job for job, text in _jobs().items() if "MY_WORKFLOW_TOKEN" in text}

    assert holders == {"publish", "cleanup"}
    for job in holders:
        for needle in ("agent_coder", "pip install", "pytest", "setup-python"):
            assert needle not in _jobs()[job], (job, needle)


def test_publish_job_starts_from_a_fresh_checkout_and_takes_only_the_patch():
    header = _job_header("publish")
    steps = _steps("publish")
    upload = _steps("code")["Upload Agent Patch"]

    assert "needs: [code]" in header
    assert "if: needs.code.outputs.has_patch == 'true'" in header
    assert list(steps)[:2] == ["Checkout Code", "Download Agent Patch"]
    assert "token: ${{ secrets.MY_WORKFLOW_TOKEN }}" in steps["Checkout Code"]
    # The one thing that crosses from the agent's job: the patch, not the workspace.
    assert "name: agent-patch" in steps["Download Agent Patch"]
    assert "name: agent-patch" in upload
    assert re.search(r"^          path: \$\{\{ runner\.temp \}\}/agent\.patch$", upload, flags=re.M)
    assert "if: steps.export.outputs.has_patch == 'true'" in upload
    assert "has_patch: ${{ steps.export.outputs.has_patch }}" in _job_header("code")


def test_pull_request_is_opened_and_pushed_only_by_the_publish_job():
    assert set(_steps("publish")) >= {"Push Changes (Iterative PR)", "Create Pull Request (New Issue)"}
    for step in _steps("code").values():
        assert "git push" not in step
        assert "create-pull-request" not in step


def test_cleanup_runs_after_a_failed_agent_but_not_a_skipped_run():
    header = _job_header("cleanup")

    assert "needs: [code, publish]" in header
    assert "always()" in header
    assert "needs.code.result != 'skipped'" in header
    assert "github.event.label.name == 'ai-draft'" in header


@pytest.mark.parametrize("job", ["analyze", "code"])
def test_only_the_repository_owner_can_start_an_ai_run(job):
    assert "github.event.sender.login == github.repository_owner" in _job_header(job)


# ---- the agent's changes reach the publish job as a patch, never as a workspace ----


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


def _configure(repo):
    for key, value in (("user.name", "test"), ("user.email", "test@example.com"), ("core.autocrlf", "false")):
        _git(repo, "config", key, value)
    return repo


def _write(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8", newline="\n")


def _run_step(repo, job, step, check=True, **env):
    return subprocess.run(
        [_bash(), "-e", "-c", _run_script(job, step)],
        cwd=repo,
        env={**os.environ, **env},
        check=check,
        capture_output=True,
        text=True,
    )


@pytest.fixture
def handoff(tmp_path):
    """The agent job's workspace and the publish job's fresh checkout of the same repository."""
    origin = tmp_path / "origin"
    origin.mkdir()
    _git(origin, "init", "-q")
    _configure(origin)
    for name, content in {
        ".github/workflows/ci.yml": "name: ci\n",
        "backend/app.py": "print(1)\n",
        "backend/old.py": "print('old')\n",
    }.items():
        _write(origin / name, content)
    _git(origin, "add", "-A")
    _git(origin, "commit", "-qm", "base")

    runner_temp = tmp_path / "runner-temp"
    runner_temp.mkdir()
    workspaces = {}
    for name in ("agent", "publish"):
        _git(tmp_path, "clone", "-q", "-c", "core.autocrlf=false", str(origin), name)
        workspaces[name] = _configure(tmp_path / name)
    return SimpleNamespace(
        origin=origin,
        agent=workspaces["agent"],
        publish=workspaces["publish"],
        runner_temp=runner_temp,
        base=_git(origin, "rev-parse", "HEAD"),
    )


def _export(h):
    """Run the agent job's export step; returns the step's outputs."""
    output = h.runner_temp / "github-output"
    output.write_text("", encoding="utf-8")
    _run_step(
        h.agent,
        "code",
        "Export Agent Changes",
        BASE=h.base,
        RUNNER_TEMP=h.runner_temp.as_posix(),
        GITHUB_OUTPUT=output.as_posix(),
    )
    return output.read_text(encoding="utf-8")


def _deliver(h, patch_bytes=None):
    """What upload-artifact and download-artifact do with the patch."""
    target = h.runner_temp / "agent-patch" / "agent.patch"
    target.parent.mkdir(exist_ok=True)
    target.write_bytes(patch_bytes if patch_bytes is not None else (h.runner_temp / "agent.patch").read_bytes())


def _apply(h, **kwargs):
    return _run_step(h.publish, "publish", "Apply Agent Patch", RUNNER_TEMP=h.runner_temp.as_posix(), **kwargs)


def test_checked_out_commit_is_recorded_before_the_agent_runs():
    steps = _steps("code")
    names = list(steps)

    assert names.index("Record Checked-Out Commit") < names.index("Run Agent Loop")
    assert "id: base" in steps["Record Checked-Out Commit"]
    assert 'echo "sha=$(git rev-parse HEAD)" >> "$GITHUB_OUTPUT"' in steps["Record Checked-Out Commit"]


def test_the_patch_is_taken_against_the_recorded_commit_and_leaves_out_the_pipeline():
    export = _steps("code")["Export Agent Changes"]
    script = _run_script("code", "Export Agent Changes")
    names = list(_steps("code"))

    assert names.index("Export Agent Changes") > names.index("Run Agent Loop")
    assert "BASE: ${{ steps.base.outputs.sha }}" in export
    assert '"$BASE"' in script
    assert "HEAD" not in script
    assert script.count("':!.github'") == 2


def test_agent_changes_are_published_without_any_pipeline_change(handoff):
    """Code run by the agent's tests can commit, so only a diff against the start commit counts."""
    h = handoff
    # The agent's edits: a change, a new file, a new binary file and a deletion.
    _write(h.agent / "backend/app.py", "print(2)\n")
    _write(h.agent / "backend/new.py", "print('new')\n")
    (h.agent / "backend/blob.bin").write_bytes(b"\x00\xff\x10\x00")
    (h.agent / "backend/old.py").unlink()
    # What code run by its tests can add: a pipeline change committed, an uncommitted one, a new file.
    _write(h.agent / ".github/workflows/ci.yml", "name: changed\n")
    _git(h.agent, "commit", "-aqm", "committed during the run")
    _write(h.agent / ".github/workflows/extra.yml", "name: extra\n")
    _git(h.agent, "add", ".github")

    assert "has_patch=true" in _export(h)
    _deliver(h)
    _apply(h)
    _run_step(h.publish, "publish", "Push Changes (Iterative PR)", HEAD_REF="ai-fix")

    changed = sorted(_git(h.origin, "diff", "--name-only", h.base, "ai-fix").splitlines())
    assert changed == ["backend/app.py", "backend/blob.bin", "backend/new.py", "backend/old.py"]
    assert _git(h.origin, "show", "ai-fix:.github/workflows/ci.yml") == "name: ci"


def test_nothing_is_published_when_the_agent_changed_nothing(handoff):
    h = handoff
    # Only the pipeline changed, which is never exported.
    _write(h.agent / ".github/workflows/ci.yml", "name: changed\n")
    _git(h.agent, "commit", "-aqm", "committed during the run")

    assert "has_patch" not in _export(h)


@pytest.mark.parametrize(
    "patch",
    [
        # A write into .git (hooks, config).
        "diff --git a/.git/hooks/pre-commit b/.git/hooks/pre-commit\n"
        "new file mode 100755\n--- /dev/null\n+++ b/.git/hooks/pre-commit\n@@ -0,0 +1 @@\n+echo hi\n",
        # Moving the pipeline file out of .github, which a path filter on the new name misses.
        "diff --git a/.github/workflows/ci.yml b/backend/moved.yml\n"
        "similarity index 100%\nrename from .github/workflows/ci.yml\nrename to backend/moved.yml\n",
        # A plain edit of the pipeline.
        "diff --git a/.github/workflows/ci.yml b/.github/workflows/ci.yml\n"
        "--- a/.github/workflows/ci.yml\n+++ b/.github/workflows/ci.yml\n@@ -1 +1,2 @@\n name: ci\n+name: other\n",
    ],
    ids=["git-directory", "rename-out-of-github", "edit-github"],
)
def test_a_patch_that_touches_git_or_the_pipeline_is_refused(handoff, patch):
    """The patch comes from a job that ran agent-written code: it is checked, not trusted."""
    h = handoff
    _deliver(h, patch.encode())

    result = _apply(h, check=False)

    # The step fails, so the commit and push steps after it never run: nothing is published.
    assert result.returncode != 0
    assert _git(h.publish, "rev-parse", "HEAD") == h.base
