import ast
import os
import sys


def check_admin_security(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        try:
            tree = ast.parse(f.read())
        except SyntaxError:
            return False

    failed = False
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef):
            is_admin_route = False
            is_secured = False
            for dec in node.decorator_list:
                if isinstance(dec, ast.Call):
                    if isinstance(dec.func, ast.Attribute) and dec.func.attr == "route":
                        if (
                            isinstance(dec.func.value, ast.Name)
                            and dec.func.value.id == "admin_bp"
                        ):
                            is_admin_route = True
                if isinstance(dec, ast.Name):
                    if dec.id in ["admin_only", "login_required", "jwt_required"]:
                        is_secured = True
            if is_admin_route and not is_secured:
                print(
                    f"[FAIL] {file_path}: Function {node.name} is an admin route but missing security decorator"
                )
                failed = True
    return failed


if __name__ == "__main__":
    base_dir = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "application", "routes", "admin")
    )
    has_failures = False
    for root, _, files in os.walk(base_dir):
        for file in files:
            if file.endswith(".py"):
                if check_admin_security(os.path.join(root, file)):
                    has_failures = True
    if has_failures:
        sys.exit(1)
    print("All admin routes secured.")
