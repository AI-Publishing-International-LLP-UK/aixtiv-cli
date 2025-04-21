const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { parseOptions, withSpinner, displayResult } = require('../../lib/utils');
const Table = require('cli-table3');

// Get all VLS solutions from directory
const getSolutionAgents = () => {
  const solutionsPath = '/Users/as/asoos/vls/solutions';
  try {
    return fs.readdirSync(solutionsPath)
      .filter(file => file.startsWith('dr-') || file.startsWith('professor-'))
      .filter(file => fs.statSync(path.join(solutionsPath, file)).isDirectory())
      .map(dir => ({
        id: dir.toLowerCase(),
        name: dir.replace(/-/g, ' '),
        path: path.join(solutionsPath, dir)
      }));
  } catch (error) {
    console.error(chalk.red('Error loading solution agents:'), error.message);
    return [];
  }
};

// Simulate getting agent status and workload
const getAgentStatus = (agentId) => {
  // In production, this would fetch from Firestore
  const statuses = ['available', 'busy', 'overloaded', 'offline'];
  const randomStatus = statuses[Math.floor(Math.random() * 3)]; // Mostly online statuses
  const workload = Math.floor(Math.random() * 100);
  
  return {
    status: randomStatus,
    workload: workload,
    activeTasks: Math.floor(workload / 20),
    completedTasks: Math.floor(Math.random() * 100),
    lastActive: new Date(Date.now() - Math.floor(Math.random() * 3600000)).toISOString()
  };
};

/**
 * Check status of solution agents and their workloads
 * @param {object} options - Command options
 */
module.exports = async function agentStatus(options) {
  const { agent } = parseOptions(options);
  
  try {
    // Get all solution agents
    const solutionAgents = getSolutionAgents();
    
    if (solutionAgents.length === 0) {
      console.log(chalk.yellow('No solution agents found.'));
      return;
    }
    
    // If specific agent requested
    if (agent) {
      const selectedAgent = solutionAgents.find(s => s.id === agent || s.id === `dr-${agent}` || s.id.includes(agent));
      
      if (!selectedAgent) {
        console.error(chalk.red('Error:'), `Agent "${agent}" not found.`);
        return;
      }
      
      const status = await withSpinner(
        `Checking status of ${chalk.cyan(selectedAgent.name)}`,
        async () => {
          await new Promise(resolve => setTimeout(resolve, 1200)); // Simulated API call
          return getAgentStatus(selectedAgent.id);
        }
      );
      
      console.log(chalk.bold(`\nStatus for ${chalk.cyan(selectedAgent.name)}:`));
      console.log(`Status: ${getStatusColor(status.status, status.status)}`);
      console.log(`Workload: ${getWorkloadColor(status.workload)}%`);
      console.log(`Active Tasks: ${status.activeTasks}`);
      console.log(`Completed Tasks: ${status.completedTasks}`);
      console.log(`Last Active: ${status.lastActive}`);
      
    } else {
      // Show all agents
      const table = new Table({
        head: ['Agent', 'Status', 'Workload', 'Active Tasks', 'Last Active'],
        colWidths: [20, 15, 12, 15, 25]
      });
      
      const statusResults = await withSpinner(
        'Checking status of all solution agents',
        async () => {
          await new Promise(resolve => setTimeout(resolve, 1800)); // Simulated API call
          return solutionAgents.map(agent => ({
            ...agent,
            ...getAgentStatus(agent.id)
          }));
        }
      );
      
      statusResults.forEach(agent => {
        table.push([
          agent.name,
          getStatusColor(agent.status, agent.status),
          getWorkloadColor(agent.workload) + '%',
          agent.activeTasks.toString(),
          agent.lastActive.split('T')[0] + ' ' + agent.lastActive.split('T')[1].substring(0, 8)
        ]);
      });
      
      console.log(table.toString());
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
  }
};

// Helper function to color status
function getStatusColor(status, text) {
  switch (status) {
    case 'available':
      return chalk.green(text);
    case 'busy':
      return chalk.yellow(text);
    case 'overloaded':
      return chalk.red(text);
    case 'offline':
      return chalk.gray(text);
    default:
      return text;
  }
}

// Helper function to color workload
function getWorkloadColor(workload) {
  if (workload < 30) {
    return chalk.green(workload);
  } else if (workload < 70) {
    return chalk.yellow(workload);
  } else {
    return chalk.red(workload);
  }
}
