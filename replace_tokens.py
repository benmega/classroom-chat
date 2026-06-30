import os
import re

variables_path = r"c:\Users\Ben\AntiGravity\classroom-chat\frontend\src\assets\css\variables.css"
src_dir = r"c:\Users\Ben\AntiGravity\classroom-chat\frontend\src"

# 1. Parse variables.css to extract color hexes and shadow values
hex_map = {}
shadow_map = {}

with open(variables_path, "r", encoding="utf-8") as f:
    content = f.read()

# Match --var-name: #hex;
hex_pattern = re.compile(r'(--[a-zA-Z0-9-]+):\s*(#[0-9a-fA-F]{3,6})\s*;')
for match in hex_pattern.finditer(content):
    var_name = match.group(1)
    hex_val = match.group(2).lower()
    # To handle 3-digit hex to 6-digit conversion for safer matching (optional)
    if len(hex_val) == 4:
        hex_val = '#' + hex_val[1]*2 + hex_val[2]*2 + hex_val[3]*2
    if hex_val not in hex_map:
        hex_map[hex_val] = f"var({var_name})"
        
# also map #fff to #ffffff
if '#ffffff' in hex_map:
    hex_map['#fff'] = hex_map['#ffffff']
if '#000000' in hex_map:
    hex_map['#000'] = hex_map['#000000']

# Map shadows
shadow_pattern = re.compile(r'(--shadow-[a-zA-Z0-9-]+):\s*([^;]+);')
for match in shadow_pattern.finditer(content):
    var_name = match.group(1)
    shadow_val = match.group(2).strip()
    # Normalize spaces in shadow value
    shadow_val_norm = re.sub(r'\s+', ' ', shadow_val).replace(', ', ',')
    shadow_map[shadow_val_norm] = f"var({var_name})"

print(f"Loaded {len(hex_map)} hex variables and {len(shadow_map)} shadow variables.")

# Add custom mappings for shadows commonly found that map to variables exactly 
# or if they have different spacing. We'll do our best.

def normalize_css_value(val):
    val = re.sub(r'\s+', ' ', val).strip()
    val = val.replace(', ', ',')
    return val

def process_css_content(css_content):
    # Replace hex codes
    # We want to match hex codes not followed by other hex chars
    def hex_replacer(match):
        h = match.group(0).lower()
        if len(h) == 4:
            h = '#' + h[1]*2 + h[2]*2 + h[3]*2
        return hex_map.get(h, match.group(0))

    new_content = re.sub(r'#[0-9a-fA-F]{3,6}\b', hex_replacer, css_content)
    
    # Replace box-shadows
    # We match box-shadow: <val>;
    def shadow_replacer(match):
        prefix = match.group(1)
        val = match.group(2)
        suffix = match.group(3)
        val_norm = normalize_css_value(val)
        for s_val, s_var in shadow_map.items():
            if s_val == val_norm:
                return f"{prefix}{s_var}{suffix}"
        # If no exact match, return original
        return match.group(0)

    new_content = re.sub(r'(box-shadow:\s*)([^;]+)(;)', shadow_replacer, new_content)
    return new_content

changed_files = 0
for root, dirs, files in os.walk(src_dir):
    for f in files:
        if f.endswith('.css'):
            path = os.path.join(root, f)
            if os.path.normpath(path) == os.path.normpath(variables_path):
                continue
            
            with open(path, "r", encoding="utf-8") as file:
                original = file.read()
            
            modified = process_css_content(original)
            
            if original != modified:
                with open(path, "w", encoding="utf-8") as file:
                    file.write(modified)
                changed_files += 1

print(f"Modified {changed_files} CSS files.")
