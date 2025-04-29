const { firestore, admin } = require('../../lib/firestore');
const { displayResult, withSpinner } = require('../../lib/utils');
const chalk = require('chalk');
const { table } = require('table');

/**
 * Initializes the SERPEW (Squadron Extended Repository for Performance Enhancement and Wisdom) system
 * Sets up collections and base documents for the knowledge repository and performance tracking
 */
module.exports = async function initSerpew(options) {
  try {
    // Define the collections to initialize
    const collections = [
      'squadronKnowledge',
      'agentPerformance',
      'sentimentData'
    ];
    
    // Initialize collections
    const result = await withSpinner(
      'Initializing SERPEW data collections',
      async () => {
        const batch = firestore.batch();
        const results = [];
        
        // Create a config document for SERPEW
        const configRef = firestore.collection('config').doc('serpew');
        batch.set(configRef, {
          initialized: true,
          version: '1.0.0',
          collections,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        // Create a placeholder document for each collection
        for (const collection of collections) {
          const docRef = firestore.collection(collection).doc('_config');
          batch.set(docRef, {
            initialized: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
          
          results.push({
            collection,
            status: 'initialized'
          });
        }
        
        // Commit the batch
        await batch.commit();
        
        return {
          success: true,
          message: 'SERPEW collections initialized successfully',
          results
        };
      }
    );
    
    if (result && result.success) {
      // Format a nice table with the initialized collections
      const tableData = [
        ['Collection', 'Status'],
        ...result.results.map(item => [item.collection, chalk.green('✓ Initialized')]),
        ['config/serpew', chalk.green('✓ Configured')]
      ];
      
      // Display success message with table
      console.log(chalk.green('\n✓ Success: SERPEW system initialized successfully\n'));
      console.log(table(tableData));
      
      // Provide next steps guidance
      console.log(chalk.cyan('\nNext Steps:'));
      console.log('1. Add knowledge to a squadron repository:');
      console.log('   aixtiv serpew:repository:add --squadron <squadron_id> --type <repository_type> --content <file_or_content>');
      console.log('\n2. Start tracking agent performance:');
      console.log('   aixtiv serpew:performance:track --agent <agent_id> --squadron <squadron_id> --metrics <metrics_json>');
      console.log('\n3. Generate a performance report:');
      console.log('   aixtiv serpew:performance:report --squadron <squadron_id>');
    } else {
      displayResult(`Error: ${result?.message || 'Failed to initialize SERPEW system'}`, 'error');
    }
  } catch (error) {
    displayResult(`Error: ${error.message}`, 'error');
  }
};
