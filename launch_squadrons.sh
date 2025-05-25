#!/bin/bash

echo "Launching all agents in Squadron 02..."
aixtiv agent:activate -a dr-burby-02
aixtiv agent:activate -a dr-claude-02
aixtiv agent:activate -a dr-cypriot-02
aixtiv agent:activate -a dr-lucy-02
aixtiv agent:activate -a dr-maria-02
aixtiv agent:activate -a professor-lee-02
aixtiv agent:activate -a dr-grant-02
aixtiv agent:activate -a dr-match-02
aixtiv agent:activate -a dr-memoria-02
aixtiv agent:activate -a dr-roark-02
aixtiv agent:activate -a dr-sabina-02

echo "Launching all agents in Squadron 03..."
aixtiv agent:activate -a dr-burby-03
aixtiv agent:activate -a dr-claude-03
aixtiv agent:activate -a dr-cypriot-03
aixtiv agent:activate -a dr-lucy-03
aixtiv agent:activate -a dr-maria-03
aixtiv agent:activate -a professor-lee-03
aixtiv agent:activate -a dr-grant-03
aixtiv agent:activate -a dr-match-03
aixtiv agent:activate -a dr-memoria-03
aixtiv agent:activate -a dr-roark-03
aixtiv agent:activate -a dr-sabina-03

echo "All Squadron 02 and 03 agents have been launched."
echo "Checking agent status..."
aixtiv claude:status
