import os
import re

files_to_check = [
    "frontend/src/pages/Admin/AdminDashboard.jsx",
    "frontend/src/pages/Admin/Analytics.jsx",
    "frontend/src/pages/Admin/Classes.jsx",
    "frontend/src/pages/Admin/DuckTransactions.jsx",
    "frontend/src/pages/Admin/ToReview.jsx",
    "frontend/src/pages/Admin/Users.jsx",
    "frontend/src/pages/Admin/AdminClassDashboard.jsx",
    "frontend/src/pages/General/StudentParentCode.jsx"
]

for filepath in files_to_check:
    if not os.path.exists(filepath): continue
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove import of RefreshCw
    content = re.sub(r'RefreshCw,\s*', '', content)
    content = re.sub(r',\s*RefreshCw\b', '', content)
    content = re.sub(r'import\s+{\s*RefreshCw\s*}\s+from\s+[\'"]lucide-react[\'"];?\n?', '', content)
    
    # Remove <button> or <div className="refresh-btn"> containing RefreshCw
    # Actually, simpler: replace all <RefreshCw ... /> and the button wrappers
    content = re.sub(r'<button[^>]*>\s*<RefreshCw[^>]*/>\s*</button>', '', content)
    content = re.sub(r'<div[^>]*className=["\'][^"\']*refresh[^"\']*["\'][^>]*>\s*<RefreshCw[^>]*/>\s*</div>', '', content)
    content = re.sub(r'<RefreshCw[^>]*/>', '', content)
    
    # Remove isRefreshing state if it exists
    content = re.sub(r'const\s+\[isRefreshing,\s*setIsRefreshing\]\s*=\s*useState\(false\);?\n?', '', content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Cleaned {filepath}")
