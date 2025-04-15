# -*- mode: python ; coding: utf-8 -*-

import os
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

block_cipher = None

# Collect all Flask-related imports
flask_imports = collect_submodules('flask')
sqlalchemy_imports = collect_submodules('sqlalchemy')
jinja2_imports = collect_submodules('jinja2')
socketio_imports = collect_submodules('flask_socketio') if os.path.exists('application/sockets') else []

# Define recursive datas collection function for directories
def collect_directory_datas(source_dir):
    result = []
    for root, dirs, files in os.walk(source_dir):
        for file in files:
            source_path = os.path.join(root, file)
            # The destination preserves the subdirectory structure
            dest_dir = os.path.join(os.path.basename(source_dir), os.path.relpath(root, source_dir))
            result.append((source_path, dest_dir))
    return result

# Collect all necessary data files
static_files = collect_directory_datas('static')
template_files = collect_directory_datas('templates')
application_files = collect_directory_datas('application')
license_files = collect_directory_datas('license') if os.path.exists('license') else []

# Add instance directory if it exists (for SQLite DB)
instance_files = []
if os.path.exists('instance'):
    instance_files = collect_directory_datas('instance')

# Combine all data files
all_datas = static_files + template_files + application_files + license_files + instance_files

# Add the wrapper script to the data files
with open('wrapper.py', 'w') as f:
    f.write('''
import sys
import traceback
from main import main as run_app


def main():
    try:
        # Import and run your actual application
        return run_app()
    except Exception as e:
        print("ERROR: An exception occurred:")
        print(traceback.format_exc())
        input("Press Enter to exit...")
        return 1
    return 0

if __name__ == "__main__":
    sys.exit(main())
''')

a = Analysis(
    ['wrapper.py'],
    pathex=[os.path.dirname(os.path.abspath('main.py'))],
    binaries=[],
    datas=all_datas,
    hiddenimports=[
        'flask',
        'flask_sqlalchemy',
        'sqlalchemy',
        'jinja2',
        'werkzeug',
        'engineio.async_drivers.threading',
        'flask_login',
        'flask_migrate',
        'flask_wtf',
        'email_validator',
        'flask_mail',
        'itsdangerous',
        'click',
        'appdirs',  # Add this to fix the appdirs issue
    ] + flask_imports + sqlalchemy_imports + jinja2_imports + socketio_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='room_chat',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    icon='static/images/logo.ico',
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='room_chat',
)