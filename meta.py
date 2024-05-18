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

def print_directory_structure(startpath):
    for root, dirs, files in os.walk(startpath):

        level = root.replace(startpath, '').count(os.sep)
        indent = ' ' * 4 * level
        print(f"{indent}{os.path.basename(root)}/")
        subindent = ' ' * 4 * (level + 1)
        for f in files:
            print(f"{subindent}{f}")

def main():
    # Replace 'your_project_directory_path' with the path to your project directory
    project_directory = os.getcwd()

    # project_directory = project_directory + "/src"
    print_directory_structure(project_directory)

# Define the base path for the tests directory
base_path = "/"


main()

'''
groupChat2/
│
├── instance/
│   └── users.db
│
├── server/
│   ├── __init__.py
│   ├── models.py
│   ├── routes.py
│   └── templates/
│       └── index.html
│
├── static/
│   ├── logo.ico
│   ├── main.js
│   └── admin.js
│
├── venv/
│
├── config.py
'''