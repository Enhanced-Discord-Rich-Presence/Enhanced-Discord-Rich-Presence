#!/bin/bash
set -euo pipefail

# Enhanced Discord Rich Presence - macOS Uninstaller

INSTALL_DIR="$HOME/Library/Application Support/Enhanced Discord RPC"
MANIFEST_PATH="$HOME/Library/Application Support/Mozilla/NativeMessagingHosts/com.enhanced.rpc.bridge.json"

echo "Uninstalling Enhanced Discord RPC..."

if [ -f "$MANIFEST_PATH" ]; then
    rm "$MANIFEST_PATH"
    echo "  Removed native messaging manifest"
fi

if [ -d "$INSTALL_DIR" ]; then
    rm -rf "$INSTALL_DIR"
    echo "  Removed application directory"
fi

echo "Uninstallation complete."
echo "Note: Remove the Firefox extension separately via Firefox Add-ons settings."
