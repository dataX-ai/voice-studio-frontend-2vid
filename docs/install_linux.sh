#!/bin/bash

# Voice Studio installation script for Debian and Ubuntu
# Supports Debian Bookworm, Trixie and Ubuntu 20.04, 22.04, 24.04

set -e

# Text formatting
BOLD="\e[1m"
RED="\e[31m"
GREEN="\e[32m"
YELLOW="\e[33m"
RESET="\e[0m"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if running as root (sudo)
check_root() {
    if [ "$EUID" -ne 0 ]; then
        echo -e "${RED}${BOLD}Error:${RESET} This script needs to be run with sudo privileges."
        echo "Please run as: curl -fsSL https://raw.githubusercontent.com/psarathi012/voice-library-frontend/main/scripts/install_linux.sh | sudo bash"
        exit 1
    fi
}

# Check for supported OS
check_os() {
    if [ ! -f /etc/os-release ]; then
        echo -e "${RED}${BOLD}Error:${RESET} Cannot determine OS version."
        exit 1
    fi

    source /etc/os-release

    # Check for Debian
    if [[ "$ID" == "debian" ]]; then
        if [[ "$VERSION_CODENAME" == "bookworm" || "$VERSION_CODENAME" == "trixie" ]]; then
            echo -e "${GREEN}Detected Debian $VERSION_CODENAME. Continuing...${RESET}"
            DISTRO="debian"
            DISTRO_VERSION="$VERSION_CODENAME"
            return 0
        else
            echo -e "${YELLOW}${BOLD}Warning:${RESET} Unsupported Debian version: $VERSION_CODENAME"
            echo "This script supports Debian Bookworm and Trixie only."
            read -p "Do you want to continue anyway? (y/N): " choice
            if [[ ! "$choice" =~ ^[Yy]$ ]]; then
                exit 1
            fi
            DISTRO="debian"
            DISTRO_VERSION="$VERSION_CODENAME"
            return 0
        fi
    fi

    # Check for Ubuntu
    if [[ "$ID" == "ubuntu" ]]; then
        # Extract major version number
        MAJOR_VERSION=$(echo "$VERSION_ID" | cut -d. -f1)
        if [[ "$MAJOR_VERSION" == "20" || "$MAJOR_VERSION" == "22" || "$MAJOR_VERSION" == "24" ]]; then
            echo -e "${GREEN}Detected Ubuntu $VERSION_ID. Continuing...${RESET}"
            DISTRO="ubuntu"
            DISTRO_VERSION="$VERSION_ID"
            return 0
        else
            echo -e "${YELLOW}${BOLD}Warning:${RESET} Unsupported Ubuntu version: $VERSION_ID"
            echo "This script supports Ubuntu 20.04, 22.04, and 24.04 only."
            read -p "Do you want to continue anyway? (y/N): " choice
            if [[ ! "$choice" =~ ^[Yy]$ ]]; then
                exit 1
            fi
            DISTRO="ubuntu"
            DISTRO_VERSION="$VERSION_ID"
            return 0
        fi
    fi

    echo -e "${RED}${BOLD}Error:${RESET} Unsupported distribution: $ID"
    echo "This script only supports Debian (Bookworm, Trixie) and Ubuntu (20.04, 22.04, 24.04)."
    exit 1
}

# Check for required tools
check_requirements() {
    echo "Checking requirements..."
    
    # Check for either curl or wget
    if command_exists curl; then
        DOWNLOAD_CMD="curl -L -o"
    elif command_exists wget; then
        DOWNLOAD_CMD="wget -O"
    else
        echo -e "${RED}${BOLD}Error:${RESET} Neither curl nor wget found."
        echo "Please install either curl or wget and try again."
        exit 1
    fi
    
    # Check for dpkg
    if ! command_exists dpkg; then
        echo -e "${RED}${BOLD}Error:${RESET} dpkg not found."
        echo "This script requires dpkg to install packages."
        exit 1
    fi
}

# Download the latest release from GitHub
download_package() {
    echo "Downloading Voice Studio package..."
    
    # Get the latest release URL dynamically from GitHub API
    echo "Fetching latest release information..."
    LATEST_URL=$(curl -sL "https://api.github.com/repos/psarathi012/voice-library-frontend/releases/latest" | grep "browser_download_url.*deb" | head -n 1 | cut -d '"' -f 4)
    
    if [ -z "$LATEST_URL" ]; then
        echo -e "${RED}${BOLD}Error:${RESET} Could not determine latest release URL."
        echo "Falling back to hardcoded release..."
        LATEST_URL="https://github.com/dataX-ai/voice-library-frontend/releases/download/v1.0.0/voice-studio-app_1.0.0_amd64.deb"
    fi
    
    # Temporary file for the downloaded package
    TMP_FILE="/tmp/voice-studio-app.deb"
    
    echo "Downloading from: $LATEST_URL"
    
    # Download using previously determined command
    if [[ "$DOWNLOAD_CMD" == curl* ]]; then
        curl -L -o "$TMP_FILE" "$LATEST_URL"
    else
        wget -O "$TMP_FILE" "$LATEST_URL"
    fi
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}${BOLD}Error:${RESET} Failed to download package."
        exit 1
    fi
    
    echo -e "${GREEN}Download complete.${RESET}"
    
    # Return the path to the downloaded file
    echo "$TMP_FILE"
}

# Install the package
install_package() {
    local PACKAGE_PATH="$1"
    
    echo "Installing Voice Studio..."
    dpkg -i "$PACKAGE_PATH"
    
    if [ $? -ne 0 ]; then
        echo -e "${YELLOW}${BOLD}Warning:${RESET} Package installation had issues. Attempting to resolve dependencies..."
        apt-get update
        apt-get -f install -y
        
        # Try installing again
        dpkg -i "$PACKAGE_PATH"
        
        if [ $? -ne 0 ]; then
            echo -e "${RED}${BOLD}Error:${RESET} Failed to install package."
            exit 1
        fi
    fi
    
    echo -e "${GREEN}${BOLD}Voice Studio was successfully installed!${RESET}"
}

# Cleanup temporary files
cleanup() {
    echo "Cleaning up..."
    if [ -f "$TMP_FILE" ]; then
        rm -f "$TMP_FILE"
    fi
}

# Main execution
main() {
    echo -e "${BOLD}Voice Studio Installation Script${RESET}"
    echo "This script will install Voice Studio on your system."
    echo
    
    check_root
    check_os
    check_requirements
    
    TMP_FILE=$(download_package)
    install_package "$TMP_FILE"
    cleanup
    
    echo -e "${GREEN}${BOLD}Installation complete!${RESET}"
    echo "You can now start Voice Studio from your application menu."
}

# Run the main function
main 