"""
Tests for tools/make_sprite_sheet.py (achievement badge sprite builder).
"""

import hashlib
import importlib.util
import re
from pathlib import Path

import pytest
from PIL import Image

SCRIPT = Path(__file__).resolve().parents[2] / "tools" / "make_sprite_sheet.py"
RULE_RE = re.compile(r"^\.badge-(\S+) \{ background-position: -(\d+)px -(\d+)px; \}$", re.MULTILINE)


@pytest.fixture
def sprite_tool(tmp_path, monkeypatch):
    """The script module, pointed at a scratch badge dir and CSS file."""
    spec = importlib.util.spec_from_file_location("make_sprite_sheet_under_test", SCRIPT)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    badge_dir = tmp_path / "achievement_badges"
    badge_dir.mkdir()
    monkeypatch.setattr(module, "BADGE_DIR", badge_dir)
    monkeypatch.setattr(module, "SPRITE_PATH", badge_dir / "sprite.webp")
    monkeypatch.setattr(module, "CSS_PATH", tmp_path / "css" / "sprite.css")
    return module


def make_image(path, size=(300, 200), color=(200, 30, 30)):
    Image.new("RGB", size, color).save(path)


def rules_of(css_path):
    return [(slug, int(x), int(y)) for slug, x, y in RULE_RE.findall(css_path.read_text(encoding="utf-8"))]


def test_repo_root_is_the_repository_root(sprite_tool):
    # parents[2] of backend/tools/make_sprite_sheet.py
    assert (sprite_tool.REPO_ROOT / "backend" / "tools" / "make_sprite_sheet.py").is_file()
    assert (sprite_tool.REPO_ROOT / "frontend").is_dir()


def test_collect_ignores_generated_sprite_dirs_and_non_images(sprite_tool):
    badge_dir = sprite_tool.BADGE_DIR
    make_image(badge_dir / "a.png")
    make_image(badge_dir / "b.webp")
    make_image(badge_dir / "sprite.webp")
    (badge_dir / "optimized").mkdir()
    make_image(badge_dir / "optimized" / "a.webp")
    (badge_dir / "notes.txt").write_text("not an image")

    assert [f.name for f in sprite_tool.collect_badge_files()] == ["a.png", "b.webp"]


def test_collect_keeps_one_file_per_slug_preferring_png(sprite_tool, capsys):
    badge_dir = sprite_tool.BADGE_DIR
    for name in ("slug.jpg", "slug.png", "other.jpeg", "other.webp", "third.jpg", "solo.jpg"):
        make_image(badge_dir / name)

    files = [f.name for f in sprite_tool.collect_badge_files()]

    assert files == ["other.webp", "slug.png", "solo.jpg", "third.jpg"]
    out = capsys.readouterr().out
    assert "slug.jpg duplicates slug.png" in out
    assert "other.jpeg duplicates other.webp" in out


def test_build_sprite_writes_one_rule_per_slug_inside_the_sheet(sprite_tool):
    badge_dir = sprite_tool.BADGE_DIR
    slugs = [f"badge-{i}" for i in range(5)]
    for slug in slugs:
        make_image(badge_dir / f"{slug}.png")
    make_image(badge_dir / "badge-0.jpg")  # same slug, other extension

    sprite_tool.build_sprite()

    rules = rules_of(sprite_tool.CSS_PATH)
    assert sorted(slug for slug, _, _ in rules) == slugs
    with Image.open(sprite_tool.SPRITE_PATH) as sheet:
        width, height = sheet.size
    assert (width, height) == (3 * 128, 2 * 128)  # 5 icons -> 3x2 grid
    positions = {(x, y) for _, x, y in rules}
    assert len(positions) == len(rules)
    for _, x, y in rules:
        assert x + 128 <= width
        assert y + 128 <= height


def test_rebuilding_does_not_pack_the_previous_sprite(sprite_tool):
    badge_dir = sprite_tool.BADGE_DIR
    for slug in ("one", "two", "three"):
        make_image(badge_dir / f"{slug}.png")

    sprite_tool.build_sprite()
    first_css = sprite_tool.CSS_PATH.read_text(encoding="utf-8")
    assert sprite_tool.SPRITE_PATH.exists()
    sprite_tool.build_sprite()

    assert sprite_tool.CSS_PATH.read_text(encoding="utf-8") == first_css
    assert "badge-sprite" not in first_css
    assert [slug for slug, _, _ in rules_of(sprite_tool.CSS_PATH)] == ["one", "three", "two"]


def test_build_sprite_with_no_images_writes_nothing(sprite_tool, capsys):
    sprite_tool.build_sprite()

    assert "No images found." in capsys.readouterr().out
    assert not sprite_tool.SPRITE_PATH.exists()
    assert not sprite_tool.CSS_PATH.exists()


def test_committed_sprite_css_matches_the_badge_images(sprite_tool):
    """Guards against adding/removing a badge PNG without rebuilding the sprite."""
    repo = sprite_tool.REPO_ROOT
    badge_dir = repo / "frontend" / "static" / "images" / "achievement_badges"
    css_path = repo / "frontend" / "src" / "assets" / "css" / "sprite.css"
    slugs = sorted(f.stem for f in badge_dir.glob("*.png"))

    rules = rules_of(css_path)

    assert sorted(slug for slug, _, _ in rules) == slugs
    assert "sprite" not in {slug for slug, _, _ in rules}
    with Image.open(badge_dir / "sprite.webp") as sheet:
        width, height = sheet.size
    assert len({(x, y) for _, x, y in rules}) == len(rules)
    for slug, x, y in rules:
        assert x + 128 <= width and y + 128 <= height, slug


def test_sprite_url_is_versioned_by_content(sprite_tool):
    """The CSS points at sprite.webp?v=<hash of the sprite>, so a changed sprite busts caches."""
    make_image(sprite_tool.BADGE_DIR / "alpha.png")
    sprite_tool.build_sprite()

    version = hashlib.md5(sprite_tool.SPRITE_PATH.read_bytes()).hexdigest()[:8]
    assert f"sprite.webp?v={version}'" in sprite_tool.CSS_PATH.read_text(encoding="utf-8")


def test_committed_sprite_css_version_matches_the_committed_sprite(sprite_tool):
    repo = sprite_tool.REPO_ROOT
    sprite = repo / "frontend" / "static" / "images" / "achievement_badges" / "sprite.webp"
    css = (repo / "frontend" / "src" / "assets" / "css" / "sprite.css").read_text(encoding="utf-8")

    version = hashlib.md5(sprite.read_bytes()).hexdigest()[:8]
    assert f"sprite.webp?v={version}'" in css
