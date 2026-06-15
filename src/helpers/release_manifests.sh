#!/usr/bin/env bash
set -euo pipefail

# Setup
SCRIPT_DIR="$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
EXTENSION_DIR="$PROJECT_ROOT/src/Extension"
RELEASE_DIR="$PROJECT_ROOT/Releases"
declare -a excluded_files=("*manifest.chrome.json" "*manifest.firefox.json" "*manifest.edge_OLD.json")

mkdir -p "$RELEASE_DIR"

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

# Build function
build_release() {
    local manifest_file="$1"
    local zip_name="$2"
    local output_path="$RELEASE_DIR/$zip_name"

    if [[ ! -f "$manifest_file" ]]; then
        log_error "Missing manifest: $manifest_file"
        return 1
    fi

    echo -e "${CO_BLUE}-----------------------------------------${CO_RESET}"
    log_info "Building: $zip_name"
    echo -e "${CO_BLUE}-----------------------------------------${CO_RESET}"

    if [[ -f "$output_path" ]]; then
        log_info "Removing existing archive: $output_path"
        rm -f "$output_path"
        
        if [[ -f "$output_path" ]]; then
            log_error "Could not remove existing archive: $output_path"
            return 1
        else 
            log_success "Removed existing archive: $output_path"
        fi
    fi

    cp -f "$manifest_file" "$EXTENSION_DIR/manifest.json"
    log_success "Injected manifest"

    pushd "$EXTENSION_DIR" > /dev/null

    zip -qr "$output_path" . -x "${excluded_files[@]}"

    popd > /dev/null

    log_success "Created archive: $output_path with excluded files: ${excluded_files[*]}"

    rm -f "$EXTENSION_DIR/manifest.json"
    log_info "Cleaned temporary manifest"
    echo
}

# Dependency check
check_dependencies() {
    if ! command -v zip &> /dev/null; then
        log_error "zip command not found. Please install zip to use this script."
        exit 1
    fi
}

check_dependencies
clear
cat << EOF
${CO_RED}> ${CO_BLUE}release_manifests.sh${CO_RESET}

This script's purpose is to create release ${CO_YELLOW}ZIP${CO_RESET} files for Chrome and Firefox extensions.
When you select a build target, it will:
1. Copy the corresponding manifest (${CO_YELLOW}manifest.chrome.json${CO_RESET} or ${CO_YELLOW}manifest.firefox.json${CO_RESET}) to ${CO_YELLOW}manifest.json${CO_RESET}
2. Create a ${CO_YELLOW}ZIP${CO_RESET} archive of the ${CO_BLUE}Extension${CO_RESET} directory, excluding the source manifest files
3. Save the ${CO_YELLOW}ZIP${CO_RESET} file to the ${CO_GREEN}Releases${CO_RESET} directory.

EOF

# UI loop
while true; do
    cat << EOF
=========================================
 Select a browser build target
=========================================
 [${CO_GREEN}all${CO_RESET}]     Build Chrome + Firefox
 [${CO_YELLOW}firefox${CO_RESET}] Build Firefox only
 [${CO_BLUE}chrome${CO_RESET}]  Build Chrome only
 [${CO_RED}exit${CO_RESET}]    Quit
=========================================
EOF

    read -rp "Selection: " choice
    cat << EOF 

EOF
    choice="${choice//[[:space:]]/}"
    choice="${choice,,}"

    case "$choice" in
        exit)
            log_info "Exiting"
            exit 0
            ;;

        chrome)
            build_release "$EXTENSION_DIR/manifest.chrome.json" "chrome.zip"
            ;;

        firefox)
            build_release "$EXTENSION_DIR/manifest.firefox.json" "firefox.zip"
            ;;

        all)
            build_release "$EXTENSION_DIR/manifest.chrome.json" "chrome.zip"
            build_release "$EXTENSION_DIR/manifest.firefox.json" "firefox.zip"
            log_success "All builds completed"
            ;;

        "")
            continue
            ;;

        *)
            log_error "Invalid selection: $choice"
            ;;
    esac

    read -rp "Press Enter to continue..."
done