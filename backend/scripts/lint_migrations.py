import argparse
import ast
import os
import sys


def lint_migration(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        source = f.read()

    if "# lint: skip" in source:
        return []

    try:
        tree = ast.parse(source)
    except SyntaxError as e:
        return [f"SyntaxError: {e}"]

    issues = []
    lines = source.splitlines()

    upgrade_node = None
    for node in tree.body:
        if isinstance(node, ast.FunctionDef) and node.name == "upgrade":
            upgrade_node = node
            break

    if not upgrade_node:
        return []

    start_line = upgrade_node.lineno - 1
    end_line = (
        upgrade_node.end_lineno if hasattr(upgrade_node, "end_lineno") else len(lines)
    )

    for i in range(start_line, end_line):
        line = lines[i]
        stripped = line.strip()

        if "# noqa" in line:
            continue

        if any(
            op in stripped
            for op in [
                "drop_column(",
                "add_column(",
                "create_index(",
                "drop_index(",
                "create_unique_constraint(",
                "drop_constraint(",
                "create_foreign_key(",
                "drop_foreign_key(",
            ]
        ) and "batch_op." in stripped:
            context_lines = lines[max(start_line, i - 10) : i]
            has_if = False
            for ctx_line in reversed(context_lines):
                if ctx_line.strip().startswith("if "):
                    has_if = True
                    break
            if not has_if:
                issues.append(
                    f"Line {i + 1}: possibly unguarded operation: {stripped[:80]}"
                )

    return issues


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--migrations-dir", default="migrations/versions")
    args = parser.parse_args()

    migrations_dir = args.migrations_dir
    if not os.path.exists(migrations_dir):
        if os.path.exists("migrations/versions"):
            migrations_dir = "migrations/versions"
        elif os.path.exists("backend/migrations/versions"):
            migrations_dir = "backend/migrations/versions"
        else:
            print(f"Error: {args.migrations_dir} does not exist.")
            sys.exit(1)

    errors = False
    for filename in sorted(os.listdir(migrations_dir)):
        if filename.endswith(".py"):
            filepath = os.path.join(migrations_dir, filename)
            issues = lint_migration(filepath)
            if issues:
                print(f"FAIL: {filename}")
                for issue in issues:
                    print(f"  {issue}")
                errors = True

    if errors:
        sys.exit(1)
    else:
        print("All migrations pass idempotency checks.")
        sys.exit(0)


if __name__ == "__main__":
    main()
