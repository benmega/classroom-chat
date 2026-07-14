import os
import math
from PIL import Image, ImageDraw, ImageFont

# Define target folder
TARGET_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "static", "images", "project_templates"))
os.makedirs(TARGET_DIR, exist_ok=True)

# Project templates data (name, description, chapter, gradient start/end, icon type)
PROJECTS = [
    {
        "name": "Text-Based Adventure",
        "colors": ((45, 20, 90), (160, 32, 240)),  # Deep purple to violet
        "icon": "terminal"
    },
    {
        "name": "Practical Programming",
        "colors": ((15, 32, 67), (0, 150, 136)),  # Slate blue to teal
        "icon": "cog"
    },
    {
        "name": "Dangerous Skies",
        "colors": ((10, 24, 74), (0, 191, 255)),  # Navy blue to deep sky blue
        "icon": "weather"
    },
    {
        "name": "Turtle Dragon",
        "colors": ((11, 57, 31), (76, 175, 80)),  # Dark green to emerald
        "icon": "shield"
    },
    {
        "name": "Simulation",
        "colors": ((33, 13, 61), (138, 43, 226)),  # Dark violet to blue-violet
        "icon": "network"
    },
    {
        "name": "bolt.new",
        "colors": ((9, 30, 80), (111, 66, 193)),  # Dark blue to medium purple
        "icon": "bolt"
    },
    {
        "name": "Tabula Rasa",
        "colors": ((30, 30, 30), (108, 117, 125)),  # Charcoal to gray
        "icon": "grid"
    },
    {
        "name": "Gauntlet",
        "colors": ((90, 10, 10), (255, 69, 0)),  # Crimson to red-orange
        "icon": "swords"
    },
    {
        "name": "Game Dev 1 Final Project",
        "colors": ((10, 60, 80), (0, 206, 209)),  # Dark cyan to turquoise
        "icon": "gamepad"
    },
    {
        "name": "Story Maker",
        "colors": ((139, 10, 80), (255, 105, 180)),  # Dark pink to hot pink
        "icon": "book"
    },
    {
        "name": "Wanted Poster",
        "colors": ((88, 55, 20), (218, 165, 32)),  # Saddle brown to goldenrod
        "icon": "poster"
    },
    {
        "name": "Game Dev 2 Final Project",
        "colors": ((35, 10, 75), (106, 90, 205)),  # Dark indigo to slate blue
        "icon": "mouse"
    },
    {
        "name": "Quizlet",
        "colors": ((10, 75, 75), (32, 178, 170)),  # Teal to light sea green
        "icon": "checklist"
    },
    {
        "name": "Game Dev 3",
        "colors": ((75, 0, 130), (186, 85, 211)),  # Indigo to medium orchid
        "icon": "controller_stars"
    },
    {
        "name": "Arcade Card or Board Game",
        "colors": ((95, 10, 95), (255, 20, 147)),  # Dark magenta to deep pink
        "icon": "dice"
    },
    {
        "name": "Curiosity Sandbox",
        "colors": ((90, 50, 10), (255, 165, 0)),  # Dark orange to orange
        "icon": "sandbox"
    },
    {
        "name": "Binary Search & Algorithms",
        "colors": ((10, 50, 90), (0, 250, 154)),  # Blue to medium spring green
        "icon": "binary_tree"
    },
    {
        "name": "Capstone Challenge",
        "colors": ((15, 30, 95), (255, 215, 0)),  # Royal blue to gold
        "icon": "trophy"
    },
    {
        "name": "Group Roblox Game",
        "colors": ((90, 10, 20), (220, 20, 60)),  # Dark red to crimson
        "icon": "blocks"
    },
    {
        "name": "Favorite Animal Page",
        "colors": ((25, 70, 25), (173, 255, 47)),  # Green to green-yellow
        "icon": "paw"
    },
    {
        "name": "Profile Page",
        "colors": ((10, 45, 95), (30, 144, 255)),  # Navy to dodger blue
        "icon": "user_card"
    }
]

# Card dimensions
WIDTH = 800
HEIGHT = 450

def draw_vertical_gradient(draw, width, height, start_color, end_color):
    for y in range(height):
        # Calculate vertical interpolation
        factor = y / height
        r = int(start_color[0] + (end_color[0] - start_color[0]) * factor)
        g = int(start_color[1] + (end_color[1] - start_color[1]) * factor)
        b = int(start_color[2] + (end_color[2] - start_color[2]) * factor)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

