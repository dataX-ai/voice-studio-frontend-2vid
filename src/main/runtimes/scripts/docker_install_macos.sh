#!/bin/bash

# Function to check if Docker is installed
CURRENT_SHELL=$(basename "$SHELL")

is_docker_installed() {
    if command -v docker &> /dev/null && docker --version &> /dev/null; then
        return 0  # Docker is installed and in PATH
    else
        # Check if Docker.app exists but not in PATH
        if [ -d "/Applications/Docker.app" ]; then
            return 2  # Docker is installed but not in PATH
        fi
        return 1  # Docker is not installed
    fi
}

# Function to add Docker to PATH
add_docker_to_path() {
    echo "Adding Docker to PATH..."
    DOCKER_PATH="/Applications/Docker.app/Contents/Resources/bin"
    USER_SHELL=$(basename "$SHELL")

    if [[ "$USER_SHELL" == "zsh" ]]; then
        PROFILE_FILE="$HOME/.zshrc"
    elif [[ "$USER_SHELL" == "bash" ]]; then
        PROFILE_FILE="$HOME/.bash_profile"
        if [[ ! -f "$PROFILE_FILE" ]]; then
            PROFILE_FILE="$HOME/.bashrc"
        fi
    else
        PROFILE_FILE="$HOME/.profile"
    fi

    # Check if Docker path is already in PATH
    if ! grep -q "$DOCKER_PATH" "$PROFILE_FILE" 2>/dev/null; then
        echo "export PATH=\"\$PATH:$DOCKER_PATH\"" >> "$PROFILE_FILE"
        echo "Docker path added to $PROFILE_FILE"
        echo "Please run 'source $PROFILE_FILE' to update your current session or restart your terminal"
    else
        echo "Docker path already exists in $PROFILE_FILE"
    fi
}

# Function to install Docker
install_docker() {
    echo "Checking Mac architecture..."
    # Determine Mac architecture
    if [[ $(uname -m) == "arm64" ]]; then
        ARCH="arm64"
        DMG_URL="https://desktop.docker.com/mac/main/arm64/Docker.dmg"
        echo "Detected Apple Silicon Mac (ARM64)"
    else
        ARCH="amd64"
        DMG_URL="https://desktop.docker.com/mac/main/amd64/Docker.dmg"
        echo "Detected Intel Mac (AMD64)"
    fi

    # Check if Docker.dmg already exists
    if [ -f "/tmp/Docker.dmg" ]; then
        echo "Docker.dmg already exists, skipping download..."
    else
        # Download Docker DMG
        echo "Downloading Docker Desktop for $ARCH..."
        curl -L -o /tmp/Docker.dmg $DMG_URL
    fi

    # Mount the DMG with sudo
    echo "Mounting Docker.dmg..."
    sudo hdiutil attach /tmp/Docker.dmg -nobrowse

    CURRENT_USER=$(whoami)
    
    # Run the installer with sudo
    echo "Running Docker installer..."
    sudo /Volumes/Docker/Docker.app/Contents/MacOS/install --accept-license --user=$CURRENT_USER

    # Unmount the DMG with sudo
    echo "Cleaning up..."
    sudo hdiutil detach /Volumes/Docker
    rm /tmp/Docker.dmg
}

# Function to start Docker daemon
start_docker() {
    echo "Refreshing env..."
    if [ "$CURRENT_SHELL" = "zsh" ]; then
        # Source zsh profiles without executing zsh-specific code
        source "$HOME/.zshrc"
    else
        # Source bash profiles
    source "$HOME/.bashrc"
    fi
    echo "Starting Docker daemon..."
    open -a Docker
    
    # Wait for Docker to start
    echo "Waiting for Docker to start..."
    for i in {1..30}; do
        if docker info &> /dev/null; then
            echo "Docker daemon is running"
            return 0
        fi
        
        if (( i % 5 == 0 )); then
            echo "Retrying Docker startup..."
            open -a Docker
        fi
        echo "Waiting... ($i/30)"
        sleep 2
    done
    
    echo "Warning: Docker daemon did not start within the expected time"
    return 1
}

# Main script execution
echo "Checking Docker installation status..."
is_docker_installed
DOCKER_STATUS=$?

if [ $DOCKER_STATUS -eq 0 ]; then
    echo "Docker is already installed and in PATH"
    DOCKER_VERSION=$(docker --version | cut -d ' ' -f 3 | tr -d ',')
    echo "Docker version: $DOCKER_VERSION"
    
    # Check if Docker daemon is running
    if docker info &> /dev/null; then
        echo "Docker daemon is already running"
    else
        echo "Docker daemon is not running"
        start_docker
    fi
    
elif [ $DOCKER_STATUS -eq 2 ]; then
    echo "Docker is installed but not in PATH"
    add_docker_to_path
    
    # Source the profile to update PATH in current session
    USER_SHELL=$(basename "$SHELL")
    if [[ "$USER_SHELL" == "zsh" ]]; then
        source "$HOME/.zshrc" 2>/dev/null || true
    elif [[ "$USER_SHELL" == "bash" ]]; then
        source "$HOME/.bash_profile" 2>/dev/null || source "$HOME/.bashrc" 2>/dev/null || true
    else
        source "$HOME/.profile" 2>/dev/null || true
    fi
    
    # Check if Docker daemon is running
    if command -v docker &> /dev/null && docker info &> /dev/null; then
        echo "Docker daemon is already running"
    else
        echo "Docker daemon is not running"
        start_docker
    fi
    
else
    echo "Docker is not installed. Installing Docker..."
    install_docker
    
    echo "Docker installation complete. Adding to PATH..."
    add_docker_to_path
    
    # Source the profile to update PATH in current session
    USER_SHELL=$(basename "$SHELL")
    if [[ "$USER_SHELL" == "zsh" ]]; then
        source "$HOME/.zshrc" 2>/dev/null || true
    elif [[ "$USER_SHELL" == "bash" ]]; then
        source "$HOME/.bash_profile" 2>/dev/null || source "$HOME/.bashrc" 2>/dev/null || true
    else
        source "$HOME/.profile" 2>/dev/null || true
    fi
    
    echo "Starting Docker for the first time..."
    start_docker
fi

# Final verification
echo "Performing final verification..."
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version 2>/dev/null | cut -d ' ' -f 3 | tr -d ',')
    
    if [ -n "$DOCKER_VERSION" ] && [ "$DOCKER_VERSION" != "" ]; then
        echo "Docker Desktop installed successfully!"
        
        if docker info &> /dev/null; then
            echo "Docker is running and accessible"
            echo "{\"success\": true, \"version\": \"$DOCKER_VERSION\", \"isRunning\": true}"
        else
            echo "Docker is installed but not running"
            echo "{\"success\": true, \"version\": \"$DOCKER_VERSION\", \"isRunning\": false}"
        fi
    else
        echo "{\"success\": false, \"error\": \"Invalid Docker installation\"}"
        exit 1
    fi
else
    echo "{\"success\": false, \"error\": \"Docker not found in PATH after installation\"}"
    exit 1
fi

echo "Note: You may need to restart your terminal or computer for all changes to take effect"