import re
filepath = "frontend/src/pages/Admin/DuckTransactions.jsx"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("setIsRefreshing(true);", "")
content = content.replace("setIsRefreshing(false);", "")
content = re.sub(r'disabled={isRefreshing}', '', content)
content = re.sub(r'\{isRefreshing\s*\?\s*["\']Refreshing...["\']\s*:\s*["\']Refresh["\']\}', '"Refresh"', content)
content = content.replace("isRefreshing ? 'Refreshing...' : 'Refresh'", "'Refresh'")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
