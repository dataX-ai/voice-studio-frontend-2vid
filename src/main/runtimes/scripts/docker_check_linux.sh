#!/bin/bash

# Refresh environment variables and PATH
if [ -f "/etc/environment" ]; then
    source /etc/environment
fi

# Source profile files to get updated PATH
if [ -f "/etc/profile" ]; then
    source /etc/profile
fi

# Source user's profile and bashrc
if [ -f "$HOME/.profile" ]; then
    source "$HOME/.profile"
fi

if [ -f "$HOME/.bashrc" ]; then
    source "$HOME/.bashrc"
fi

# Debug: Try to find docker
DOCKER_PATH=$(command -v docker)

# Check if docker command is available
if [ -z "$DOCKER_PATH" ]; then
    echo "NOT INSTALLED"
    exit 0
fi

# Check Docker daemon status
if ! docker info &> /dev/null; then
    # Try to start Docker daemon (without pkexec)
    if systemctl start docker &> /dev/null; then
        sleep 2
        if docker info &> /dev/null; then
            echo "RUNNING"
            exit 0
        else
            echo "NOT RUNNING"
            exit 0
        fi
    else
        echo "NOT RUNNING"
        exit 0
    fi
else
    echo "RUNNING"
    exit 0
fi
