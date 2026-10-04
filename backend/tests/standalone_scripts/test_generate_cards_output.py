"""Tests for the printable student cards script (reports/student_cards/generate_cards.py)."""

import importlib.util
import os
import sys
import types
from pathlib import Path
from unittest.mock import MagicMock

import application
import pytest

BACKEND_DIR = Path(__file__).resolve().parents[2]
SCRIPT_PATH = BACKEND_DIR / "reports" / "student_cards" / "generate_cards.py"


def _stub_module(name, **attrs):
    module = types.ModuleType(name)
    for key, value in attrs.items():
        setattr(module, key, value)
    return module


@pytest.fixture
def cards(monkeypatch):
    """Load the script with its PDF/QR libraries and create_app() stubbed out.

    The script builds an app at import time and needs reportlab/qrcode, which
    are not test dependencies, so none of that may run for real here.
    """
    canvas_cls = MagicMock(name="Canvas")
    stubs = {
        "qrcode": _stub_module("qrcode"),
        "reportlab": _stub_module("reportlab"),
        "reportlab.lib": _stub_module("reportlab.lib"),
        "reportlab.lib.pagesizes": _stub_module("reportlab.lib.pagesizes", letter=(612.0, 792.0)),
        "reportlab.lib.units": _stub_module("reportlab.lib.units", inch=72.0),
        "reportlab.lib.utils": _stub_module("reportlab.lib.utils", ImageReader=MagicMock()),
        "reportlab.pdfgen": _stub_module("reportlab.pdfgen"),
        "reportlab.pdfgen.canvas": _stub_module("reportlab.pdfgen.canvas", Canvas=canvas_cls),
    }
    stubs["reportlab.pdfgen"].canvas = stubs["reportlab.pdfgen.canvas"]
    for name, module in stubs.items():
        monkeypatch.setitem(sys.modules, name, module)
    monkeypatch.setattr(application, "create_app", lambda: MagicMock(name="app"))

    spec = importlib.util.spec_from_file_location("generate_cards_under_test", SCRIPT_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module, canvas_cls


def test_default_output_is_in_git_ignored_userdata_not_cwd(cards):
    module, _ = cards
    expected = BACKEND_DIR / "userData" / "student_cards" / "classroom_cards.pdf"
    assert Path(module.DEFAULT_OUTPUT_PATH) == expected
    assert os.path.isabs(module.DEFAULT_OUTPUT_PATH)


def test_create_pdf_defaults_to_userdata_folder(cards, monkeypatch):
    module, canvas_cls = cards
    made_dirs = []
    monkeypatch.setattr(module.os, "makedirs", lambda path, exist_ok=False: made_dirs.append((path, exist_ok)))

    module.create_pdf([])

    assert canvas_cls.call_args.args[0] == module.DEFAULT_OUTPUT_PATH
    assert made_dirs == [(os.path.dirname(module.DEFAULT_OUTPUT_PATH), True)]
    canvas_cls.return_value.save.assert_called_once()


def test_create_pdf_writes_to_custom_output_and_creates_folder(cards, tmp_path):
    module, canvas_cls = cards
    output = tmp_path / "nested" / "cards.pdf"

    module.create_pdf([], str(output))

    assert output.parent.is_dir()
    assert canvas_cls.call_args.args[0] == str(output)
    canvas_cls.return_value.save.assert_called_once()


def test_parse_args_output_option(cards):
    module, _ = cards
    assert module.parse_args([]).output == module.DEFAULT_OUTPUT_PATH
    assert module.parse_args(["--output", "custom.pdf"]).output == "custom.pdf"
