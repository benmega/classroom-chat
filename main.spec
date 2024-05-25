block_cipher = None

a = Analysis(['main.py'],
             pathex=['.'],
             binaries=[],
             datas=[
                 ('static/*', 'static'),  # Include all static files
                 ('templates/*', 'templates'),  # Include all template files
                 ('config.env', '.'),  # Include config.env at the root of the executable
             ],
             hiddenimports=[],
             hookspath=[],
             runtime_hooks=[],
             excludes=[],
             win_no_prefer_redirects=False,
             win_private_assemblies=False,
             cipher=block_cipher,
             noarchive=False)
pyz = PYZ(a.pure, a.zipped_data,
             cipher=block_cipher)
exe = EXE(pyz,
          a.scripts,
          [],
          exclude_binaries=True,
          name='ClassroomChat',
          debug=False,
          bootloader_ignore_signals=False,
          strip=False,
          upx=True,
          console=False )  # console=False for GUI, True for terminal
coll = COLLECT(exe,
               a.binaries,
               a.zipfiles,
               a.datas,
               strip=False,
               upx=True,
               name='ClassroomChat')
