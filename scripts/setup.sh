#!/bin/bash

# Install Node.js and npm if not present
if ! command -v node &> /dev/null; then
  curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

# Install git if not present
if ! command -v git &> /dev/null; then
  sudo apt-get update
  sudo apt-get install -y git
fi
