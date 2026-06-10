import os
from PIL import Image

def convert_to_webp(path):
    try:
        with Image.open(path) as img:
            base_name = os.path.splitext(path)[0]
            webp_path = base_name + ".webp"
            img.save(webp_path, "WEBP", quality=50)
            print(f"Converted {path} to {webp_path} - new size: {os.path.getsize(webp_path)} bytes")
    except Exception as e:
        print(f"Failed to convert {path}: {e}")

images_dir = r"c:\Users\Ben\AntiGravity\classroom-chat\frontend\public\static\images"

images = [
    "Default_pfp.jpg",
    "Default_pfp.png",
    "Project_placeholder.jpg",
    "Project_placeholder.png",
    "default_duck.png"
]

for img_name in images:
    path = os.path.join(images_dir, img_name)
    if os.path.exists(path):
        convert_to_webp(path)
