import sys
import re

file_path = r'c:\Users\Ben\AntiGravity\classroom-chat\frontend\src\pages\Admin\AdminUserDashboard.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove standard ops header
content = re.sub(
    r'\{/\* ---------------- STANDARD USER OPERATIONS ---------------- \*/\}\s*<div className="admin-section-header mt-sm mb-xs">\s*<h3[^>]*>\s*Standard Operations\s*</h3>\s*</div>',
    '',
    content,
    flags=re.MULTILINE
)

# Remove account header
content = re.sub(
    r'\{/\* ---------------- ACCOUNT & CONNECTIONS ---------------- \*/\}\s*<div className="admin-section-header mt-lg mb-xs">\s*<h3[^>]*>\s*<Volume2 size=\{20\} /> Account & Connections\s*</h3>\s*</div>',
    '',
    content,
    flags=re.MULTILINE
)

# Remove sensitive actions header
content = re.sub(
    r'\{/\* ---------------- SENSITIVE ADMINISTRATIVE ACTIONS ---------------- \*/\}\s*<div className="admin-section-header mt-lg mb-xs danger-zone-header">\s*<h3[^>]*>\s*<ShieldAlert size=\{20\} /> Sensitive Administrative Actions\s*</h3>\s*</div>',
    '',
    content,
    flags=re.MULTILINE
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Headers removed successfully.")
