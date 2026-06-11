import os
from PIL import Image

def compress_image(path, max_size=(200, 200), quality=75):
    try:
        with Image.open(path) as img:
            img.thumbnail(max_size, Image.Resampling.LANCZOS)
            img.save(path, optimize=True, quality=quality)
            print(f"Compressed {path} - new size: {os.path.getsize(path)} bytes")
    except Exception as e:
        print(f"Failed to compress {path}: {e}")

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
        compress_image(path, max_size=(256, 256), quality=60)
