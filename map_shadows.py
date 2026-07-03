import os
import re

src_dir = r"c:\Users\Ben\AntiGravity\classroom-chat\frontend\src"

def map_shadow(val):
    # Try to determine the closest shadow based on standard values
    if '0 2px 4px' in val or '0 1px 2px' in val or '0 2px 6px' in val:
        return 'var(--shadow-sm)'
    if '0 4px 6px' in val or '0 4px 12px' in val or '0 8px 15px' in val or '0 -4px 6px' in val:
        return 'var(--shadow-md)'
    if '0 10px 15px' in val or '0 10px 20px' in val or '0 12px 30px' in val:
        return 'var(--shadow-lg)'
    if '0 20px 25px' in val or '0 20px 40px' in val or '0 20px 60px' in val:
        return 'var(--shadow-xl)'
    if '10px 0 30px' in val or '20px 0 50px' in val:
        return 'var(--shadow-rich)'
    if '0 0 20px rgba(0,0,0' in val or '0 10px 25px rgba(0, 0, 0' in val:
        return 'var(--shadow-soft)'
    
    # default fallback if it's a basic rgba(0,0,0,x) box-shadow
    if 'rgba(0' in val.replace(' ', ''):
        return 'var(--shadow-md)' # safe middle
    return None

def process_css_content(css_content):
    def shadow_replacer(match):
        prefix = match.group(1)
        val = match.group(2)
        suffix = match.group(3)
        if 'var(' in val:
            return match.group(0)
            
        new_val = map_shadow(val)
        if new_val:
            return f"{prefix}{new_val}{suffix}"
        return match.group(0)

    new_content = re.sub(r'(box-shadow:\s*)([^;]+)(;)', shadow_replacer, css_content)
    return new_content

changed_files = 0
for root, dirs, files in os.walk(src_dir):
    for f in files:
        if f.endswith('.css'):
            path = os.path.join(root, f)
            with open(path, "r", encoding="utf-8") as file:
                original = file.read()
            
            modified = process_css_content(original)
            
            if original != modified:
                with open(path, "w", encoding="utf-8") as file:
                    file.write(modified)
                changed_files += 1

print(f"Modified {changed_files} CSS files with shadow mapping.")
