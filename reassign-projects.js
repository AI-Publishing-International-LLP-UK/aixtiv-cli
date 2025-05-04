#!/usr/bin/env node

const { firestore } = require('./lib/firestore');
const { logAgentAction } = require('./lib/agent-tracking');
const chalk = require('chalk');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Calculate date from two days ago
const twoDaysAgo = new Date();
twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
const twoDaysAgoISO = twoDaysAgo.toISOString();

console.log(chalk.cyan('🔍 Finding projects created on or after:'), chalk.yellow(twoDaysAgoISO.split('T')[0]));

async function findProjects() {
  try {
    if (!firestore) {
      console.error(chalk.red('Error: Firestore is not initialized'));
      process.exit(1);
    }

    console.log(chalk.cyan('⌛ Querying Firestore for projects...'));
    
    // Query projects created two days ago or newer
    const snapshot = await firestore.collection('projects')
      .where('created_at', '>=', twoDaysAgoISO)
      .orderBy('created_at', 'desc')
      .get();
    
    if (snapshot.empty) {
      console.log(chalk.yellow('No projects found from the last two days.'));
      process.exit(0);
    }
    
    const projects = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      projects.push({
        project_id: doc.id,
        name: data.name,
        description: data.description,
        assigned_to: data.assigned_to || 'Unassigned',
        created_at: data.created_at,
        priority: data.priority
      });
    });
    
    console.log(chalk.green(`✅ Found ${projects.length} projects from the last two days:`));
    console.log('');
    
    // Display projects in a table-like format
    projects.forEach((project, index) => {
      console.log(chalk.cyan(`Project ${index + 1}:`));
      console.log(`ID: ${chalk.yellow(project.project_id)}`);
      console.log(`Name: ${chalk.green(project.name)}`);
      console.log(`Description: ${project.description}`);
      console.log(`Currently Assigned To: ${chalk.magenta(project.assigned_to)}`);
      console.log(`Created: ${new Date(project.created_at).toLocaleString()}`);
      console.log(`Priority: ${getPriorityColor(project.priority)}`);
      console.log('');
    });
    
    return projects;
  } catch (error) {
    console.error(chalk.red('Error querying projects:'), error);
    process.exit(1);
  }
}

function getPriorityColor(priority) {
  switch (priority?.toLowerCase()) {
    case 'high':
      return chalk.red('High');
    case 'medium':
      return chalk.yellow('Medium');
    case 'low':
      return chalk.blue('Low');
    default:
      return chalk.grey(priority || 'Unknown');
  }
}

async function reassignProjects(projects, newAssignee) {
  try {
    console.log(chalk.cyan(`⌛ Reassigning ${projects.length} projects to ${chalk.yellow(newAssignee)}...`));
    
    const batch = firestore.batch();
    const timestamp = new Date().toISOString();
    
    projects.forEach(project => {
      const projectRef = firestore.collection('projects').doc(project.project_id);
      batch.update(projectRef, {
        assigned_to: newAssignee,
        updated_at: timestamp
      });
    });
    
    await batch.commit();
    
    // Log the action for each project
    for (const project of projects) {
      await logAgentAction('project_reassignment', {
        project_id: project.project_id,
        project_name: project.name,
        previous_assignee: project.assigned_to,
        new_assignee: newAssignee
      });
    }
    
    console.log(chalk.green(`✅ Successfully reassigned ${projects.length} projects to ${chalk.yellow(newAssignee)}`));
    
  } catch (error) {
    console.error(chalk.red('Error reassigning projects:'), error);
    process.exit(1);
  }
}

async function main() {
  try {
    const projects = await findProjects();
    
    if (projects.length === 0) {
      rl.close();
      return;
    }
    
    rl.question(chalk.cyan('Enter the new assignee ID to reassign all projects: '), async (newAssignee) => {
      if (!newAssignee.trim()) {
        console.log(chalk.yellow('Reassignment cancelled. No assignee provided.'));
        rl.close();
        return;
      }
      
      rl.question(chalk.yellow(`Are you sure you want to reassign all ${projects.length} projects to ${chalk.cyan(newAssignee)}? (y/N): `), async (answer) => {
        if (answer.toLowerCase() === 'y') {
          await reassignProjects(projects, newAssignee);
        } else {
          console.log(chalk.yellow('Reassignment cancelled.'));
        }
        rl.close();
      });
    });
  } catch (error) {
    console.error(chalk.red('Error:'), error);
    rl.close();
    process.exit(1);
  }
}

// Handle readline close
rl.on('close', () => {
  console.log(chalk.cyan('Operation complete.'));
  process.exit(0);
});

// Start the program
main();
