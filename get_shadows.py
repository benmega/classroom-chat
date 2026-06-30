import os
import re

src_dir = r"c:\Users\Ben\AntiGravity\classroom-chat\frontend\src"
variables_path = r"c:\Users\Ben\AntiGravity\classroom-chat\frontend\src\assets\css\variables.css"

shadows = set()
for root, dirs, files in os.walk(src_dir):
    for f in files:
        if f.endswith('.css'):
            path = os.path.join(root, f)
            if os.path.normpath(path) == os.path.normpath(variables_path):
                continue
            with open(path, "r", encoding="utf-8") as file:
                for line in file:
                    if 'box-shadow' in line and 'rgba' in line:
                        shadows.add(line.strip())

for s in sorted(shadows):
    print(s)
