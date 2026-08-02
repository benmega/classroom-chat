import logging
import os

import fitz

logger = logging.getLogger(__name__)

def generate_certificate(template_path_or_course_id, output_path, new_name):
    """
    Generates a new certificate by redacting the old name from the template
    and inserting the new name.
    If output_path is None, returns the generated PDF as bytes.
    """
    template_path = template_path_or_course_id
    if template_path_or_course_id and not os.path.exists(template_path_or_course_id):
        from application.utilities.db_helpers import get_canonical_course_slug, resolve_course_id

        templates_dir = os.path.join(os.path.dirname(__file__), "..", "static", "certificate_templates")
        canonical_slug = get_canonical_course_slug(template_path_or_course_id)
        mongo_id = resolve_course_id(template_path_or_course_id)

        for c in [template_path_or_course_id, canonical_slug, mongo_id]:
            if not c:
                continue
            possible_path = os.path.join(templates_dir, f"{c}.pdf")
            if os.path.exists(possible_path):
                template_path = possible_path
                break


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
        width = page.rect.width

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
