import os
import re

admin_dir = r'c:\Users\Ben\AntiGravity\classroom-chat\frontend\src\pages\Admin'

replacements = {
    # Grays and Slates
    r'#64748b': 'var(--text-muted)',
    r'#475569': 'var(--text-muted)',
    r'#334155': 'var(--text-secondary)',
    r'#1e293b': 'var(--text-primary)',
    r'#0f172a': 'var(--text-primary)',
    r'#94a3b8': 'var(--border-rich)',
    r'#cbd5e1': 'var(--border-subtle)',
    r'#e2e8f0': 'var(--border-subtle)',
    r'#f1f5f9': 'var(--bg-secondary)',
    r'#f8fafc': 'var(--bg-tertiary)',
    r'#6b7280': 'var(--text-muted)', # gray-500 -> text-muted
    
    # Blues
    r'#60a5fa': 'var(--primary-accessible)', # blue-400 fails on white -> primary-accessible
    r'#3b82f6': 'var(--blue-600)', # blue-500 -> blue-600 (better contrast)
    r'#2563eb': 'var(--blue-600)',
    r'#1d4ed8': 'var(--blue-600)',
    r'#1e40af': 'var(--primary-accessible)', # blue-800
    
    # Reds
    r'#ef4444': 'var(--error-color)',
    r'#dc2626': 'var(--error-color)',
    r'#b91c1c': 'var(--error-color)',
    r'#fca5a5': 'var(--error-light)',
    r'#fecaca': 'var(--error-light)',
    r'#fee2e2': 'var(--error-subtle)',
    r'#fef2f2': 'var(--error-subtle)',
    
    # Greens
    r'#10b981': 'var(--success-color)',
    r'#22c55e': 'var(--success-color)',
    r'#059669': 'var(--success-dark)',
    r'#047857': 'var(--success-dark)',
    
    # Yellows/Ambers
    r'#fbbf24': 'var(--accent-color)',
    r'#fcd34d': 'var(--accent-color)',
    r'#d97706': 'var(--warning-color)',
    r'#b45309': 'var(--warning-color)',
    r'#92400e': 'var(--warning-color)',
    r'#854d0e': 'var(--warning-color)',
}

def process_files(directory):
    count = 0
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.css'):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                original_content = content
                for hex_color, var_name in replacements.items():
                    # Replace both lowercase and uppercase hex
                    pattern = re.compile(hex_color, re.IGNORECASE)
                    content = pattern.sub(var_name, content)
                
                if content != original_content:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(content)
                    count += 1
                    print(f"Updated {file}")
    print(f"Total files updated: {count}")

process_files(admin_dir)
