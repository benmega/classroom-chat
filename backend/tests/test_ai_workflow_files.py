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
