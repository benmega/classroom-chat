import argparse
import io
import os
import sys
from datetime import date, timedelta
from pathlib import Path

# Allow running this file directly: it lives in backend/reports/student_cards/,
# so put backend/ on the path to import the application and the tools package.
BACKEND_DIR = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(BACKEND_DIR))

import qrcode
from application import create_app
from application.models.user import User
from PIL import Image
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
from tools.profile_urls import build_profile_url

# ================= CONFIGURATION =================

# 1. DYNAMIC PATH CALCULATION
# The logo is a frontend asset: backend/reports/student_cards -> repo root
REPO_ROOT = BACKEND_DIR.parent
LOGO_PATH = REPO_ROOT / "frontend" / "static" / "images" / "logo.ico"

OUTPUT_FILENAME = "classroom_cards.pdf"
# The PDF holds student names and profile QR links, so by default it goes into the
# git-ignored backend/userData/ folder instead of whatever the current directory is.
DEFAULT_OUTPUT_PATH = str(BACKEND_DIR / "userData" / "student_cards" / OUTPUT_FILENAME)

# Only students who earned a daily duck within this many days get a card
ACTIVE_DAYS = 90

# Card Dimensions
CARD_WIDTH = 3.5 * inch
CARD_HEIGHT = 2.0 * inch
MARGIN_X = 0.75 * inch
MARGIN_Y = 0.5 * inch


# =================================================


def get_image_from_path(path):
    if not os.path.exists(path):
        print(f"Warning: Logo not found at {path}")
        return None

    try:
        img = Image.open(path)
        return img.convert("RGBA")
    except Exception as e:
        print(f"Error loading image: {e}")
        return None


def generate_qr(slug):
    url = build_profile_url(slug)
    qr = qrcode.QRCode(box_size=10, border=1)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return ImageReader(buffer)


def draw_card(c, x, y, user, logo_img):
    # 1. Border
    c.setDash(3, 3)
    c.setLineWidth(0.5)
    c.setStrokeColorRGB(0.7, 0.7, 0.7)
    c.rect(x, y, CARD_WIDTH, CARD_HEIGHT)
    c.setDash([])

    # 2. Logo (Top Left - Subtle anchor)
    if logo_img:
        logo_reader = ImageReader(logo_img)
        # Moved slightly up and left to frame the card
        c.drawImage(
            logo_reader, x + 15, y + CARD_HEIGHT - 40, width=30, height=30, mask="auto"
        )

    # 3. Name (Center Left - Most Prominent)
    c.setFont("Helvetica-Bold", 28)  # Increased size
    c.setFillColorRGB(0, 0, 0)
    display_name = user.nickname if user.nickname else user.username
    # Vertically centered relative to the white space on the left
    c.drawString(x + 15, y + CARD_HEIGHT - 85, f"{display_name}")

    # 4. Text & Details (Bottom Left - Kept original text, just aligned)
    c.setFont("Helvetica", 8)
    c.setFillColorRGB(0, 0, 1)
    full_link = build_profile_url(user.slug).split("://", 1)[-1]
    c.drawString(x + 15, y + 35, full_link)  # Aligned X with Name

    c.setFont("Helvetica-Oblique", 9)
    c.setFillColorRGB(0.5, 0.5, 0.5)
    c.drawString(
        x + 15, y + 15, "Scan to view my achievements, projects, and class notes!"
    )  # Aligned X with Name

    # 5. QR Code (UNTOUCHED)
    qr_img = generate_qr(user.slug)
    qr_size = 1.0 * inch
    c.drawImage(
        qr_img,
        x + CARD_WIDTH - qr_size - 10,
        y + CARD_HEIGHT - qr_size - 10,
        width=qr_size,
        height=qr_size,
    )


def parse_args(argv=None):
    parser = argparse.ArgumentParser(description="Generate printable student QR cards.")
    parser.add_argument(
        "--output",
        default=DEFAULT_OUTPUT_PATH,
        help="Where to write the PDF (default: backend/userData/student_cards/classroom_cards.pdf)",
    )
    return parser.parse_args(argv)


def create_pdf(users, output_path=DEFAULT_OUTPUT_PATH):
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    c = canvas.Canvas(output_path, pagesize=letter)
    _width, height = letter

    # Debug print to confirm path
    print(f"Looking for logo at: {LOGO_PATH}")
    logo_img = get_image_from_path(LOGO_PATH)

    col_width = CARD_WIDTH
    row_height = CARD_HEIGHT
    cols = 2
    rows = 5

    start_x = MARGIN_X
    start_y = height - MARGIN_Y - row_height

    col = 0
    row = 0

    for user in users:
        x = start_x + (col * col_width)
        y = start_y - (row * row_height)

        draw_card(c, x, y, user, logo_img)

        col += 1
        if col >= cols:
            col = 0
            row += 1

        if row >= rows:
            c.showPage()
            col = 0
            row = 0

    c.save()
    print(f"PDF generated successfully: {output_path}")


# =================================================
# EXECUTION
# =================================================


def get_card_users():
    """Active, non-admin users with a profile slug (needs an app context)."""
    # last_daily_duck is a Date column holding the UTC day of the last award
    cutoff = date.today() - timedelta(days=ACTIVE_DAYS)

    return User.query.filter(
        User.role != "admin",
        ~User.nickname.startswith("blossomstudent"),
        User.last_daily_duck > cutoff,
        User.slug.isnot(None),
    ).all()


def main(argv=None):
    args = parse_args(argv)
    app = create_app()
    with app.app_context():
        create_pdf(get_card_users(), args.output)


if __name__ == "__main__":
    main()
