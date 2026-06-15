#!/usr/bin/env bash
set -euo pipefail

# Setup
SCRIPT_DIR="$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")"
EXTENSION_DIR="$(cd "$SCRIPT_DIR/../Extension" && pwd)"

# Color Configuration
if [[ -t 1 ]] && tput setaf 1 &>/dev/null; then
    CO_RESET="$(tput sgr0)"
    CO_BLUE="$(tput setaf 4)"
    CO_GREEN="$(tput setaf 2)"
    CO_RED="$(tput setaf 1)"
    CO_YELLOW="$(tput setaf 3)"
else
    CO_RESET=""
    CO_BLUE=""
    CO_GREEN=""
    CO_RED=""
    CO_YELLOW=""
fi

# Logging helpers
log_info()  { echo -e "${CO_BLUE}[INFO]${CO_RESET} $*"; }
log_success(){ echo -e "${CO_GREEN}[SUCCESS]${CO_RESET} $*"; }
log_error()  { echo -e "${CO_RED}[ERROR]${CO_RESET} $*" >&2; }

# Manifest Generation function
generate_manifest() {
    local source_name="$1"
    local target="$EXTENSION_DIR/$source_name"

    echo -e "${CO_BLUE}-----------------------------------------${CO_RESET}"
    log_info "Generating manifest from: $source_name"
    echo -e "${CO_BLUE}-----------------------------------------${CO_RESET}"

    if [[ ! -f "$target" ]]; then
        log_error "Could not find the source file: $target"
        return 1
    fi

    cp -f "$target" "$EXTENSION_DIR/manifest.json"
    log_success "Successfully copied \"$source_name\" to \"manifest.json\""
    echo
}

clear
cat << EOF
${CO_RED}> ${CO_BLUE}package_manifests.sh${CO_RESET}

This script's purpose is to quickly switch out active manifests for local development.
When you select a browser target, it will:
1. Copy the corresponding manifest (${CO_YELLOW}manifest.chrome.json${CO_RESET} or ${CO_YELLOW}manifest.firefox.json${CO_RESET})
2. Replace the active ${CO_GREEN}manifest.json${CO_RESET} file inside the ${CO_BLUE}Extension${CO_RESET} directory.

EOF

# UI loop
while true; do
    cat << EOF
=========================================
 Select a browser manifest to generate:
=========================================
 [${CO_BLUE}chrome${CO_RESET}]  Copy manifest.chrome.json
 [${CO_YELLOW}firefox${CO_RESET}] Copy manifest.firefox.json
 [${CO_RED}exit${CO_RESET}]    Close script
=========================================
EOF

    read -rp "Enter browser (chrome/firefox/exit): " choice
    cat << EOF 

EOF
    choice="${choice//[[:space:]]/}"
    choice="${choice,,}"

    case "$choice" in
        exit)
            log_info "Exiting script."
            exit 0
            ;;

        chrome)
            generate_manifest "manifest.chrome.json"
            ;;

        firefox)
            generate_manifest "manifest.firefox.json"
            ;;

        "")
            continue
            ;;

        *)
            log_error "Invalid choice: \"$choice\". Please enter 'chrome', 'firefox', or 'exit'."
            ;;
    esac

    read -rp "Press Enter to continue..."
done