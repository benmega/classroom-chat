"""Keep the requirements files and the imports in the code in step.

The admin stats endpoint imported psutil for a long time without it being in
requirements.txt: the test mocked the module, so nothing noticed until a clean
install. These checks read the imports straight from the source with ``ast``
(including imports inside functions) and compare them with what each
requirements file declares:

* requirements.txt       - what the app needs to run (application/, main.py)
* requirements-dev.txt   - runtime plus what the tests need (tests/)
* requirements-tools.txt - runtime plus what the manual scripts need
                           (tools/, reports/, screenshot.py)
"""

import ast
import re
import sys
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parents[1]

# Import name -> distribution name, for the packages whose two names differ
# (distribution names are compared normalised: lower case, "-" for "_" and ".").
IMPORT_TO_DIST = {
    "PIL": "pillow",
    "dotenv": "python-dotenv",
    "factory": "factory-boy",
    "jose": "python-jose",
}

# Imported directly by the code but installed as a dependency of another listed
# package, so they are deliberately not listed themselves.
PROVIDED_BY = {
    "alembic": "flask-migrate",
    "botocore": "boto3",
    "click": "flask",
    "jinja2": "flask",
}

# Test and lint tooling that must never ship in the production requirements.
DEV_ONLY = {"pytest", "pytest-cov", "ruff", "mypy", "sqlalchemy2-stubs", "factory-boy"}
# Packages only the optional scripts need.
TOOLS_ONLY = {"playwright", "qrcode", "reportlab"}


def _normalise(name: str) -> str:
    return re.sub(r"[-_.]+", "-", name).lower()


def _requirement_lines(path: Path) -> list[str]:
    lines = []
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.split("#", 1)[0].strip()
        if line:
            lines.append(line)
    return lines


def _requirement_name(line: str) -> str:
    match = re.match(r"[A-Za-z0-9][A-Za-z0-9._-]*", line)
    assert match, f"cannot parse requirement {line!r}"
    return _normalise(match.group(0))


def declared_requirements(path: Path) -> set[str]:
    """Normalised distribution names listed in a requirements file, following ``-r`` includes."""
    names: set[str] = set()
    for line in _requirement_lines(path):
        if line.startswith(("-r ", "--requirement ")):
            names |= declared_requirements(path.parent / line.split(None, 1)[1])
        else:
            names.add(_requirement_name(line))
    return names


def _local_module_names(*dirs: Path) -> set[str]:
    """Python modules and packages that live in the repo (``pytest.ini`` must not count as ``pytest``)."""
    names: set[str] = set()
    for directory in dirs:
        for entry in directory.iterdir():
            if entry.is_dir():
                names.add(entry.name)
            elif entry.suffix == ".py":
                names.add(entry.stem)
    return names


def third_party_imports(path: Path, local_names: set[str]) -> set[str]:
    """Top-level module names a file imports that are neither standard library nor part of this repo."""
    found: set[str] = set()
    for node in ast.walk(ast.parse(path.read_text(encoding="utf-8"), filename=str(path))):
        if isinstance(node, ast.Import):
            found.update(alias.name.split(".")[0] for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.level == 0 and node.module:
            found.add(node.module.split(".")[0])
    return {name for name in found if name not in sys.stdlib_module_names and name not in local_names}


def undeclared_imports(files: list[Path], declared: set[str], local_names: set[str]) -> dict[str, set[str]]:
    """Map each file to the third-party imports that no entry of ``declared`` provides."""
    missing: dict[str, set[str]] = {}
    for path in files:
        gaps = set()
        for name in third_party_imports(path, local_names):
            dist = IMPORT_TO_DIST.get(name, _normalise(name))
            if dist not in declared and PROVIDED_BY.get(name) not in declared:
                gaps.add(name)
        if gaps:
            try:
                key = path.relative_to(BACKEND_DIR).as_posix()
            except ValueError:
                key = str(path)
            missing[key] = gaps
    return missing


def _python_files(*parts: str) -> list[Path]:
    files: list[Path] = []
    for part in parts:
        target = BACKEND_DIR / part
        if target.is_dir():
            files.extend(sorted(target.rglob("*.py")))
        elif target.is_file():
            files.append(target)
    return files


RUNTIME = declared_requirements(BACKEND_DIR / "requirements.txt")
DEV = declared_requirements(BACKEND_DIR / "requirements-dev.txt")
TOOLS = declared_requirements(BACKEND_DIR / "requirements-tools.txt")
LOCAL = _local_module_names(BACKEND_DIR, BACKEND_DIR / "tests")


@pytest.mark.parametrize(
    ("label", "sources", "declared", "needs_file"),
    [
        ("runtime", ("application", "main.py"), RUNTIME, "requirements.txt"),
        ("tests", ("tests",), DEV, "requirements-dev.txt"),
        ("tools", ("tools", "reports", "screenshot.py"), TOOLS, "requirements-tools.txt"),
    ],
)
def test_every_import_is_declared(label, sources, declared, needs_file):
    missing = undeclared_imports(_python_files(*sources), declared, LOCAL)
    assert not missing, f"{label} code imports packages that {needs_file} does not list: {missing}"


def test_psutil_is_a_runtime_requirement():
    # Imported lazily by the admin /advanced/stats-extended endpoint.
    assert "psutil" in RUNTIME


def test_no_requirements_file_lists_a_package_twice():
    for name in ("requirements.txt", "requirements-dev.txt", "requirements-tools.txt"):
        names = [_requirement_name(line) for line in _requirement_lines(BACKEND_DIR / name) if not line.startswith("-")]
        assert len(names) == len(set(names)), f"{name} lists a package more than once"


def test_dev_and_tools_files_build_on_the_runtime_file():
    for name in ("requirements-dev.txt", "requirements-tools.txt"):
        assert "-r requirements.txt" in _requirement_lines(BACKEND_DIR / name)


def test_runtime_requirements_exclude_dev_and_tool_packages():
    assert not RUNTIME & (DEV_ONLY | TOOLS_ONLY)


def test_undeclared_import_is_reported(tmp_path):
    # Guards the checker itself: a lazy import of an unlisted package must be found.
    module = tmp_path / "module.py"
    module.write_text("import os\n\n\ndef stats():\n    import psutil\n    from flask import Flask\n    return psutil, Flask\n")
    requirements = tmp_path / "requirements.txt"
    requirements.write_text("# comment\nFlask==3.1.1\nrequests~=2.0  # trailing\n")
    declared = declared_requirements(requirements)
    assert declared == {"flask", "requests"}
    assert third_party_imports(module, set()) == {"psutil", "flask"}
    assert undeclared_imports([module], declared, set()) == {str(module): {"psutil"}}
    assert undeclared_imports([module], declared | {"psutil"}, set()) == {}
    assert undeclared_imports([module], declared, {"psutil"}) == {}
