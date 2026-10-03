# tools/make_sprite_sheet.py
# Type: Utility Script
# Location: tools/
# Summary: Packs all achievement badge images into one sprite sheet and writes CSS mapping.

import hashlib
from math import ceil, sqrt
from pathlib import Path

from PIL import Image

# Repo root (classroom-chat/): this file lives in backend/tools/, so
# parents[0] = tools, parents[1] = backend, parents[2] = repo root.
REPO_ROOT = Path(__file__).resolve().parents[2]

# Input folder (badges)
BADGE_DIR = REPO_ROOT / "frontend" / "static" / "images" / "achievement_badges"

# Output paths
SPRITE_PATH = BADGE_DIR / "sprite.webp"
CSS_PATH = REPO_ROOT / "frontend" / "src" / "assets" / "css" / "sprite.css"

# Target icon size
ICON_SIZE = (128, 128)


# Accepted input extensions, in the order we prefer them when a slug has more
# than one file (the admin upload routes never remove an older extension).
SUFFIX_PRIORITY = (".png", ".webp", ".jpg", ".jpeg")


def _preference(path):
    """Sort key for files that share a stem: the lowest one is used."""
    return (SUFFIX_PRIORITY.index(path.suffix.lower()), path.name)


def collect_badge_files():
    """Return one source image per badge slug, sorted by name.

    The generated sprite lives in the same folder, so it is never an input, and
    only one file is kept per stem so a slug gets a single cell and CSS rule.
    """
    chosen = {}
    for f in BADGE_DIR.iterdir():
        if not f.is_file() or f.suffix.lower() not in SUFFIX_PRIORITY:
            continue
        if f.name == SPRITE_PATH.name:
            continue
        current = chosen.get(f.stem)
        if current is None:
            chosen[f.stem] = f
            continue
        keep, skip = sorted((current, f), key=_preference)
        chosen[f.stem] = keep
        print(f"Warning: {skip.name} duplicates {keep.name}; skipping {skip.name}")

    return sorted(chosen.values())


def build_sprite():
    files = collect_badge_files()

    if not files:
        print("No images found.")
        return

    # Arrange in grid
    cols = ceil(sqrt(len(files)))
    rows = ceil(len(files) / cols)

    sheet_w = cols * ICON_SIZE[0]
    sheet_h = rows * ICON_SIZE[1]
    sheet = Image.new("RGBA", (sheet_w, sheet_h), (0, 0, 0, 0))

    css_rules = []
    for idx, file in enumerate(files):
        img = Image.open(file).convert("RGBA")
        img.thumbnail(ICON_SIZE, Image.Resampling.LANCZOS)

        x = (idx % cols) * ICON_SIZE[0]
        y = (idx // cols) * ICON_SIZE[1]
        sheet.paste(img, (x, y), img)

        slug = file.stem
        css = f".badge-{slug} {{ background-position: -{x}px -{y}px; }}"
        css_rules.append(css)

    # Save sprite
    sheet.save(SPRITE_PATH, "WEBP", quality=80)
    print(f"Sprite saved to {SPRITE_PATH}")

    # Version the URL by content: the sprite is served with a long-lived cache, so
    # a browser holding an older sprite must fetch the new one with the new positions.
    version = hashlib.md5(SPRITE_PATH.read_bytes()).hexdigest()[:8]

    # Save CSS
    css_header = (
        ".badge {\n"
        f"  width: {ICON_SIZE[0]}px;\n"
        f"  height: {ICON_SIZE[1]}px;\n"
        f"  background-image: url('/static/images/achievement_badges/sprite.webp?v={version}');\n"
        "  background-repeat: no-repeat;\n"
        "  display: inline-block;\n"
        "}\n\n"
    )
    CSS_PATH.parent.mkdir(exist_ok=True)
    with open(CSS_PATH, "w", encoding="utf-8") as f:
        f.write(css_header + "\n".join(css_rules))
    print(f"CSS saved to {CSS_PATH}")


if __name__ == "__main__":
    build_sprite()
