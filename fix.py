import sys

files = [
    'backend/tests/app/models/test_user.py',
    'frontend/src/components/admin/AdminModals.jsx',
    'frontend/src/pages/Admin/AdminClassDashboard.css',
    'frontend/src/pages/Admin/AdminClassDashboard.jsx',
    'frontend/src/pages/Admin/AdminClassDashboard.test.jsx',
    'frontend/src/pages/Admin/Classes.jsx'
]

for path in files:
    try:
        with open(path) as f:
            lines = f.readlines()
        out = []
        skip = False

        for line in lines:
            if line.startswith('<<<<<<< Updated upstream'):
                continue
            elif line.startswith('======='):
                skip = True
            elif line.startswith('>>>>>>> Stashed changes'):
                skip = False
            elif not skip:
                out.append(line)

        with open(path, 'w') as f:
            f.writelines(out)
        print(f"Fixed {path}")
    except Exception as e:
        print(f"Failed {path}: {e}")
