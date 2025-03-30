#!/bin/bash

# Function to detect OS
get_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        echo "$ID"
    else
        echo "unknown"
    fi
}

# Function to check if a package is installed
is_package_installed() {
    if command -v dpkg &> /dev/null; then
        dpkg -l "$1" &> /dev/null
    elif command -v rpm &> /dev/null; then
        rpm -q "$1" &> /dev/null
    fi
}

# Function to run commands with pkexec
run_privileged() {
    pkexec "$@"
}

# Get Linux distribution
DISTRO=$(get_distro)
echo "Step 1: Detected Linux distribution: $DISTRO"

# Install prerequisites
install_prerequisites() {
    case $DISTRO in
        "ubuntu"|"debian"|"pop")
            echo "Step 2.1: Updating package lists..."
            run_privileged apt-get update
            
            echo "Step 2.2: Installing required packages (ca-certificates, curl, gnupg, etc.)..."
            DEBIAN_FRONTEND=noninteractive run_privileged apt-get install -y \
                ca-certificates \
                curl \
                gnupg \
                lsb-release \
                software-properties-common
            ;;
        "fedora"|"rhel"|"centos")
            echo "Step 2: Installing required packages for Fedora/RHEL..."
            run_privileged dnf -y install \
                dnf-plugins-core \
                curl \
                gnupg \
                ca-certificates
            ;;
        *)
            echo "Error: Unsupported distribution: $DISTRO"
            exit 1
            ;;
    esac
}

# Install Docker Desktop
install_docker_desktop() {
    case $DISTRO in
        "ubuntu"|"debian"|"pop")
            echo "Step 3.1: Setting up Docker repository..."
            run_privileged apt-get update
            DEBIAN_FRONTEND=noninteractive run_privileged apt-get install -y \
                ca-certificates \
                curl \
                gnupg

            echo "Step 3.2: Adding Docker's official GPG key..."
            run_privileged install -m 0755 -d /etc/apt/keyrings
            curl -fsSL https://download.docker.com/linux/$DISTRO/gpg | run_privileged bash -c 'cat > /etc/apt/keyrings/docker.gpg.tmp && yes | gpg --batch --yes --dearmor -o /etc/apt/keyrings/docker.gpg /etc/apt/keyrings/docker.gpg.tmp && rm /etc/apt/keyrings/docker.gpg.tmp'
            run_privileged chmod a+r /etc/apt/keyrings/docker.gpg

            echo "Step 3.3: Setting up Docker repository..."
            echo \
              "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$DISTRO \
              $(lsb_release -cs) stable" | run_privileged tee /etc/apt/sources.list.d/docker.list > /dev/null

            echo "Step 3.4: Installing Docker Engine..."
            run_privileged apt-get update
            DEBIAN_FRONTEND=noninteractive run_privileged apt-get install -y docker-ce docker-ce-cli containerd.io

            echo "Step 3.5: Downloading Docker Desktop..."
            TEMP_DEB="$(mktemp).deb"
            curl -L "https://desktop.docker.com/linux/main/amd64/docker-desktop-amd64.deb" -o "$TEMP_DEB"

            echo "Step 3.6: Installing Docker Desktop..."
            DEBIAN_FRONTEND=noninteractive run_privileged apt-get install -y "$TEMP_DEB"
            rm "$TEMP_DEB"
            ;;
            
        "fedora"|"rhel"|"centos")
            echo "Step 3.1: Setting up Docker repository for Fedora..."
            run_privileged dnf -y install dnf-plugins-core
            run_privileged dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo

            echo "Step 3.2: Downloading Docker Desktop..."
            TEMP_RPM="$(mktemp).rpm"
            curl -L "https://desktop.docker.com/linux/main/amd64/docker-desktop-x86_64.rpm" -o "$TEMP_RPM"
            
            echo "Step 3.3: Installing Docker Desktop..."
            run_privileged dnf -y install "$TEMP_RPM"
            rm "$TEMP_RPM"
            ;;
    esac

    echo "Step 4: Installing GNOME terminal..."
    case $DISTRO in
        "ubuntu"|"debian"|"pop")
            run_privileged apt-get install -y gnome-terminal
            ;;
        "fedora"|"rhel"|"centos")
            run_privileged dnf install -y gnome-terminal
            ;;
    esac
    
    echo "Step 5: Setting up Docker group and user permissions..."
    # Create docker group if it doesn't exist
    run_privileged groupadd -f docker

    # Add current user to docker group
    run_privileged usermod -aG docker $USER

    # Set proper permissions for Docker socket
    run_privileged chmod 666 /var/run/docker.sock

    echo "Step 5.1: Activating group changes..."
    # Attempt to activate the new group membership
    newgrp docker << EONG
    # Verify docker works without sudo
    echo "Step 5.2: Verifying Docker permissions..."
    if docker info &> /dev/null; then
        echo "Successfully configured Docker to run without sudo"
    else
        echo "Warning: Docker still requires sudo. You may need to log out and log back in."
    fi
EONG

    echo "Step 6: Starting Docker service..."
    run_privileged systemctl enable docker
    run_privileged systemctl start docker
    
    echo "Step 7: Starting Docker Desktop..."
    systemctl --user enable docker-desktop
    systemctl --user start docker-desktop
}

