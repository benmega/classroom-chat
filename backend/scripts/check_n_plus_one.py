import os


def check_n_plus_one(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Basic heuristic: look for .query.all() or .query.filter(...).all()
    # without joinedload or selectinload, followed by a loop that might access relationships.
    # For this preflight check, we just flag `.all()` on models if they lack load options as a warning.

    failed = False
    if (
        ".query" in content
        and ".all()" in content
        and "joinedload" not in content
        and "selectinload" not in content
    ):
        # It's a simplistic check that will just warn for now.
        print(
            f"[WARN] {file_path}: Found .query.all() without joinedload/selectinload. Verify no N+1 query issues."
        )
    return failed


if __name__ == "__main__":
    base_dir = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "application", "routes")
    )
    for root, _, files in os.walk(base_dir):
        for file in files:
            if file.endswith(".py"):
                check_n_plus_one(os.path.join(root, file))
    print("N+1 query heuristic check completed.")
