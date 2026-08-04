import os
import re


def process_file(filepath, replacements):
    if not os.path.exists(filepath):
        return
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    for old, new in replacements:
        content = re.sub(old, new, content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

process_file('frontend/src/pages/Admin/AdminClassDashboard.jsx', [
    (r'\bhandleRegenerateJoinCode,\s*', ''),
    (r'\bhandleRegenerateJoinCode\b', '')
])

process_file('frontend/src/pages/Admin/AdminDashboard.jsx', [
    (r'\bisRefreshing,\s*', ''),
    (r'\bfetchDashboardData,\s*', ''),
    (r',\s*isRefreshing\b', ''),
    (r',\s*fetchDashboardData\b', '')
])

process_file('frontend/src/pages/Admin/Analytics.jsx', [
    (r'const\s+\[isRefreshing,\s*setIsRefreshing\]\s*=\s*useState\(false\);\s*', ''),
    (r'setIsRefreshing\(true\);\s*', ''),
    (r'setIsRefreshing\(false\);\s*', '')
])

process_file('frontend/src/pages/Admin/Classes.jsx', [
    (r'const\s+\[isRefreshing,\s*setIsRefreshing\]\s*=\s*useState\(false\);\s*', ''),
    (r'setIsRefreshing\(true\);\s*', ''),
    (r'setIsRefreshing\(false\);\s*', '')
])

process_file('frontend/src/pages/Admin/ToReview.jsx', [
    (r'const\s+\[isRefreshing,\s*setIsRefreshing\]\s*=\s*useState\(false\);\s*', ''),
    (r'setIsRefreshing\(true\);\s*', ''),
    (r'setIsRefreshing\(false\);\s*', '')
])

