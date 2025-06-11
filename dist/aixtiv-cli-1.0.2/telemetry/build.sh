#!/bin/bash

# Build script for the telemetry agent

# Ensure bin directory exists
mkdir -p bin

# Build the telemetry agent
echo "Building telemetry agent..."
go build -o bin/telemetry-agent cmd/main.go

if [ $? -eq 0 ]; then
    echo "Build successful! Binary created at bin/telemetry-agent"
    exit 0
else
    echo "Build failed!"
    exit 1
fi
