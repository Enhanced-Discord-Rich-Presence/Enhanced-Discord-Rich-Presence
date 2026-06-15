#!/bin/bash

SCRIPT_DIR="$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")"

RELEASE_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)/Releases"

mkdir -p "$RELEASE_DIR"

cd "$SCRIPT_DIR/../Extension" || { echo "[ERROR] Could not find Extension directory at $SCRIPT_DIR/../Extension"; exit 1; }

build_release() {
    local src_manifest=$1
    local zip_name=$2
    local output_path="$RELEASE_DIR/$zip_name"

    if [[ ! -f "$src_manifest" ]]; then
        echo "[ERROR] Could not find the source file: $src_manifest"
        return 1
    fi

    echo "-----------------------------------------"
    echo "Building release for: $src_manifest"
    echo "-----------------------------------------"
    
    cp -f "$src_manifest" "manifest.json"
    echo "[SUCCESS] Copied \"$src_manifest\" to \"manifest.json\""

    rm -f "$output_path"

    echo "Zipping files into $output_path (excluding source manifests)..."
    zip -q -r "$output_path" . -x "manifest.chrome.json" "manifest.firefox.json"
    
    if [[ $? -eq 0 ]]; then
        echo "[SUCCESS] Successfully created $output_path"
    else
        echo "[ERROR] Failed to create zip file."
    fi

    rm -f "manifest.json"
    echo "[CLEANUP] Deleted temporary manifest.json"
    echo ""
}

while true; do
    clear
    echo "========================================="
    echo " Select a browser to zip into a Release:"
    echo "========================================="
    echo " [all]     - Build releases for Chrome and Firefox"
    echo " [chrome]  - Build release for Chrome only"
    echo " [firefox] - Build release for Firefox only"
    echo " [exit]    - Close script"
    echo "========================================="
    echo "" 

    read -p "Enter browser (all/chrome/firefox/exit): " choice
    choice="${choice// /}"  # Remove whitespace
    choice="${choice,,}"  # Convert to lowercase

    if [[ "$choice" == "exit" ]]; then
        echo "Exiting script."
        exit 0
    fi

    case "$choice" in
        chrome)
            build_release "manifest.chrome.json" "chrome.zip"
            ;;
        firefox)
            build_release "manifest.firefox.json" "firefox.zip"
            ;;
        all)
            build_release "manifest.chrome.json" "chrome.zip"
            build_release "manifest.firefox.json" "firefox.zip"
            echo "========================================="
            echo " All releases built successfully!"
            echo "========================================="
            ;;
        *)
            echo ""
            echo "[ERROR] Invalid selection: \"$choice\". Please type 'chrome', 'firefox', 'all', or 'exit'."
            ;;
    esac

    if [[ "$choice" != "exit" ]]; then
        read -p "Press Enter to continue..."
    fi
done