import os

import fitz

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
LOCAL_MOCKUPS_DIR = os.path.join(BASE_DIR, "mockups", "Certificate_Samples")
ONEDRIVE_CC_DIR = r"C:\Users\Ben\OneDrive\Career\Teaching\Blossom\Computer Science\Code Combat\Certificates"
OUTPUT_DIR = os.path.join(BASE_DIR, "backend", "application", "static", "certificate_templates")

# Mappings of sample filenames to course slugs
CC_FILES = {
    "Alice_CS1.pdf": "cs-1",
    "Anda_CS2.pdf": "cs-2",
    "Estelle_CS3.pdf": "cs-3",
    "Eugene_CS4.pdf": "cs-4",
    "Anda_GD1.pdf": "gd-1",
    "Anda_GD2.pdf": "gd-2",
    "Estelle_WD1.pdf": "wd-1"
}

OZARIA_FILES = {
    "Anda_Ch1.pdf": "oz-1",
    "Anda_Ch2.pdf": "oz-2",
    "Nont_Ch3.pdf": "oz-3",
    # Default oz-4 to use Ch3 sample as base
    "Nont_Ch3_oz4": "oz-4"
}

ALIAS_MAP = {
    "cs-1": ["cs1", "560f1a9f22961295f9427742"],
    "cs-2": ["cs2", "5632661322961295f9428638"],
    "cs-3": ["cs3", "56462f935afde0c6fd30fc8c"],
    "cs-4": ["cs4", "56462f935afde0c6fd30fc8d"],
    "cs-5": ["cs5", "569ed916efa72b0ced971447"],
    "cs-6": ["cs6", "5817d673e85d1220db624ca4"],
    "gd-1": ["gd1", "5789587aad86a6efb573701e"],
    "gd-2": ["gd2", "57b621e7ad86a6efb5737e64"],
    "gd-3": ["gd3", "5a0df02b8f2391437740f74f"],
    "wd-1": ["wd1", "5789587aad86a6efb573701f"],
    "wd-2": ["wd2", "5789587aad86a6efb5737020"],
    "oz-1": ["oz1", "ozaria1", "ozaria-1", "5d41d731a8d1836b5aa3cba1"],
    "oz-2": ["oz2", "ozaria2", "ozaria-2", "5d8a57abe8919b28d5113af1"],
    "oz-3": ["oz3", "ozaria3", "ozaria-3", "5e27600d1c9d440000ac3ee7"],
    "oz-4": ["oz4", "ozaria4", "ozaria-4", "5f0cb0b7a2492bba0b3520df"],
}

def process_template(input_path, output_path, is_ozaria=False):
    if not os.path.exists(input_path):
        return False

    doc = fitz.open(input_path)
    page = doc[0]
    # Ozaria name area: y=205–250; CodeCombat name area: y=190–255
    rect = fitz.Rect(0, 205, page.rect.width, 250) if is_ozaria else fitz.Rect(0, 190, page.rect.width, 255)

    page.draw_rect(rect, color=(1, 1, 1), fill=(1, 1, 1))
    doc.save(output_path)
    doc.close()
    print(f"Saved template to {output_path}")
    return True

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Process CodeCombat samples
    for filename, slug in CC_FILES.items():
        candidates = [
            os.path.join(LOCAL_MOCKUPS_DIR, filename),
            os.path.join(LOCAL_MOCKUPS_DIR, "CodeCombat", filename),
            os.path.join(ONEDRIVE_CC_DIR, filename),
        ]
        input_path = next((p for p in candidates if os.path.exists(p)), None)
        if input_path:
            output_path = os.path.join(OUTPUT_DIR, f"{slug}.pdf")
            process_template(input_path, output_path, is_ozaria=False)

    # Process Ozaria samples
    ozaria_dir = os.path.join(LOCAL_MOCKUPS_DIR, "Ozaria")
    for key, slug in OZARIA_FILES.items():
        filename = "Nont_Ch3.pdf" if key == "Nont_Ch3_oz4" else key
        input_path = os.path.join(ozaria_dir, filename)
        if os.path.exists(input_path):
            output_path = os.path.join(OUTPUT_DIR, f"{slug}.pdf")
            process_template(input_path, output_path, is_ozaria=True)

    # Clean up non-canonical alias files
    canonical_files = {f"{slug}.pdf" for slug in list(CC_FILES.values()) + list(OZARIA_FILES.values())}
    for item in os.listdir(OUTPUT_DIR):
        if item.endswith(".pdf") and item not in canonical_files:
            os.remove(os.path.join(OUTPUT_DIR, item))
            print(f"Removed non-canonical duplicate: {item}")

if __name__ == "__main__":
    main()


