"""
File: conftest.py
Type: py
Summary: Fixtures for testing the standalone scripts in backend/tools and backend/reports.

qrcode and reportlab are optional dependencies that the scripts import at module
level, so they are stubbed here to keep the tests independent of what is installed.
"""

import importlib.util
import sys
import types
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parents[2]


@pytest.fixture(autouse=True)
def _default_profile_base_url(monkeypatch):
    monkeypatch.delenv("PROFILE_BASE_URL", raising=False)


@pytest.fixture
def load_script(monkeypatch):
    """Import a script by path under a private module name (not cached in sys.modules)."""
    # Scripts insert backend/ into sys.path at import time; undo that after the test.
    monkeypatch.setattr(sys, "path", list(sys.path))

    def _load(relative_path, name):
        spec = importlib.util.spec_from_file_location(name, BACKEND_DIR / relative_path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module

    return _load


class FakeQRImage:
    def save(self, target, format=None):
        if hasattr(target, "write"):
            target.write(b"png")
        else:
            Path(target).write_bytes(b"png")


@pytest.fixture
def fake_qrcode(monkeypatch):
    """A stand-in qrcode module that records the data encoded by each QRCode."""
    module = types.ModuleType("qrcode")
    module.instances = []
    module.constants = types.SimpleNamespace(ERROR_CORRECT_L=1)

    class QRCode:
        def __init__(self, **kwargs):
            self.kwargs = kwargs
            self.data = []
            module.instances.append(self)

        def add_data(self, data):
            self.data.append(data)

        def make(self, fit=True):
            pass

        def make_image(self, fill_color=None, back_color=None):
            return FakeQRImage()

    module.QRCode = QRCode
    monkeypatch.setitem(sys.modules, "qrcode", module)
    return module


class FakeCanvas:
    """Records what a card page draws; unknown drawing calls are no-ops."""

    instances: list = []  # noqa: RUF012

    def __init__(self, filename, pagesize=None):
        self.filename = filename
        self.strings = []
        self.images = 0
        self.pages = 0
        self.saved = False
        FakeCanvas.instances.append(self)

    def drawString(self, x, y, text):
        self.strings.append(text)

    def drawImage(self, *args, **kwargs):
        self.images += 1

    def showPage(self):
        self.pages += 1

    def save(self):
        self.saved = True

    def __getattr__(self, name):
        return lambda *args, **kwargs: None


@pytest.fixture
def fake_reportlab(monkeypatch):
    """Stand-ins for the reportlab modules generate_cards.py imports."""
    FakeCanvas.instances = []

    reportlab = types.ModuleType("reportlab")
    reportlab.__path__ = []
    lib = types.ModuleType("reportlab.lib")
    lib.__path__ = []
    pdfgen = types.ModuleType("reportlab.pdfgen")
    pdfgen.__path__ = []

    pagesizes = types.ModuleType("reportlab.lib.pagesizes")
    pagesizes.letter = (612.0, 792.0)
    units = types.ModuleType("reportlab.lib.units")
    units.inch = 72.0
    utils = types.ModuleType("reportlab.lib.utils")
    utils.ImageReader = lambda source: source
    canvas = types.ModuleType("reportlab.pdfgen.canvas")
    canvas.Canvas = FakeCanvas

    reportlab.lib = lib
    reportlab.pdfgen = pdfgen
    lib.pagesizes = pagesizes
    lib.units = units
    lib.utils = utils
    pdfgen.canvas = canvas

    for module in (reportlab, lib, pdfgen, pagesizes, units, utils, canvas):
        monkeypatch.setitem(sys.modules, module.__name__, module)
    return FakeCanvas