def draw_abstract_background(draw, width, height):
    # Draw a clean high-tech grid overlay at low opacity
    grid_spacing = 40
    for x in range(0, width, grid_spacing):
        draw.line([(x, 0), (x, height)], fill=(255, 255, 255, 12), width=1)
    for y in range(0, height, grid_spacing):
        draw.line([(0, y), (width, y)], fill=(255, 255, 255, 12), width=1)
        
    # Draw large concentric circles at the top-right corner
    draw.ellipse([width - 150, -150, width + 150, 150], outline=(255, 255, 255, 15), width=2)
    draw.ellipse([width - 250, -250, width + 250, 250], outline=(255, 255, 255, 8), width=1)
    draw.ellipse([width - 350, -350, width + 350, 350], outline=(255, 255, 255, 4), width=1)

def draw_icon(draw, cx, cy, icon_type):
    # Helper to draw beautiful abstract icon shapes
    if icon_type == "terminal":
        # Draw ">_"
        draw.line([(cx - 40, cy - 30), (cx - 10, cy), (cx - 40, cy + 30)], fill=(255, 255, 255, 200), width=8)
        draw.line([(cx, cy + 30), (cx + 40, cy + 30)], fill=(255, 255, 255, 200), width=8)
    elif icon_type == "cog":
        # Draw gear/cogwheel
        draw.ellipse([cx - 30, cy - 30, cx + 30, cy + 30], outline=(255, 255, 255, 200), width=8)
        draw.ellipse([cx - 10, cy - 10, cx + 10, cy + 10], outline=(255, 255, 255, 150), width=4)
        for i in range(8):
            angle = i * (math.pi / 4)
            x1 = cx + int(30 * math.cos(angle))
            y1 = cy + int(30 * math.sin(angle))
            x2 = cx + int(45 * math.cos(angle))
            y2 = cy + int(45 * math.sin(angle))
            draw.line([(x1, y1), (x2, y2)], fill=(255, 255, 255, 200), width=8)
    elif icon_type == "weather":
        # Clouds and lightning
        draw.ellipse([cx - 30, cy - 10, cx + 10, cy + 30], fill=(255, 255, 255, 180))
        draw.ellipse([cx - 10, cy - 25, cx + 35, cy + 20], fill=(255, 255, 255, 220))
        draw.ellipse([cx + 15, cy - 10, cx + 45, cy + 25], fill=(255, 255, 255, 180))
        # lightning bolt
        draw.polygon([(cx, cy + 20), (cx - 15, cy + 50), (cx - 5, cy + 50), (cx - 20, cy + 80), (cx + 5, cy + 40), (cx - 5, cy + 40)], fill=(255, 235, 59, 230))
    elif icon_type == "shield":
        # Dragon Shield
        draw.polygon([
            (cx, cy - 40),
            (cx + 35, cy - 25),
            (cx + 30, cy + 15),
            (cx, cy + 45),
            (cx - 30, cy + 15),
            (cx - 35, cy - 25)
        ], outline=(255, 255, 255, 200), width=6)
        # Inner design
        draw.line([(cx, cy - 40), (cx, cy + 45)], fill=(255, 255, 255, 120), width=4)
        draw.line([(cx - 35, cy - 10), (cx + 35, cy - 10)], fill=(255, 255, 255, 120), width=4)
    elif icon_type == "network":
        # Orbiting nodes
        draw.ellipse([cx - 35, cy - 35, cx + 35, cy + 35], outline=(255, 255, 255, 80), width=2)
        # Core
        draw.ellipse([cx - 12, cy - 12, cx + 12, cy + 12], fill=(255, 255, 255, 220))
        # Satellites
        nodes = [(cx - 40, cy - 20), (cx + 40, cy + 20), (cx + 10, cy - 45)]
        for nx, ny in nodes:
            draw.line([(cx, cy), (nx, ny)], fill=(255, 255, 255, 120), width=2)
            draw.ellipse([nx - 8, ny - 8, nx + 8, ny + 8], fill=(255, 255, 255, 220))
    elif icon_type == "bolt":
        # Massive lightning bolt
        draw.polygon([
            (cx + 15, cy - 50),
            (cx - 25, cy + 10),
            (cx - 5, cy + 10),
            (cx - 20, cy + 60),
            (cx + 25, cy - 10),
            (cx + 5, cy - 10)
        ], fill=(255, 255, 255, 220))
    elif icon_type == "grid":
        # Cartesian grid axes and vector
        draw.line([(cx - 50, cy), (cx + 50, cy)], fill=(255, 255, 255, 120), width=2)
        draw.line([(cx, cy - 50), (cx, cy + 50)], fill=(255, 255, 255, 120), width=2)
        # draw a vector line
        draw.line([(cx, cy), (cx + 35, cy - 35)], fill=(255, 255, 255, 230), width=5)
        draw.ellipse([cx + 32, cy - 38, cx + 38, cy - 32], fill=(255, 255, 255, 230))
    elif icon_type == "swords":
        # Crossed swords/lines
        draw.line([(cx - 35, cy + 35), (cx + 35, cy - 35)], fill=(255, 255, 255, 200), width=6)
        draw.line([(cx + 35, cy + 35), (cx - 35, cy - 35)], fill=(255, 255, 255, 200), width=6)
        # Guards
        draw.line([(cx - 25, cy + 15), (cx - 15, cy + 25)], fill=(255, 255, 255, 220), width=8)
        draw.line([(cx + 25, cy + 15), (cx + 15, cy + 25)], fill=(255, 255, 255, 220), width=8)
    elif icon_type == "gamepad":
        # Retro controller
        draw.rounded_rectangle([cx - 45, cy - 25, cx + 45, cy + 25], radius=15, fill=(255, 255, 255, 180))
        # D-pad
        draw.line([(cx - 30, cy), (cx - 14, cy)], fill=(40, 40, 40, 200), width=5)
        draw.line([(cx - 22, cy - 8), (cx - 22, cy + 8)], fill=(40, 40, 40, 200), width=5)
        # Buttons
        draw.ellipse([cx + 12, cy - 6, cx + 22, cy + 4], fill=(220, 20, 60, 200))
        draw.ellipse([cx + 24, cy + 2, cx + 34, cy + 12], fill=(220, 20, 60, 200))
    elif icon_type == "book":
        # Story book
        draw.polygon([(cx, cy + 30), (cx - 40, cy + 20), (cx - 40, cy - 25), (cx, cy - 15)], fill=(255, 255, 255, 180))
        draw.polygon([(cx, cy + 30), (cx + 40, cy + 20), (cx + 40, cy - 25), (cx, cy - 15)], fill=(255, 255, 255, 220))
        # Book pages lines
        draw.line([(cx - 30, cy - 12), (cx - 5, cy - 7)], fill=(80, 80, 80, 100), width=2)
        draw.line([(cx - 30, cy + 2), (cx - 5, cy + 7)], fill=(80, 80, 80, 100), width=2)
        draw.line([(cx + 30, cy - 12), (cx + 5, cy - 7)], fill=(80, 80, 80, 100), width=2)
        draw.line([(cx + 30, cy + 2), (cx + 5, cy + 7)], fill=(80, 80, 80, 100), width=2)
    elif icon_type == "poster":
        # Wanted Poster
        draw.rectangle([cx - 30, cy - 40, cx + 30, cy + 40], outline=(255, 255, 255, 200), width=4)
        # A star in the center
        draw.polygon([
            (cx, cy - 15), (cx + 4, cy - 4), (cx + 15, cy - 4), (cx + 7, cy + 3),
            (cx + 10, cy + 14), (cx, cy + 7), (cx - 10, cy + 14), (cx - 7, cy + 3),
            (cx - 15, cy - 4), (cx - 4, cy - 4)
        ], fill=(255, 215, 0, 220))
    elif icon_type == "mouse":
        # PC Mouse
        draw.rounded_rectangle([cx - 20, cy - 35, cx + 20, cy + 35], radius=18, outline=(255, 255, 255, 200), width=5)
        draw.line([(cx, cy - 35), (cx, cy)], fill=(255, 255, 255, 200), width=3)
        draw.line([(cx - 20, cy), (cx + 20, cy)], fill=(255, 255, 255, 120), width=3)
        # Scroll wheel
        draw.rectangle([cx - 3, cy - 25, cx + 3, cy - 12], fill=(255, 255, 255, 220))
    elif icon_type == "checklist":
        # Checklist clipboard
        draw.rounded_rectangle([cx - 25, cy - 35, cx + 25, cy + 35], radius=8, outline=(255, 255, 255, 200), width=4)
        # Clip
        draw.rectangle([cx - 10, cy - 42, cx + 10, cy - 33], fill=(255, 255, 255, 220))
        # Checks
        for y_off in [-15, 2, 19]:
            # box
            draw.rectangle([cx - 16, cy + y_off - 5, cx - 6, cy + y_off + 5], outline=(255, 255, 255, 200), width=2)
            # checkmark line
            draw.line([(cx - 14, cy + y_off), (cx - 11, cy + y_off + 3), (cx - 8, cy + y_off - 4)], fill=(0, 250, 154, 230), width=3)
    elif icon_type == "controller_stars":
        # Gamepad + Stars
        draw.rounded_rectangle([cx - 45, cy - 20, cx + 45, cy + 20], radius=12, fill=(255, 255, 255, 160))
        # D-pad
        draw.line([(cx - 30, cy), (cx - 18, cy)], fill=(40, 40, 40, 200), width=4)
        draw.line([(cx - 24, cy - 6), (cx - 24, cy + 6)], fill=(40, 40, 40, 200), width=4)
        # buttons
        draw.ellipse([cx + 20, cy - 4, cx + 28, cy + 4], fill=(220, 20, 60, 200))
        # Star above
        draw.polygon([(cx, cy - 38), (cx + 3, cy - 29), (cx + 12, cy - 29), (cx + 5, cy - 24), (cx + 8, cy - 15), (cx, cy - 20), (cx - 8, cy - 15), (cx - 5, cy - 24), (cx - 12, cy - 29), (cx - 3, cy - 29)], fill=(255, 215, 0, 230))
    elif icon_type == "dice":
        # A pair of dice
        draw.rounded_rectangle([cx - 35, cy - 25, cx - 5, cy + 5], radius=6, outline=(255, 255, 255, 200), width=4)
        draw.rounded_rectangle([cx + 5, cy - 5, cx + 35, cy + 25], radius=6, outline=(255, 255, 255, 200), width=4)
        # Dots
        draw.ellipse([cx - 22, cy - 12, cx - 18, cy - 8], fill=(255, 255, 255, 200))
        draw.ellipse([cx - 12, cy - 2, cx - 8, cy + 2], fill=(255, 255, 255, 200))
        # Dice 2 center
        draw.ellipse([cx + 18, cy + 8, cx + 22, cy + 12], fill=(255, 255, 255, 200))
    elif icon_type == "sandbox":
        # sandbox (bucket & spade)
        draw.polygon([(cx - 30, cy + 30), (cx + 10, cy + 30), (cx + 20, cy - 10), (cx - 20, cy - 10)], fill=(255, 255, 255, 180))
        # spade
        draw.line([(cx + 15, cy - 30), (cx + 25, cy + 10)], fill=(255, 255, 255, 220), width=5)
        draw.polygon([(cx + 20, cy - 10), (cx + 35, cy - 5), (cx + 25, cy + 10), (cx + 10, cy + 5)], fill=(255, 255, 255, 220))
    elif icon_type == "binary_tree":
        # Node tree structure
        draw.line([(cx, cy - 35), (cx - 25, cy + 5)], fill=(255, 255, 255, 150), width=3)
        draw.line([(cx, cy - 35), (cx + 25, cy + 5)], fill=(255, 255, 255, 150), width=3)
        draw.line([(cx - 25, cy + 5), (cx - 40, cy + 40)], fill=(255, 255, 255, 150), width=3)
        draw.line([(cx - 25, cy + 5), (cx - 10, cy + 40)], fill=(255, 255, 255, 150), width=3)
        # Nodes
        draw.ellipse([cx - 10, cy - 45, cx + 10, cy - 25], fill=(255, 255, 255, 250))
        draw.ellipse([cx - 35, cy - 5, cx - 15, cy + 15], fill=(255, 255, 255, 250))
        draw.ellipse([cx + 15, cy - 5, cx + 35, cy + 15], fill=(255, 255, 255, 200))
    elif icon_type == "trophy":
        # Trophy cup
        draw.polygon([(cx - 25, cy - 35), (cx + 25, cy - 35), (cx + 15, cy + 10), (cx - 15, cy + 10)], fill=(255, 215, 0, 230))
        draw.rectangle([cx - 5, cy + 10, cx + 5, cy + 30], fill=(255, 215, 0, 230))
        draw.ellipse([cx - 20, cy + 25, cx + 20, cy + 35], fill=(255, 215, 0, 230))
        # handles
        draw.ellipse([cx - 32, cy - 28, cx - 15, cy - 12], outline=(255, 215, 0, 230), width=4)
        draw.ellipse([cx + 15, cy - 28, cx + 32, cy - 12], outline=(255, 215, 0, 230), width=4)
    elif icon_type == "blocks":
        # Roblox-style blocks stacked
        draw.rectangle([cx - 30, cy + 5, cx + 10, cy + 35], fill=(255, 255, 255, 200))
        draw.rectangle([cx - 10, cy - 25, cx + 30, cy + 15], fill=(255, 255, 255, 170))
        draw.rectangle([cx - 20, cy - 10, cx, cy + 10], fill=(255, 255, 255, 220))
    elif icon_type == "paw":
        # Paw print
        draw.ellipse([cx - 20, cy - 10, cx + 20, cy + 25], fill=(255, 255, 255, 220))
        draw.ellipse([cx - 28, cy - 25, cx - 12, cy - 10], fill=(255, 255, 255, 180))
        draw.ellipse([cx - 10, cy - 33, cx + 10, cy - 18], fill=(255, 255, 255, 180))
        draw.ellipse([cx + 12, cy - 25, cx + 28, cy - 10], fill=(255, 255, 255, 180))
    elif icon_type == "user_card":
        # Profile ID
        draw.rounded_rectangle([cx - 40, cy - 30, cx + 40, cy + 30], radius=8, outline=(255, 255, 255, 200), width=4)
        # Profile avatar
        draw.ellipse([cx - 25, cy - 15, cx - 11, cy - 1], fill=(255, 255, 255, 200))
        draw.chord([cx - 32, cy - 2, cx - 4, cy + 20], 180, 360, fill=(255, 255, 255, 200))
        # Lines representing info
        draw.line([(cx + 2, cy - 10), (cx + 25, cy - 10)], fill=(255, 255, 255, 150), width=3)
        draw.line([(cx + 2, cy), (cx + 25, cy)], fill=(255, 255, 255, 150), width=3)
        draw.line([(cx + 2, cy + 10), (cx + 18, cy + 10)], fill=(255, 255, 255, 150), width=3)

