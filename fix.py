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
        lines = open(path).readlines()
        out = []
        skip = False

        for l in lines:
            if l.startswith('<<<<<<< Updated upstream'):
                continue
            elif l.startswith('======='):
                skip = True
            elif l.startswith('>>>>>>> Stashed changes'):
                skip = False
            elif not skip:
                out.append(l)

        open(path, 'w').writelines(out)
        print(f"Fixed {path}")
    except Exception as e:
        print(f"Failed {path}: {e}")
