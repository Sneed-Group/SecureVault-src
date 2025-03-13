#!/bin/bash

# Markdown Vault - Setup Script

echo "Setting up Markdown Vault..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js (v14 or later) and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 14 ]; then
    echo "Error: Node.js version $NODE_VERSION is not supported. Please upgrade to Node.js v14 or later."
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Create necessary directories if they don't exist
mkdir -p images/icons

# Create placeholder icons
echo "Creating placeholder icons..."
for size in 72 96 128 144 152 192 384 512; do
    echo "Creating ${size}x${size} icon placeholder..."
    echo "<!-- Placeholder icon ${size}x${size} -->" > "images/icons/icon-${size}x${size}.png"
done

echo "Creating favicon placeholder..."
echo "<!-- Placeholder favicon -->" > "images/icons/favicon.ico"

echo "Setup complete! Run 'npm start' to start the development server." 