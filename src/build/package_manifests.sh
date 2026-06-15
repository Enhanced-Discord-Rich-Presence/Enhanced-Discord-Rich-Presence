#!/bin/bash

SCRIPT_DIR="$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")"
cd "$SCRIPT_DIR" || exit 1
cd ../Extension || exit 1

while true; do
    clear
    echo "========================================="
    echo " Select a browser manifest to generate:"
    echo "========================================="
    echo " [chrome]  - Copy manifest.chrome.json"
    echo " [firefox] - Copy manifest.firefox.json"
    echo " [exit]    - Close script"
    echo "========================================="
    echo "" 

    read -p "Enter browser (chrome/firefox/exit): " choice
    choice="${choice// /}"  # Remove whitespace
    choice="${choice,,}"  # Convert to lowercase

    if [[ "$choice" == "exit" ]]; then
        echo "Exiting script."
        exit 0
    fi
    
    
    case "$choice" in
        chrome) target="manifest.chrome.json" ;;
        firefox) target="manifest.firefox.json" ;;
        *) echo "Invalid choice. Please enter 'chrome', 'firefox', or 'exit'." ; continue ;;
    esac


    if [[ -z "$target" ]]; then
        echo ""
        echo "[ERROR] Invalid selection: \"$choice\". Please type chrome, firefox, or edge."
        echo ""
        read -p "Press Enter to continue..."
        continue
    fi


    if [[ -f "$target" ]]; then
        cp -f "$target" "manifest.json"
        echo ""
        echo "[SUCCESS] Successfully copied \"$target\" to \"manifest.json\""
        echo ""
    else
        echo ""
        echo "[ERROR] Could not find the source file: $target"
        echo ""
    fi


    read -p "Press Enter to continue..."
done