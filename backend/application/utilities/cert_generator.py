import logging
import os

import fitz

logger = logging.getLogger(__name__)

def generate_certificate(template_path, output_path, new_name):
    """
    Generates a new certificate by redacting the old name from the template
    and inserting the new name.
    If output_path is None, returns the generated PDF as bytes.
    """
    if not template_path or not os.path.exists(template_path):
        logger.warning(f"Template not found or none: {template_path}. Generating default.")
        doc = fitz.open()
        page = doc.new_page(width=842, height=595)  # A4 landscape
        
        # Center the title
        title = "Certificate of Completion"
        font_size_title = 50
        font = fitz.Font(fontname="helv")
        title_width = font.text_length(title, fontsize=font_size_title)
        page.insert_text(fitz.Point((842 - title_width) / 2, 100), title, fontname="helv", fontsize=font_size_title)

        font_size = 44
        text_length = font.text_length(new_name, fontsize=font_size)
        x = (842 - text_length) / 2
        y = 235
        page.insert_text(fitz.Point(x, y), new_name, fontname="helv", fontsize=font_size, color=(0, 0, 0))
    else:
        doc = fitz.open(template_path)
        page = doc[0]

        # We found the text at y=190 to 250. We blank out a horizontal strip.
        width = page.rect.width
        page.draw_rect(fitz.Rect(0, 190, width, 255), color=(1, 1, 1), fill=(1, 1, 1), overlay=True)

        # Insert new text, centered.
        font_size = 44
        font = fitz.Font(fontname="helv")
        text_length = font.text_length(new_name, fontsize=font_size)
        x = (width - text_length) / 2
        y = 235 # Baseline

        page.insert_text(fitz.Point(x, y), new_name, fontname="helv", fontsize=font_size, color=(0, 0, 0))
    page = doc[0]

    # We found the text at y=190 to 250. We blank out a horizontal strip.
    width = page.rect.width
    page.draw_rect(fitz.Rect(0, 190, width, 255), color=(1, 1, 1), fill=(1, 1, 1), overlay=True)

    # Insert new text, centered.
    font_size = 44
    font = fitz.Font(fontname="helv")
    text_length = font.text_length(new_name, fontsize=font_size)
    x = (width - text_length) / 2
    y = 235 # Baseline

    page.insert_text(fitz.Point(x, y), new_name, fontname="helv", fontsize=font_size, color=(0, 0, 0))

    if output_path:
        doc.save(output_path)
        doc.close()
    else:
        pdf_bytes = doc.write()
        doc.close()
        return pdf_bytes
