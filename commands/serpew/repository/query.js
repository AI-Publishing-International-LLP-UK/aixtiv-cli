const { firestore } = require('../../../lib/firestore');
const { displayResult, withSpinner, parseOptions } = require('../../../lib/utils');
const { logAgentAction } = require('../../../lib/agent-tracking');
const chalk = require('chalk');
const { table } = require('table');

/**
 * Queries knowledge from squadron repositories
 * Supports filtering by squadron, repository, tags, and content search
 */
module.exports = async function queryRepository(options) {
  const { 
    squadron, 
    repository, 
    id,
    search,
    tags,
    limit = 10
  } = parseOptions(options);
  
  try {
    // If ID is provided, fetch the specific knowledge entry
    if (id) {
      const result = await withSpinner(
        `Fetching knowledge entry ${id}`,
        async () => {
          const docRef = firestore.collection('squadronKnowledge').doc(id);
          const doc = await docRef.get();
          
          if (!doc.exists) {
            return {
              success: false,
              message: `Knowledge entry with ID ${id} not found`
            };
          }
          
          const data = doc.data();
          
          // Log the query action
          await logAgentAction('serpew_repository_query', {
            type: 'id_query',
            knowledge_id: id,
            found: true
          });
          
          return {
            success: true,
            message: 'Knowledge entry found',
            entry: {
              id: doc.id,
              ...data,
              created_at: data.created_at?.toDate() || null,
              updated_at: data.updated_at?.toDate() || null
            }
          };
        }
      );
      
      if (result && result.success) {
        const entry = result.entry;
        
        console.log(chalk.green('\n✓ Success: Knowledge entry found\n'));
        console.log(`ID: ${chalk.cyan(entry.id)}`);
        console.log(`Title: ${chalk.cyan(entry.title)}`);
        console.log(`Squadron: ${chalk.cyan(entry.squadron_id)}`);
        console.log(`Repository: ${chalk.cyan(entry.repository_id)}`);
        console.log(`Created: ${chalk.cyan(entry.created_at?.toLocaleString() || 'Unknown')}`);
        console.log(`Tags: ${chalk.cyan(entry.tags?.join(', ') || 'None')}`);
        console.log(`Format: ${chalk.cyan(entry.format || 'text')}`);
        console.log('\nContent:');
        console.log(chalk.yellow('-'.repeat(80)));
        console.log(entry.content);
        console.log(chalk.yellow('-'.repeat(80)));
        
        return;
      } else {
        displayResult(`Error: ${result?.message || 'Failed to find knowledge entry'}`, 'error');
        return;
      }
    }
    
    // Validate parameters for collection query
    if (!squadron) {
      displayResult('Error: Squadron ID is required for queries (--squadron)', 'error');
      return;
    }
    
    // Build the query
    const result = await withSpinner(
      `Querying ${squadron} ${repository ? `/${repository}` : ''} knowledge`,
      async () => {
        let query = firestore.collection('squadronKnowledge')
          .where('squadron_id', '==', squadron);
          
        // Add repository filter if provided
        if (repository) {
          query = query.where('repository_id', '==', repository);
        }
        
        // Add tags filter if provided (array-contains-any)
        if (tags) {
          const tagsList = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
          if (tagsList.length > 0) {
            // Firestore supports up to 10 values in an array-contains-any query
            query = query.where('tags', 'array-contains-any', tagsList.slice(0, 10));
          }
        }
        
        // Get matches
        const snapshot = await query.limit(parseInt(limit)).get();
        
        // Get the documents
        const entries = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            created_at: data.created_at?.toDate() || null,
            updated_at: data.updated_at?.toDate() || null
          };
        });
        
        // If we have a full-text search query, filter in memory
        // Note: In a production system, you'd use a proper text search solution
        let filteredEntries = entries;
        if (search) {
          const searchTerms = search.toLowerCase().split(' ');
          filteredEntries = entries.filter(entry => {
            const contentText = entry.content.toLowerCase();
            const titleText = entry.title.toLowerCase();
            
            // Simple search: check if any term exists in content or title
            return searchTerms.some(term => 
              contentText.includes(term) || titleText.includes(term)
            );
          });
        }
        
        // Log the query action
        await logAgentAction('serpew_repository_query', {
          type: 'search_query',
          squadron,
          repository,
          search_term: search,
          tags: tags,
          results_count: filteredEntries.length
        });
        
        return {
          success: true,
          message: `Found ${filteredEntries.length} knowledge entries`,
          entries: filteredEntries
        };
      }
    );
    
    if (result && result.success) {
      console.log(chalk.green(`\n✓ Success: Found ${result.entries.length} knowledge entries\n`));
      
      if (result.entries.length === 0) {
        console.log(chalk.yellow('No entries match your query criteria.'));
        console.log('Try broadening your search or checking different repositories.');
        return;
      }
      
      // Format table data
      const tableData = [
        ['ID', 'Title', 'Repository', 'Tags', 'Created At']
      ];
      
      // Add entries to table
      result.entries.forEach(entry => {
        tableData.push([
          entry.id.substring(0, 10) + '...',
          entry.title.substring(0, 25) + (entry.title.length > 25 ? '...' : ''),
          entry.repository_id,
          (entry.tags || []).join(', ').substring(0, 30) + ((entry.tags || []).join(', ').length > 30 ? '...' : ''),
          entry.created_at?.toLocaleString() || 'Unknown'
        ]);
      });
      
      console.log(table(tableData));
      
      // Provide guidance for viewing full entry
      console.log(chalk.cyan('\nTo view a full entry:'));
      console.log(`aixtiv serpew:repository:query --id <entry_id>`);
    } else {
      displayResult(`Error: ${result?.message || 'Failed to query repository'}`, 'error');
    }
  } catch (error) {
    displayResult(`Error: ${error.message}`, 'error');
  }
};
