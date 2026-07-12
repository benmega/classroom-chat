import os
import re

# 1. Replace legacy CSS variables in all files
def fix_variables(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    replacements = {
        '--border-color': '--border-subtle',
        '--bg-card': '--bg-primary',
        '--text-color': '--text-primary',
        '--text-main': '--text-primary',
        '--surface-secondary': '--bg-secondary'
    }
    
    new_content = content
    for old_var, new_var in replacements.items():
        new_content = new_content.replace(old_var, new_var)
        
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated variables in {filepath}")

for root, _, files in os.walk('frontend/src'):
    for file in files:
        if file.endswith('.jsx') or file.endswith('.css'):
            fix_variables(os.path.join(root, file))

# 2. Fix index.css duplicates
index_css_path = 'frontend/src/index.css'
with open(index_css_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

seen_classes = set()
new_lines = []

for line in lines:
    # Check for simple one-line class definitions like `.classname { ... }`
    match = re.match(r'^(\.[a-zA-Z0-9_-]+)\s*\{', line)
    if match:
        class_name = match.group(1)
        
        # Handle conflicts manually
        if class_name == '.text-sm':
            if class_name not in seen_classes:
                new_lines.append('.text-sm { font-size: var(--font-sm); }\n')
                seen_classes.add(class_name)
            continue
            
        if class_name == '.flex-1':
            if class_name not in seen_classes:
                new_lines.append('.flex-1 { flex: 1 1 0%; min-width: 0; }\n') # Safe flex-1
                seen_classes.add(class_name)
            continue
            
        if class_name == '.w-100':
            class_name = '.w-full' # treat .w-100 as .w-full for dedup
            if class_name not in seen_classes:
                new_lines.append('.w-full { width: 100%; }\n')
                seen_classes.add(class_name)
            continue
            
        # For general classes, if we've seen it, skip it
        if class_name in seen_classes:
            print(f"Removed duplicate class {class_name}")
            continue
        else:
            seen_classes.add(class_name)
            new_lines.append(line)
    else:
        new_lines.append(line)

with open(index_css_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Fixed index.css duplicates")
