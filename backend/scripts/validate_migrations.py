import os
import ast
import sys
import argparse
from collections import defaultdict

def extract_revisions(filepath):
    revision = None
    down_revision = None
    with open(filepath, 'r', encoding='utf-8') as f:
        source = f.read()
    try:
        tree = ast.parse(source)
    except SyntaxError:
        return None, None
    for node in tree.body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name):
                    if target.id == 'revision':
                        if isinstance(node.value, ast.Constant):
                            revision = node.value.value
                    elif target.id == 'down_revision':
                        if isinstance(node.value, ast.Constant):
                            down_revision = node.value.value
                        elif isinstance(node.value, ast.Tuple):
                            down_revision = tuple(elt.value for elt in node.value.elts if isinstance(elt, ast.Constant))
    return revision, down_revision

def extract_operations(filepath):
    ops = set()
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    current_table = None
    for line in lines:
        if 'with op.batch_alter_table(' in line:
            parts = line.split("'")
            if len(parts) >= 3:
                current_table = parts[1]
        elif 'batch_op.' in line and current_table:
            stripped = line.strip()
            if stripped.startswith('batch_op.add_column(') or stripped.startswith('batch_op.drop_column('):
                parts = stripped.split("'")
                if len(parts) >= 3:
                    col = parts[1]
                    op_type = 'add' if 'add_column' in stripped else 'drop'
                    ops.add((current_table, op_type, col))
    return ops

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--migrations-dir', default='migrations/versions')
    args = parser.parse_args()

    if not os.path.exists(args.migrations_dir):
        print(f"Error: {args.migrations_dir} does not exist.")
        sys.exit(1)

    ops_by_rev = {}
    for filename in os.listdir(args.migrations_dir):
        if filename.endswith('.py'):
            filepath = os.path.join(args.migrations_dir, filename)
            rev, _ = extract_revisions(filepath)
            if rev:
                ops_by_rev[rev] = extract_operations(filepath)

    op_to_revs = defaultdict(list)
    for rev, ops in ops_by_rev.items():
        for op in ops:
            op_to_revs[op].append(rev)

    errors = False
    for op, revs in op_to_revs.items():
        # A simple check: if the exact same operation is in multiple files, warn about it
        if len(revs) > 1:
            print(f"WARNING: Duplicate operation detected: {op} in revisions {revs}")
            errors = True

    # Note: Validate migrations script is less strict right now
    if errors:
        sys.exit(1)
    else:
        print("No duplicate operations detected.")
        sys.exit(0)

if __name__ == '__main__':
    main()
