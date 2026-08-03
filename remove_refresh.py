import os
import re

files_to_edit = [
    'frontend/src/components/Layout/DesktopNavRail.jsx',
    'frontend/src/components/Layout/MobileSidebar.jsx',
    'frontend/src/components/admin/AdminModals.jsx',
    'frontend/src/pages/Admin/AdminClassDashboard.jsx',
    'frontend/src/pages/Admin/AdminDashboard.jsx',
    'frontend/src/pages/Admin/AdvancedPanel.jsx',
    'frontend/src/pages/Admin/Analytics.jsx',
    'frontend/src/pages/Admin/Classes.jsx',
    'frontend/src/pages/Admin/DuckTransactions.jsx',
    'frontend/src/pages/Admin/ToReview.jsx',
    'frontend/src/pages/Admin/Users.jsx',
    'frontend/src/pages/General/StudentParentCode.jsx'
]

def process_file(filepath):
    if not os.path.exists(filepath):
        return
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # Remove RefreshCw from imports
    content = re.sub(r'RefreshCw\s*,\s*', '', content)
    content = re.sub(r',\s*RefreshCw\b', '', content)
    
    # Remove button blocks that contain RefreshCw
    # Use negative lookahead to prevent matching across multiple buttons
    content = re.sub(r'<button(?:(?!<button).)*?<RefreshCw[^>]*/>(?:(?!</button>).)*?</button>', '', content, flags=re.DOTALL)
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

for f in files_to_edit:
    process_file(f)
