const chalk = require('chalk');
const { table } = require('table');
const { parseOptions, withSpinner, createTable } = require('../../../lib/utils');
const { firestore } = require('../../../lib/firestore');
const { debugDisplay } = require('../../../lib/debug-display');

/**
 * List projects from Firestore with optional filtering
 * @param {object} options - Command options
 */
module.exports = async function listProjects(options) {
  // Capture internal reasoning
  const internalThought = `Processing listProjects command with parameters: ${JSON.stringify(options)}`;

  const { status, tags, priority, limit } = parseOptions(options, {
    status: 'active',
    tags: null,
    priority: null,
    limit: 20
  });

  try {
    // Execute projects query with spinner
    const result = await withSpinner(
      `Fetching projects${status ? ` with status '${status}'` : ''}${tags ? ` and tags '${tags}'` : ''}${priority ? ` and priority '${priority}'` : ''}`,
      async () => {
        // Ensure Firestore is available
        if (!firestore) {
          throw new Error('Firestore connection not available. Check your configuration.');
        }

        // Start with the projects collection
        let query = firestore.collection('projects');

        // Apply status filter if provided
        if (status && status !== 'all') {
          query = query.where('status', '==', status);
        }

        // Apply priority filter if provided
        if (priority) {
          query = query.where('priority', '==', priority);
        }

        // Execute the query
        const snapshot = await query.limit(parseInt(limit, 10)).get();

        if (snapshot.empty) {
          return {
            success: true,
            message: 'No projects found with the specified criteria.',
            projects: []
          };
        }

        // Extract projects from the snapshot
        let projects = [];
        snapshot.forEach(doc => {
          projects.push({
            id: doc.id,
            ...doc.data()
          });
        });

        // Apply tags filter if provided (needs to be done client-side since Firestore doesn't support array contains any with multiple values)
        if (tags) {
          const tagList = tags.split(',').map(tag => tag.trim());
          projects = projects.filter(project => {
            if (!project.tags) return false;
            return tagList.some(tag => project.tags.includes(tag));
          });
        }

        // Return the projects
        return {
          success: true,
          message: `Found ${projects.length} projects.`,
          projects
        };
      }
    );

    // Create table data for display
    if (result.success && result.projects.length > 0) {
      // Define table headers
      const headers = [
        'ID', 
        'Project Name', 
        'Status', 
        'Priority', 
        'Deadline', 
        'Assigned To',
        'Tags'
      ];

      // Format project data for table rows
      const rows = result.projects.map(project => [
        chalk.cyan(project.id),
        chalk.white(project.name || 'Unnamed'),
        colorizeStatus(project.status || 'unknown'),
        colorizePriority(project.priority || 'medium'),
        chalk.blue(project.deadline || 'Not set'),
        chalk.yellow(project.assigned_to || 'Unassigned'),
        (project.tags && project.tags.length > 0) 
          ? project.tags.map(tag => chalk.cyan(`#${tag}`)).join(' ') 
          : chalk.gray('No tags')
      ]);

      // Create and display the table
      const projectTable = createTable([headers, ...rows]);
      console.log(`\nProjects (${result.projects.length}):`);
      console.log(projectTable);

      // Show a summary
      console.log('\nSummary:');
      console.log(`Total projects: ${result.projects.length}`);
      
      // Count by status
      const statusCounts = result.projects.reduce((acc, project) => {
        const status = project.status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});
      
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`${colorizeStatus(status)}: ${count}`);
      });
      
    } else {
      console.log(chalk.yellow('\nNo projects found matching your criteria.'));
      console.log(chalk.dim('Try different filters or create new projects using:'));
      console.log(chalk.dim('  aixtiv claude:agent:delegate -p "Project Name" -d "Description"'));
    }

    // Display debug information
    debugDisplay({
      thought: internalThought,
      result: result,
      command: 'claude:project:list'
    });
  } catch (error) {
    console.error(chalk.red('\nError fetching projects:'), error.message);
    
    if (error.message.includes('permission-denied') || error.message.includes('unauthorized')) {
      console.error(chalk.yellow('\nTroubleshooting tips:'));
      console.error('1. Ensure you have proper permissions to access the projects collection');
      console.error('2. Check that your Firebase authentication credentials are valid');
      console.error('3. Make sure the projects collection exists in your Firestore database');
    }
    
    // Display debug information
    debugDisplay({
      thought: internalThought,
      result: { error: error.message },
      command: 'claude:project:list'
    });
    
    process.exit(1);
  }
};

/**
 * Returns colored text based on status
 * @param {string} status - Status value
 * @returns {string} Colored status text
 */
function colorizeStatus(status) {
  switch (status.toLowerCase()) {
    case 'active':
      return chalk.green('Active');
    case 'completed':
      return chalk.blue('Completed');
    case 'on-hold':
      return chalk.yellow('On Hold');
    case 'cancelled':
      return chalk.red('Cancelled');
    case 'in-progress':
      return chalk.cyan('In Progress');
    case 'pending':
      return chalk.magenta('Pending');
    default:
      return chalk.gray(status);
  }
}

/**
 * Returns colored text based on priority
 * @param {string} priority - Priority level
 * @returns {string} Colored priority text
 */
function colorizePriority(priority) {
  switch (priority.toLowerCase()) {
    case 'high':
      return chalk.red('High');
    case 'medium':
      return chalk.yellow('Medium');
    case 'low':
      return chalk.green('Low');
    default:
      return chalk.white(priority);
  }
}

