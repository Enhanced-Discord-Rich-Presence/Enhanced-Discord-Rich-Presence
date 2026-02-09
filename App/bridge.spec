# -*- mode: python ; coding: utf-8 -*-
import platform as _platform

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

_is_mac = _platform.system() == 'Darwin'
_is_arm = _platform.machine() == 'arm64'

if _is_mac:
    # One-folder mode on macOS to avoid Gatekeeper blocking extracted Python.framework
    exe = EXE(
        pyz,
        a.scripts,
        [],
        exclude_binaries=True,
        name='bridge',
        debug=False,
        bootloader_ignore_signals=False,
        strip=True,
        upx=False,
        console=False,
        disable_windowed_traceback=False,
        argv_emulation=False,
        target_arch='arm64' if _is_arm else None,
        codesign_identity=None,
        entitlements_file=None,
    )
    coll = COLLECT(
        exe,
        a.binaries,
        a.datas,
        strip=True,
        upx=False,
        name='bridge',
    )
else:
    # One-file mode on Windows
    exe = EXE(
        pyz,
        a.scripts,
        a.binaries,
        a.datas,
        [],
        name='bridge',
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
    )
