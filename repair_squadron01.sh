#!/bin/bash

echo "Repairing Squadron 01 agents and support services..."

# First, check the current status
echo "Checking current agent status..."
aixtiv claude:status

echo "Reactivating Squadron 01 agents with correct configuration..."
aixtiv agent:activate -a dr-burby-01
aixtiv agent:activate -a dr-claude-01
aixtiv agent:activate -a dr-cypriot-01
aixtiv agent:activate -a dr-grant-01
aixtiv agent:activate -a dr-lucy-01
aixtiv agent:activate -a dr-maria-01
aixtiv agent:activate -a dr-match-01
aixtiv agent:activate -a dr-memoria-01
aixtiv agent:activate -a dr-roark-01
aixtiv agent:activate -a dr-sabina-01
aixtiv agent:activate -a professor-lee-01

echo "Activating Ground Crew and Flight Service agents (non-squadron)..."
aixtiv agent:activate -a sir-tower-blockchain
aixtiv agent:activate -a queen-mint-mark-maker

echo "Verifying all agents after repair..."
aixtiv claude:status

echo "Agent repair and activation completed."