# Function to start Docker and verify it's running
start_and_verify_docker() {
    echo "Step 8: Verifying Docker installation..."
    echo "Step 8.1: Starting Docker services..."
    
    # Start Docker daemon
    run_privileged systemctl enable docker
    run_privileged systemctl start docker
    
    echo "Step 8.2: Waiting for Docker daemon to start..."
    for i in {1..30}; do
        if docker info &> /dev/null; then
            echo "Docker daemon is running"
            break
        fi
        echo "Waiting... ($i/30)"
        sleep 2
    done

    echo "Step 8.3: Starting Docker Desktop..."
    systemctl --user enable docker-desktop
    systemctl --user start docker-desktop
    
    echo "Step 8.4: Waiting for Docker Desktop to start..."
    for i in {1..30}; do
        if pgrep -f "docker desktop" &> /dev/null; then
            echo "Docker Desktop is running"
            break
        fi
        echo "Waiting... ($i/30)"
        sleep 2
    done
}

# Function to check if Docker is installed and running
check_docker_status() {
    echo "Checking Docker installation status..."
    
    # More strict Docker installation check
    if command -v docker &> /dev/null; then
        # Try to get Docker version and validate it's not empty
        DOCKER_VERSION=$(docker --version 2>/dev/null)
        VERSION=$(echo "$DOCKER_VERSION" | cut -d ' ' -f 3 | tr -d ',')
        
        if [ -n "$VERSION" ] && [ "$VERSION" != "" ]; then
            echo "Docker is already installed"
            echo "Docker version: $VERSION"
            
            # Check if Docker daemon is running with strict validation
            DOCKER_INFO=$(run_privileged docker info 2>/dev/null)
            if [ $? -eq 0 ] && [ -n "$DOCKER_INFO" ]; then
                echo "Docker daemon is running"
                
                # Check if docker group exists
                if getent group docker &> /dev/null; then
                    echo "Docker group exists, adding user to group..."
                    run_privileged usermod -aG docker $USER
                    
                    # Try docker without privileges
                    DOCKER_INFO_UNPRIVILEGED=$(docker info 2>/dev/null)
                    if [ $? -eq 0 ] && [ -n "$DOCKER_INFO_UNPRIVILEGED" ]; then
                        echo "Docker is working without sudo"
                        return 0
                    fi
                    echo "Docker requires sudo, attempting to fix permissions..."
                fi
                
                # If we get here, either group doesn't exist or permissions aren't working
                echo "Setting up Docker group and permissions..."
                run_privileged groupadd -f docker
                run_privileged usermod -aG docker $USER
                run_privileged chmod 666 /var/run/docker.sock
                
                # Activate new group membership
                echo "Activating group changes..."
                newgrp docker << EONG
                if docker info &> /dev/null; then
                    echo "Successfully configured Docker to run without sudo"
                else
                    echo "Warning: Docker still requires sudo. You may need to log out and log back in."
                fi
EONG
                return 0
            fi
            
            echo "Docker is installed but daemon is not running"
            echo "Starting Docker daemon..."
            run_privileged systemctl start docker
            sleep 2
            return 0
        fi
    fi
    
    echo "Docker is not installed"
    return 1
}

# Main installation process
echo "Starting Docker Desktop installation process..."

# First check if Docker is already installed and running
if check_docker_status; then
    echo "Docker is already set up properly"
else
    echo "Installing Docker..."
    echo "Step 1: Installing prerequisites..."
    install_prerequisites

    echo "Step 2: Installing Docker Desktop..."
    install_docker_desktop

    echo "Step 3: Starting and verifying Docker services..."
    start_and_verify_docker
fi

# Final verification
echo "Step 9: Performing final verification..."
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version 2>/dev/null)
    VERSION=$(echo "$DOCKER_VERSION" | cut -d ' ' -f 3 | tr -d ',')
    
    if [ -n "$VERSION" ] && [ "$VERSION" != "" ]; then
        echo "Docker Desktop installed successfully!"
        
        # Try without sudo first
        DOCKER_INFO=$(docker info 2>/dev/null)
        if [ $? -eq 0 ] && [ -n "$DOCKER_INFO" ]; then
            echo "Docker is running and accessible without sudo"
            echo "{\"success\": true, \"version\": \"$VERSION\", \"isRunning\": true, \"requiresSudo\": false}"
        else
            # Try with sudo as fallback
            PRIVILEGED_DOCKER_INFO=$(run_privileged docker info 2>/dev/null)
            if [ $? -eq 0 ] && [ -n "$PRIVILEGED_DOCKER_INFO" ]; then
                echo "Docker is running but requires sudo"
                echo "{\"success\": true, \"version\": \"$VERSION\", \"isRunning\": true, \"requiresSudo\": true}"
            else
                echo "{\"success\": true, \"version\": \"$VERSION\", \"isRunning\": false}"
            fi
        fi
    else
        echo "{\"success\": false, \"error\": \"Invalid Docker installation\"}"
        exit 1
    fi
else
    echo "{\"success\": false, \"error\": \"Installation failed\"}"
    exit 1
fi

echo "Note: You may need to log out and log back in for Docker to work without sudo"