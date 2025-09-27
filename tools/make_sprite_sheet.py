# tools/make_sprite_sheet.py
# Type: Utility Script
# Location: tools/
# Summary: Packs all achievement badge images into one sprite sheet and writes CSS mapping.

import os
from pathlib import Path
from math import ceil, sqrt
from PIL import Image

# Project root assumed one level up from this script
PROJECT_ROOT = Path(__file__).resolve().parents[1]

# Input folder (badges)
BADGE_DIR = PROJECT_ROOT / "static" / "images" / "achievement_badges"

# Output paths
SPRITE_PATH = BADGE_DIR / "sprite.webp"
CSS_PATH = PROJECT_ROOT / "static" / "css" / "sprite.css"

# Target icon size
ICON_SIZE = (128, 128)

def build_sprite():
    files = [f for f in BADGE_DIR.iterdir() if f.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp")]
    files.sort()

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
        css = (
            f".badge-{slug} {{ "
            f"background-position: -{x}px -{y}px; "
            f"}}"
        )
        css_rules.append(css)

    # Save sprite
    sheet.save(SPRITE_PATH, "WEBP", quality=80)
    print(f"Sprite saved to {SPRITE_PATH}")

    # Save CSS
    css_header = (
        ".badge {\n"
        f"  width: {ICON_SIZE[0]}px;\n"
        f"  height: {ICON_SIZE[1]}px;\n"
        f"  background-image: url('../images/achievement_badges/sprite.webp');\n"
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
