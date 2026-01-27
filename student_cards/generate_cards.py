import io
import os

import qrcode
from PIL import Image
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

# ================= CONFIGURATION =================
# Path to your logo (Converted on the fly if it is .ico)
LOGO_PATH = r"C:\Users\Ben\PycharmProjects\groupChat2\static\images\logo.ico"
OUTPUT_FILENAME = "classroom_cards.pdf"

# Base URL for the QR code
BASE_URL = "https://blossom.benmega.com/user/profile/"

# Card Dimensions (Standard Business Card)
CARD_WIDTH = 3.5 * inch
CARD_HEIGHT = 2.0 * inch
MARGIN_X = 0.75 * inch  # Left margin to center on page
MARGIN_Y = 0.5 * inch  # Bottom margin


# =================================================

def get_image_from_path(path):
    """
    Helper to handle .ico files by converting them to PNG in memory
    so ReportLab can read them.
    """
    if not os.path.exists(path):
        print(f"Warning: Logo not found at {path}")
        return None

    try:
        img = Image.open(path)
        img_buffer = io.BytesIO()
        img.save(img_buffer, format='PNG')
        img_buffer.seek(0)
        return ImageReader(img_buffer)
    except Exception as e:
        print(f"Error loading image: {e}")
        return None


def generate_qr(slug):
    """Generates a QR code image in memory."""
    url = f"{BASE_URL}{slug}"
    qr = qrcode.QRCode(box_size=10, border=1)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return ImageReader(buffer)


def draw_card(c, x, y, user, logo_reader):
    """
    Draws a single card at coordinates (x, y).
    """
    # 1. Draw Border (dashed line for cutting)
    c.setDash(3, 3)
    c.setLineWidth(0.5)
    c.setStrokeColorRGB(0.7, 0.7, 0.7)
    c.rect(x, y, CARD_WIDTH, CARD_HEIGHT)
    c.setDash([])  # Reset dash

    # 2. Draw Logo (Top Left)
    if logo_reader:
        # Resize logo to fit nicely, keeping aspect ratio roughly
        c.drawImage(logo_reader, x + 10, y + CARD_HEIGHT - 45, width=35, height=35, mask='auto')

    # 3. Draw Brand Name (Next to Logo)
    c.setFont("Helvetica-Bold", 16)
    c.setFillColorRGB(0.1, 0.3, 0.5)  # Blossom Blue-ish
    c.drawString(x + 50, y + CARD_HEIGHT - 35, "Blossom")

    # 4. Student Name
    c.setFont("Helvetica-Bold", 12)
    c.setFillColorRGB(0, 0, 0)
    # Use nickname as per your model logic, fallback to username
    display_name = user.nickname if user.nickname else user.username
    c.drawString(x + 15, y + CARD_HEIGHT - 65, f"Student: {display_name}")

    # 5. Profile Text Link
    c.setFont("Helvetica", 7)
    c.setFillColorRGB(0.3, 0.3, 0.3)
    full_link = f"blossom.benmega.com/user/profile/{user.slug}"
    c.drawString(x + 15, y + CARD_HEIGHT - 80, "My Profile:")
    c.setFillColorRGB(0, 0, 1)  # Blue link
    c.drawString(x + 15, y + CARD_HEIGHT - 90, full_link)

    # 6. Explanation Text (Bottom)
    c.setFont("Helvetica-Oblique", 7)
    c.setFillColorRGB(0.4, 0.4, 0.4)
    c.drawString(x + 15, y + 25, "Scan to view achievements, projects,")
    c.drawString(x + 15, y + 15, "and logs in our classroom community.")

    # 7. QR Code (Right Side)
    qr_img = generate_qr(user.slug)
    qr_size = 1.0 * inch
    # Position: Right aligned with some padding, centered vertically
    c.drawImage(qr_img, x + CARD_WIDTH - qr_size - 10, y + (CARD_HEIGHT - qr_size) / 2, width=qr_size, height=qr_size)


def create_pdf(users):
    c = canvas.Canvas(OUTPUT_FILENAME, pagesize=letter)
    width, height = letter

    # Load logo once
    logo_reader = get_image_from_path(LOGO_PATH)

    # Grid Configuration
    col_width = CARD_WIDTH
    row_height = CARD_HEIGHT
    cols = 2
    rows = 5  # 10 cards per page

    # Starting positions
    start_x = MARGIN_X
    start_y = height - MARGIN_Y - row_height

    col = 0
    row = 0

    for user in users:
        # Calculate X and Y for current card
        x = start_x + (col * col_width)
        y = start_y - (row * row_height)

        draw_card(c, x, y, user, logo_reader)

        # Update Grid Position
        col += 1
        if col >= cols:
            col = 0
            row += 1

        # New Page Logic
        if row >= rows:
            c.showPage()  # Create new page
            col = 0
            row = 0

    c.save()
    print(f"PDF generated successfully: {OUTPUT_FILENAME}")


# =================================================
# MOCK DATA WRAPPER
# Since I cannot connect to your DB, I am creating a mock class
# that mimics your User model structure.
# =================================================

class MockUser:
    def __init__(self, nickname, slug, username):
        self.nickname = nickname
        self.slug = slug
        self.username = username


# =================================================
# MAIN EXECUTION
# =================================================

if __name__ == "__main__":
    # OPTION A: If running inside your Flask/App context
    # from application.models.user import User
    # users = User.query.all()

    # OPTION B: Mock Data (For testing layout)
    users = [
        MockUser("Ben", "ben", "ben_admin"),
        MockUser("Alice", "alice-doe", "alice123"),
        MockUser("Bob", "bob-smith", "bob_builder"),
        MockUser("Charlie", "charlie-brown", "chuck"),
        MockUser("Diana", "diana-prince", "ww"),
        MockUser("Evan", "evan-mighty", "evan"),
        MockUser("Fiona", "fiona-apple", "fiona"),
        MockUser("George", "george-jungle", "tarzan"),
        MockUser("Hannah", "hannah-montana", "miley"),
        MockUser("Ian", "ian-mckellen", "gandalf"),
        MockUser("Jenny", "jenny-block", "jlo"),  # Starts page 2
    ]

    create_pdf(users)