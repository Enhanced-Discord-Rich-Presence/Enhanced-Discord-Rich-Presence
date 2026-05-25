#!/usr/bin/env bash
set -euo pipefail

echo "============================================="
echo " Installing Enhanced RPC Bridge Native Host  "
echo "============================================="

: "${HOME:?\$HOME environment variable is not set}"

BIN_DIR="$HOME/.local/bin"
BINARY_NAME="com.enhanced.rpc.bridge"

mkdir -p "$BIN_DIR"

PAYLOAD_LINE=$(awk '/^__PAYLOAD_BELOW__/ {print NR + 1; exit 0;}' "$0")
if [ -n "$PAYLOAD_LINE" ]; then
    tail -n +"$PAYLOAD_LINE" "$0" > "$BIN_DIR/$BINARY_NAME"
    chmod +x "$BIN_DIR/$BINARY_NAME"
else
    echo "Error: Extraction marker missing." >&2
    exit 1
fi

CHROMIUM_PATHS=(
    "$HOME/.config/google-chrome/NativeMessagingHosts"
    "$HOME/.config/BraveSoftware/Brave-Browser/NativeMessagingHosts"
    "$HOME/.config/microsoft-edge/NativeMessagingHosts"
    "$HOME/.config/vivaldi/NativeMessagingHosts"
    "$HOME/.config/opera/NativeMessagingHosts"
    "$HOME/.config/chromium/NativeMessagingHosts"
    # Flatpak variations
    "$HOME/.var/app/org.chromium.Chromium/config/Chromium/NativeMessagingHosts"
    "$HOME/.var/app/com.brave.Browser/config/BraveSoftware/Brave-Browser/NativeMessagingHosts"
    "$HOME/.var/app/com.microsoft.Edge/config/microsoft-edge/NativeMessagingHosts"
    "$HOME/.var/app/tv.vivaldi.Vivaldi/config/vivaldi/NativeMessagingHosts"
    # Snap variations
    "$HOME/snap/chromium/current/.config/chromium/NativeMessagingHosts"
    "$HOME/snap/brave/current/.config/BraveSoftware/Brave-Browser/NativeMessagingHosts"
)

GECKO_PATHS=(
    "$HOME/.mozilla/native-messaging-hosts"
    # Flatpak Firefox
    "$HOME/.var/app/org.mozilla.firefox/.mozilla/native-messaging-hosts"
    # Snap Firefox (Ubuntu default)
    "$HOME/snap/firefox/common/.mozilla/native-messaging-hosts"
)

# Process Chromium-based browsers
for PATH_DIR in "${CHROMIUM_PATHS[@]}"; do
    mkdir -p "$PATH_DIR"
    cat <<EOF | sed "s|%placeholder%|$BIN_DIR/$BINARY_NAME|g" > "$PATH_DIR/com.enhanced.rpc.bridge.json"
__CHROME_MANIFEST_TEMPLATE__
EOF
done

# Process Gecko-based browsers
for PATH_DIR in "${GECKO_PATHS[@]}"; do
    mkdir -p "$PATH_DIR"
    cat <<EOF | sed "s|%placeholder%|$BIN_DIR/$BINARY_NAME|g" > "$PATH_DIR/com.enhanced.rpc.bridge.json"
__FIREFOX_MANIFEST_TEMPLATE__
EOF
done

echo "Installation successfully completed in user space!"
echo "Binary location: $BIN_DIR/$BINARY_NAME"
exit 0

__PAYLOAD_BELOW__