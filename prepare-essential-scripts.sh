#!/bin/bash
#
# prepare-essential-scripts.sh
#
# This script identifies and copies the most essential scripts needed for
# runtime operation to the scripts/essential directory. This helps optimize
# Docker image size by including only necessary files.
#
# Used as part of the Docker build optimization process to reduce image size
# while maintaining core functionality.

# Text formatting
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Preparing essential scripts for optimized Docker build...${NC}"

# Create essential scripts directory if it doesn't exist
mkdir -p scripts/essential
mkdir -p scripts/essential/telemetry
mkdir -p scripts/essential/domain

# Security scripts
echo "Copying security scripts..."
cp scripts/verify-keys.js scripts/essential/

# Telemetry scripts
echo "Copying telemetry scripts..."
cp scripts/telemetry/toggle-telemetry.js scripts/essential/telemetry/
cp scripts/telemetry/add-knowledge-tracking.js scripts/essential/telemetry/

# Domain management scripts
echo "Copying domain management scripts..."
cp scripts/verify-domain-ownership.js scripts/essential/
cp scripts/domain/fixup-domains.js scripts/essential/domain/
cp scripts/domain/remove-domains.js scripts/essential/domain/

# Gateway verification
echo "Copying gateway verification scripts..."
cp scripts/generate-agent-report.js scripts/essential/

# Cleanup any previous temporary files
find scripts/essential -name "*.tmp" -delete

# Create a version file to mark when this was prepared
echo "$(date)" > scripts/essential/build-timestamp.txt
echo "Docker-optimized script selection" >> scripts/essential/build-timestamp.txt

echo -e "${GREEN}Essential scripts prepared successfully!${NC}"
echo "Scripts are ready for inclusion in optimized Docker image"

