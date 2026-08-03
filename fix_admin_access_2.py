import os

def process_directory(directory):
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith(('.jsx', '.js', '.tsx', '.ts')):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                original_content = content
                
                # Fix the broken backslashes
                content = content.replace(r"\'", "'")
                
                # Also, fix `!user?.role === 'admin'` to `user?.role !== 'admin'`
                # because `!user?.role === 'admin'` means `(!user?.role) === 'admin'` which is `boolean === string` (always false)
                content = content.replace(r"!user?.role === 'admin'", "user?.role !== 'admin'")
                content = content.replace(r"!u.role === 'admin'", "u.role !== 'admin'")
                content = content.replace(r"!currentUser?.role === 'admin'", "currentUser?.role !== 'admin'")
                content = content.replace(r"!msg.user_role === 'admin'", "msg.user_role !== 'admin'")
                
                if content != original_content:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(content)
                    print(f"Updated {filepath}")

process_directory('frontend/src')
