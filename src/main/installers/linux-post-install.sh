#!/bin/bash

echo "Starting post-installation setup..."

# Create docker group if it doesn't exist
if ! getent group docker > /dev/null; then
    echo "Creating docker group..."
    sudo groupadd docker
fi

# Detect installation directory
INSTALL_PATHS=(
    "/opt/VoiceStudio"
    "/opt/Voice Studio"
)

INSTALL_DIR=""
for path in "${INSTALL_PATHS[@]}"; do
    if [ -d "$path" ]; then
        INSTALL_DIR="$path"
        echo "Found installation directory: $INSTALL_DIR"
        break
    fi
done

if [ -z "$INSTALL_DIR" ]; then
    echo "Error: Could not find installation directory"
    exit 1
fi

# Copy docker rules with sudo permissions
if [ -f "$INSTALL_DIR/resources/50-docker.rules" ]; then
    echo "Installing polkit rules..."
    sudo cp "$INSTALL_DIR/resources/50-docker.rules" /etc/polkit-1/rules.d/
    sudo chmod 644 /etc/polkit-1/rules.d/50-docker.rules
    echo "Polkit rules installed successfully"
else
    echo "Warning: Could not find polkit rules file at $INSTALL_DIR/resources/50-docker.rules"
fi

# Prompt user to add themselves to docker group
current_user=$(logname || echo $SUDO_USER)
if [ ! -z "$current_user" ]; then
    echo "Adding user $current_user to docker group..."
    sudo usermod -aG docker "$current_user"
    echo "Please log out and log back in for the changes to take effect."
fi

# Set correct permissions for chrome sandbox - check both possible locations
SANDBOX_PATHS=(
    "$INSTALL_DIR/chrome-sandbox"
    "$INSTALL_DIR/chrome_sandbox"
)

for sandbox_path in "${SANDBOX_PATHS[@]}"; do
    if [ -f "$sandbox_path" ]; then
        echo "Setting permissions for $sandbox_path"
        sudo chown root:root "$sandbox_path"
        sudo chmod 4755 "$sandbox_path"
        echo "Chrome sandbox permissions set successfully"
    fi
done

echo "Post-installation setup completed" 