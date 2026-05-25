#!/usr/bin/env bash
set -euo pipefail

: "${HOME:?\$HOME environment variable is not set}"

BIN_DIR="$HOME/.local/bin"
BINARY_NAME="com.enhanced.rpc.bridge"
MANIFEST_FILE="com.enhanced.rpc.bridge.json"

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
    # Snap Firefox
    "$HOME/snap/firefox/common/.mozilla/native-messaging-hosts"
)


install() {
    echo "==========================================="
    echo " Installing Enhanced RPC Bridge Native App "
    echo "==========================================="

    echo "Note: Discord cannot be installed via Snap, Flatpak, or any other system that installs Discord in a sandbox."
    echo "You must use a native package manager, .deb, or .tar.gz installation, else it probably won't work."

    mkdir -p "$BIN_DIR"

    PAYLOAD_LINE=$(awk '/^__PAYLOAD_BELOW__/ {print NR + 1; exit 0;}' "$0")
    if [ -n "$PAYLOAD_LINE" ]; then
        tail -n +"$PAYLOAD_LINE" "$0" > "$BIN_DIR/$BINARY_NAME"
        chmod +x "$BIN_DIR/$BINARY_NAME"
    else
        echo "Error: Extraction marker missing." >&2
        exit 1
    fi

# Chromium-based browsers
    for PATH_DIR in "${CHROMIUM_PATHS[@]}"; do
        mkdir -p "$PATH_DIR"
        cat <<EOF | sed "s|%placeholder%|$BIN_DIR/$BINARY_NAME|g" > "$PATH_DIR/$MANIFEST_FILE"
__CHROME_MANIFEST_TEMPLATE__
EOF
    done

# Gecko-based browsers
for PATH_DIR in "${GECKO_PATHS[@]}"; do
        mkdir -p "$PATH_DIR"
        cat <<EOF | sed "s|%placeholder%|$BIN_DIR/$BINARY_NAME|g" > "$PATH_DIR/$MANIFEST_FILE"
__FIREFOX_MANIFEST_TEMPLATE__
EOF
    done

    echo "Installation successfully completed in user space!"
    echo "Location: $BIN_DIR/$BINARY_NAME"
}

uninstall() {
    echo "==========================================="
    echo " Uninstalling Enhanced RPC Bridge Native App "
    echo "==========================================="

    if [ -f "$BIN_DIR/$BINARY_NAME" ]; then
        rm "$BIN_DIR/$BINARY_NAME"
        echo "Removed: $BIN_DIR/$BINARY_NAME"
    else
        echo "Not found. Skipping."
    fi

    for PATH_DIR in "${CHROMIUM_PATHS[@]}" "${GECKO_PATHS[@]}"; do
        if [ -f "$PATH_DIR/$MANIFEST_FILE" ]; then
            rm "$PATH_DIR/$MANIFEST_FILE"
            echo "Removed manifest from: $PATH_DIR"
        fi
    done

    echo "Uninstallation successfully completed!"
}

ACTION="${1:-install}"

case "$ACTION" in
    install)
        install
        exit 0
        ;;
    uninstall)
        uninstall
        exit 0
        ;;
    *)
        echo "Usage: $0 {install|uninstall}"
        exit 1
        ;;
esac

exit 0

__PAYLOAD_BELOW__