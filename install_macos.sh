#!/bin/bash
set -euo pipefail

# Enhanced Discord Rich Presence - macOS Installer

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

INSTALL_DIR="$HOME/Library/Application Support/Enhanced Discord RPC"
NATIVE_HOSTS_DIR="$HOME/Library/Application Support/Mozilla/NativeMessagingHosts"
MANIFEST_NAME="com.enhanced.rpc.bridge"
BRIDGE_SOURCE_DIR="$SCRIPT_DIR/App/dist/bridge"
MANIFEST_SOURCE="$SCRIPT_DIR/App/app_manifest.json"

if [ ! -d "$BRIDGE_SOURCE_DIR" ] || [ ! -f "$BRIDGE_SOURCE_DIR/bridge" ]; then
    echo "ERROR: Bridge build not found at: $BRIDGE_SOURCE_DIR"
    echo "Build it first:"
    echo "  cd App && python3 -m PyInstaller bridge.spec"
    exit 1
fi

echo "Installing Enhanced Discord RPC..."

# Copy entire bridge folder
rm -rf "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR"
cp -R "$BRIDGE_SOURCE_DIR/"* "$INSTALL_DIR/"
chmod +x "$INSTALL_DIR/bridge"
xattr -cr "$INSTALL_DIR" 2>/dev/null || true
codesign --force --deep --sign - "$INSTALL_DIR/bridge" 2>/dev/null || true

# Copy version.txt alongside the binary
if [ -f "$SCRIPT_DIR/App/version.txt" ]; then
    cp "$SCRIPT_DIR/App/version.txt" "$INSTALL_DIR/version.txt"
fi

# Create native messaging host manifest with correct path
mkdir -p "$NATIVE_HOSTS_DIR"
BRIDGE_PATH="$INSTALL_DIR/bridge"

python3 -c "
import json
with open('$MANIFEST_SOURCE', 'r') as f:
    manifest = json.load(f)
manifest['path'] = '$BRIDGE_PATH'
with open('$NATIVE_HOSTS_DIR/$MANIFEST_NAME.json', 'w') as f:
    json.dump(manifest, f, indent=2)
"

echo ""
echo "Installation complete!"
echo "  Bridge: $INSTALL_DIR/bridge"
echo "  Manifest: $NATIVE_HOSTS_DIR/$MANIFEST_NAME.json"
echo ""
echo "Next steps:"
echo "  1. Install the Firefox extension"
echo "  2. Make sure Discord is running"
echo "  3. Open YouTube or YouTube Music in Firefox"
