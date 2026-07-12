import os
import re

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    def replace_tag(match):
        tag = match.group(0)
        classes = []
        
        def extract_class_template(m):
            classes.append(m.group(1))
            return ""
        
        def extract_class_double(m):
            classes.append(m.group(1))
            return ""
            
        tag = re.sub(r'className=\{`([^`]+)`\}', extract_class_template, tag)
        tag = re.sub(r'className="([^"]+)"', extract_class_double, tag)
        
        if len(classes) <= 1:
            return match.group(0) # Only fix if there are 2 or more! (If 1, it's fine as it was)
        
        needs_template = any('${' in c for c in classes)
        combined = " ".join(classes).strip()
        
        if tag.endswith('/>'):
            if needs_template:
                return tag[:-2].rstrip() + f' className={{`{combined}`}} />'
            else:
                return tag[:-2].rstrip() + f' className="{combined}" />'
        else:
            if needs_template:
                return tag[:-1].rstrip() + f' className={{`{combined}`}}>'
            else:
                return tag[:-1].rstrip() + f' className="{combined}">'

    new_content = re.sub(r'<[a-zA-Z0-9_]+[^>]*>', replace_tag, content)
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Fixed {filepath}")

for root, _, files in os.walk('frontend/src'):
    for file in files:
        if file.endswith('.jsx'):
            fix_file(os.path.join(root, file))

print("Done.")
