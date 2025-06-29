#!/usr/bin/env node
/**
 * Swarm Command for Aixtiv CLI
 * Testament Swarm Operations and Agent Orchestration
 */

const { spawn } = require('child_process');
const path = require('path');

function executeSwarmCommand(command, args = []) {
    const swarmPath = '/Users/as/asoos/integration-gateway/testament_deployment';
    const scriptPath = path.join(swarmPath, 'deploy_testament_swarm.sh');
    
    console.log('🌪️ Executing Testament Swarm Command...');
    
    const child = spawn('bash', [scriptPath, ...args], {
        cwd: swarmPath,
        stdio: 'inherit'
    });
    
    child.on('close', (code) => {
        if (code === 0) {
            console.log('✅ Swarm command completed successfully');
        } else {
            console.log(`❌ Swarm command failed with code ${code}`);
        }
    });
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0] || 'deploy';

switch (command) {
    case 'deploy':
    case 'activate':
    case 'orchestrate':
        executeSwarmCommand(command, args.slice(1));
        break;
    case 'help':
    default:
        console.log(`
🌪️ Aixtiv Swarm CLI Commands:

Usage: aixtiv swarm [command] [options]

Commands:
  deploy      Deploy Testament Swarm (default)
  activate    Activate Testament Swarm 1
  orchestrate Run swarm orchestration
  help        Show this help message

Examples:
  aixtiv swarm deploy
  aixtiv swarm activate
  aixtiv swarm orchestrate
        `);
        break;
}
