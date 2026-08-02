
import fitz


def redact_and_replace(input_pdf, output_pdf, new_text):
    doc = fitz.open(input_pdf)
    page = doc[0]

    # We found the text at y=190 to 250. Let's blank out the whole line horizontally

    # Actually wait, let's just get the bounding box of the whole page
    page_rect = page.rect
    width = page_rect.width
    print("Page width:", width)

    # Draw a white rectangle over the name area
    # Note: CodeCombat certificates might have a white background, or transparent?
    # Usually they have a white background in the center.
    page.draw_rect(fitz.Rect(0, 190, width, 255), color=(1, 1, 1), fill=(1, 1, 1), overlay=True)

    # Insert new text, centered.
    font_size = 44
    font = fitz.Font(fontname="helv")
    text_length = font.text_length(new_text, fontsize=font_size)
    x = (width - text_length) / 2
    y = 235 # Baseline

    page.insert_text(fitz.Point(x, y), new_text, fontname="helv", fontsize=font_size, color=(0, 0, 0))

    doc.save(output_pdf)
    doc.close()

if __name__ == "__main__":
    redact_and_replace("mockups/Certificate_Samples/CodeCombat/Alice_CS1.pdf", "test_out.pdf", "Benjamin The Student")