# Load font (fall back if not found)
try:
    font = ImageFont.truetype("C:\\Windows\\Fonts\\segoeuib.ttf", 36)
except Exception:
    font = ImageFont.load_default()

for proj in PROJECTS:
    # Create RGBA image
    img = Image.new("RGBA", (WIDTH, HEIGHT))
    # We draw on a canvas where alpha will be merged
    draw = ImageDraw.Draw(img)
    
    # Draw background gradient
    draw_vertical_gradient(draw, WIDTH, HEIGHT, proj["colors"][0], proj["colors"][1])
    
    # Draw abstract background details
    draw_abstract_background(draw, WIDTH, HEIGHT)
    
    # Draw icon in the center of top half
    cx, cy = WIDTH // 2, HEIGHT // 2 - 30
    draw_icon(draw, cx, cy, proj["icon"])
    
    # Render the project title beautifully at the bottom
    text = proj["name"]
    # Get text size
    try:
        left, top, right, bottom = draw.textbbox((0, 0), text, font=font)
        text_w = right - left
        text_h = bottom - top
    except AttributeError:
        # Fallback for older PIL versions
        text_w, text_h = draw.textsize(text, font=font) if hasattr(draw, "textsize") else (200, 20)
        
    text_x = (WIDTH - text_w) // 2
    text_y = HEIGHT - 100
    
    # Draw a soft dark translucent bar underneath the text to make it extremely readable
    bar_h = 70
    draw.rectangle([(0, HEIGHT - 120), (WIDTH, HEIGHT - 40)], fill=(0, 0, 0, 60))
    
    # Draw text
    draw.text((text_x, text_y), text, fill=(255, 255, 255, 255), font=font)
    
    # Save the file
    slug = proj["name"].lower().replace(" ", "_").replace(".", "_").replace("&", "_").replace("-", "_")
    # Clean double underscores
    while "__" in slug:
        slug = slug.replace("__", "_")
    slug = slug.strip("_")
    
    filename = f"{slug}.png"
    filepath = os.path.join(TARGET_DIR, filename)
    
    # Convert RGBA to RGB (with gradient background, alpha is opaque)
    final_img = img.convert("RGB")
    final_img.save(filepath, "PNG")
    print(f"Generated placeholder image: {filename} at {filepath}")

print("All placeholder images generated successfully!")
