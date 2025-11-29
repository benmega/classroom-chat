"""
File: meta.py
Type: py
Summary: Project metadata utilities and helper functions.
"""

import os

def create_directory(path):
    if not os.path.exists(path):
        os.makedirs(path)
        print(f"Directory created: {path}")
    else:
        print(f"Directory already exists: {path}")

def create_file(path):
    with open(path, 'w') as file:
        pass
    print(f"File created: {path}")

import os

def print_directory_structure(startpath, exclude=[]):
    for root, dirs, files in os.walk(startpath):
        # Filtering out excluded directories from the dirs list
        dirs[:] = [d for d in dirs if d not in exclude]
        level = root.replace(startpath, '').count(os.sep)
        indent = ' ' * 4 * level
        print(f"{indent}{os.path.basename(root)}/")
        subindent = ' ' * 4 * (level + 1)
        for f in files:
            print(f"{subindent}{f}")



def main():
    # project_directory = os.getcwd()
    # project_directory = project_directory + "/templates"
    project_directory = "C:\\Users\\Ben\\PycharmProjects\\tauri-roomchat"
    print_directory_structure(project_directory, ['venv', '.git', '.idea', "node_modules", "target"])

if __name__ == "__main__":
    main()

# groupChat2/
# │
# ├── application/           # Flask code (routes, models, views, etc.)
# ├── instance/              # SQLite DB files
# ├── static/                # CSS, JS, images
# ├── templates/             # Jinja2 HTML templates
# ├── license/               # License file for freemium check
# ├── main.py                # Flask entry point
# └── ...
