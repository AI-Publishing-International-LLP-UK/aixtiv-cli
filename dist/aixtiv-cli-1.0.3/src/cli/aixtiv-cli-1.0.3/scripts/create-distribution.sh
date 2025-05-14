#!/bin/bash

# Create Aixtiv CLI Distribution Package
# --------------------------------------
# This script creates a distributable package of the Aixtiv CLI

set -e # Exit on any error

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=======================================================${NC}"
echo -e "${BLUE}      Creating Aixtiv CLI Distribution Package         ${NC}"
echo -e "${BLUE}=======================================================${NC}"

# Base directory
BASE_DIR=$(pwd)
DIST_DIR="$BASE_DIR/dist"
VERSION=$(node -e "console.log(require('./package.json').version)")
DIST_NAME="aixtiv-cli-$VERSION"
DIST_PATH="$DIST_DIR/$DIST_NAME"

# Create distribution directory
echo -e "\n${YELLOW}Creating distribution directory...${NC}"
rm -rf "$DIST_PATH"
mkdir -p "$DIST_PATH"

# Copy essential files
echo -e "\n${YELLOW}Copying essential files...${NC}"
cp -r bin "$DIST_PATH/"
cp -r lib "$DIST_PATH/"
cp -r commands "$DIST_PATH/"
cp -r telemetry "$DIST_PATH/"
cp -r scripts/telemetry "$DIST_PATH/scripts/"
mkdir -p "$DIST_PATH/logs/telemetry"

# Copy configuration files
echo -e "\n${YELLOW}Copying configuration files...${NC}"
cp package.json "$DIST_PATH/"
cp README.md "$DIST_PATH/"
cp .env "$DIST_PATH/" 2>/dev/null || echo -e "${YELLOW}No .env file found, skipping...${NC}"

# Create .npmignore file
echo -e "\n${YELLOW}Creating .npmignore file...${NC}"
cat > "$DIST_PATH/.npmignore" << 'END'
# Backup files
*.bak

# Test files
*.test.js

# Log files
logs/*
!logs/telemetry/.gitkeep

# Development files
.git
.github
.vscode
END

# Create a clean package.json without development dependencies
echo -e "\n${YELLOW}Creating clean package.json...${NC}"
node -e "
const pkg = require('./package.json');
delete pkg.devDependencies;
pkg.scripts = {
  start: pkg.scripts.start,
  telemetry: pkg.scripts.telemetry,
  'telemetry:test': pkg.scripts['telemetry:test'],
  'telemetry:enable': pkg.scripts['telemetry:enable'],
  'telemetry:disable': pkg.scripts['telemetry:disable'],
  'telemetry:status': pkg.scripts['telemetry:status']
};
require('fs').writeFileSync('$DIST_PATH/package.json', JSON.stringify(pkg, null, 2));
"

# Create the tarball
echo -e "\n${YELLOW}Creating distribution tarball...${NC}"
cd "$DIST_DIR"
tar -czf "$DIST_NAME.tar.gz" "$DIST_NAME"

# Create zip file for Windows users
echo -e "\n${YELLOW}Creating zip file for Windows users...${NC}"
zip -r "$DIST_NAME.zip" "$DIST_NAME" >/dev/null

# Display results
echo -e "\n${GREEN}Distribution package created successfully!${NC}"
echo -e "${GREEN}Tarball: $DIST_DIR/$DIST_NAME.tar.gz${NC}"
echo -e "${GREEN}Zip: $DIST_DIR/$DIST_NAME.zip${NC}"

echo -e "\n${BLUE}=======================================================${NC}"
echo -e "${BLUE}      Distribution Package Creation Complete           ${NC}"
echo -e "${BLUE}=======================================================${NC}"

echo -e "\n${YELLOW}To install globally:${NC}"
echo -e "${GREEN}npm install -g $DIST_DIR/$DIST_NAME.tar.gz${NC}"

echo -e "\n${YELLOW}To publish to npm:${NC}"
echo -e "${GREEN}cd $DIST_PATH && npm publish${NC}"
