# -*- mode: python ; coding: utf-8 -*-

import os

BASE_DIR = SPECPATH
ICON_PATH = os.path.abspath(os.path.join(BASE_DIR, '..', 'src', 'Extension', 'src', 'icons', 'icon.ico'))

a = Analysis(
    ['bridge.py'],
    pathex=[],
    binaries=[],
    datas=[('version.txt', '.')],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='EnhancedRPC',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=ICON_PATH
)