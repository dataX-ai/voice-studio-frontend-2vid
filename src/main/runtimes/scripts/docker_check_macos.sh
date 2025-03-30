#!/bin/bash

# Refresh environment variables
# macOS typically uses /etc/profile and /etc/zprofile
if [ -f "/etc/profile" ]; then
    source /etc/profile
fi

CURRENT_SHELL=$(basename "$SHELL")

if [ "$CURRENT_SHELL" = "zsh" ]; then
    # Source zsh profiles without executing zsh-specific code
    source "$HOME/.zshrc"
else
    # Source bash profiles
   source "$HOME/.bashrc"
fi

# Debug: Try to find docker
DOCKER_PATH=$(command -v docker)
echo "DOCKER_PATH $DOCKER_PATH"
# Check if docker command is available
if [ -z "$DOCKER_PATH" ]; then
    echo "NOT INSTALLED"
    exit 0
fi

if ! docker info &> /dev/null; then
    # On macOS, we can't use systemctl. Docker.app needs to be started manually
    echo "NOT RUNNING"
else
    echo "RUNNING"
fi
