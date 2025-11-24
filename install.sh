#!/bin/bash

set -e

# Colori per l'output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Installing incback...${NC}"

# Rilevamento OS e Architettura
OS="$(uname -s)"
ARCH="$(uname -m)"
REPO="smelzo/incback"
BRANCH="main"
BASE_URL="https://raw.githubusercontent.com/$REPO/$BRANCH/dist"

BINARY_URL=""

if [ "$OS" = "Linux" ]; then
    if [ "$ARCH" = "x86_64" ]; then
        BINARY_URL="$BASE_URL/linux/x64/incback"
    else
        echo -e "${RED}Error: Architecture $ARCH on Linux is not currently supported (only x86_64).${NC}"
        exit 1
    fi
elif [ "$OS" = "Darwin" ]; then
    if [ "$ARCH" = "arm64" ]; then
        BINARY_URL="$BASE_URL/mac/arm64/incback"
    else
        echo -e "${RED}Error: Architecture $ARCH on macOS is not currently supported (only Apple Silicon/arm64).${NC}"
        exit 1
    fi
else
    echo -e "${RED}Error: OS $OS is not supported.${NC}"
    exit 1
fi

# Destinazione
INSTALL_DIR="/usr/local/bin"
BINARY_NAME="incback"
DEST_PATH="$INSTALL_DIR/$BINARY_NAME"

# Verifica permessi di scrittura
if [ ! -w "$INSTALL_DIR" ]; then
    echo -e "${RED}Error: Cannot write to $INSTALL_DIR. Please run with sudo.${NC}"
    echo "Try: curl -o- https://raw.githubusercontent.com/$REPO/$BRANCH/install.sh | sudo bash"
    exit 1
fi

echo "Downloading binary for $OS ($ARCH)..."
curl -fsSL "$BINARY_URL" -o "$DEST_PATH"

echo "Making executable..."
chmod +x "$DEST_PATH"

echo -e "${GREEN}Success! incback has been installed to $DEST_PATH${NC}"
echo "Run 'incback --help' to get started."
