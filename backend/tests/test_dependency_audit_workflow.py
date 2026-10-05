"""Keep the pip-audit workflow advisory.

The audit lists known vulnerabilities in the backend runtime requirements, but it must never fail a
build or sit in front of a deploy. GitHub runs the workflow, so these checks read the files as text.
"""

import re
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
WORKFLOWS = REPO_ROOT / ".github" / "workflows"
AUDIT_WORKFLOW = WORKFLOWS / "pip-audit.yml"

pytestmark = pytest.mark.skipif(
    not AUDIT_WORKFLOW.exists(), reason="repository .github/workflows is not present"
)


def _text(path):
    return path.read_text(encoding="utf-8").replace("\r\n", "\n")


def test_audit_checks_the_runtime_requirements_and_never_fails_the_run():
    text = _text(AUDIT_WORKFLOW)

    step = re.search(r"- name: Audit runtime dependencies \(advisory\)\n(?P<body>(?:        .*\n)+)", text)

    assert step, "audit step not found"
    assert "pip-audit -r requirements.txt" in step["body"]
    assert "continue-on-error: true" in step["body"]
    assert "working-directory: backend" in text


def test_audit_runs_when_requirements_change_and_on_a_schedule():
    text = _text(AUDIT_WORKFLOW)

    assert text.count("'backend/requirements*.txt'") == 2  # pull_request and push
    assert re.search(r"^  schedule:\n    - cron: '", text, flags=re.M)
    assert re.search(r"^  workflow_dispatch:", text, flags=re.M)


def test_audit_is_read_only():
    text = _text(AUDIT_WORKFLOW)

    assert re.search(r"^permissions:\n  contents: read$", text, flags=re.M)
    assert not re.search(r": write$", text, flags=re.M)


@pytest.mark.parametrize("gate", ["deploy.yml", "deploy-frontend.yml", "lint.yml", "tests.yml"])
def test_no_gate_depends_on_the_audit(gate):
    assert "pip-audit" not in _text(WORKFLOWS / gate)
