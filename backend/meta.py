

import os


def create_directory(path):
    if not os.path.exists(path):
        os.makedirs(path)
        print(f"Directory created: {path}")
    else:
        print(f"Directory already exists: {path}")


def create_file(path):
    with open(path, "w"):
        pass
    print(f"File created: {path}")


def print_directory_structure(startpath, exclude=None):
    if exclude is None:
        exclude = []
    for root, dirs, files in os.walk(startpath):
        dirs[:] = [d for d in dirs if d not in exclude]
        level = root.replace(startpath, "").count(os.sep)
        indent = " " * 4 * level
        print(f"{indent}{os.path.basename(root)}/")
        subindent = " " * 4 * (level + 1)
        for f in files:
            print(f"{subindent}{f}")


def main():
    project_directory = os.getcwd()

    print_directory_structure(
        project_directory, ["venv", ".git", ".idea", "node_modules", "target"]
    )


if __name__ == "__main__":
    main()

