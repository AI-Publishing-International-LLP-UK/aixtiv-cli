const { firestore, admin } = require('../../../lib/firestore');
const { displayResult, withSpinner, parseOptions } = require('../../../lib/utils');
const { getCurrentAgentId, logAgentAction } = require('../../../lib/agent-tracking');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

/**
 * Adds knowledge content to a specific squadron repository
 * Supports adding from a file or direct content input
 */
module.exports = async function addToRepository(options) {
  const { 
    squadron, 
    repository = 'general', 
    content, 
    file, 
    title, 
    tags = '',
    format = 'text'
  } = parseOptions(options);
  
  // Validate required parameters
  if (!squadron) {
    displayResult('Error: Squadron ID is required (--squadron)', 'error');
    return;
  }
  
  if (!content && !file) {
    displayResult('Error: Either content (--content) or file path (--file) is required', 'error');
    return;
  }
  
  // Validate squadron format
  const squadronPattern = /^R[1-5]|RIX$/;
  if (!squadronPattern.test(squadron)) {
    displayResult(`Error: Invalid squadron ID. Must be R1, R2, R3, R4, R5, or RIX`, 'error');
    return;
  }
  
  try {
    // Get content from file if specified
    let contentToAdd = content;
    if (file) {
      try {
        const filePath = path.resolve(file);
        contentToAdd = fs.readFileSync(filePath, 'utf8');
      } catch (fileError) {
        displayResult(`Error reading file: ${fileError.message}`, 'error');
        return;
      }
    }
    
    if (!contentToAdd) {
      displayResult('Error: Content is empty', 'error');
      return;
    }
    
    // Get the current agent ID for tracking
    const agentId = getCurrentAgentId();
    
    // Create a unique ID for the knowledge entry
    const knowledgeId = `${repository}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Add to repository
    const result = await withSpinner(
      `Adding content to ${squadron}/${repository} repository`,
      async () => {
        // Create document in squadronKnowledge collection
        const docRef = firestore.collection('squadronKnowledge').doc(knowledgeId);
        
        // Parse tags into array
        const tagsList = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
        
        // Prepare data object
        const data = {
          squadron_id: squadron,
          repository_id: repository,
          content: contentToAdd,
          title: title || `Knowledge entry from ${agentId}`,
          format: format,
          tags: tagsList,
          metadata: {
            added_by: agentId,
            source: file ? 'file' : 'direct_input',
            source_name: file ? path.basename(file) : 'command_line',
            character_count: contentToAdd.length
          },
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        };
        
        // Write document to Firestore
        await docRef.set(data);
        
        // Log the action
        await logAgentAction('serpew_repository_add', {
          squadron: squadron,
          repository: repository,
          knowledge_id: knowledgeId,
          content_length: contentToAdd.length,
          title: data.title
        });
        
        return {
          success: true,
          message: 'Knowledge added to repository successfully',
          knowledgeId,
          characterCount: contentToAdd.length,
          repository,
          squadron
        };
      }
    );
    
    if (result && result.success) {
      console.log(chalk.green('\n✓ Success: Knowledge added to repository successfully\n'));
      console.log(`Squadron: ${chalk.cyan(result.squadron)}`);
      console.log(`Repository: ${chalk.cyan(result.repository)}`);
      console.log(`Knowledge ID: ${chalk.cyan(result.knowledgeId)}`);
      console.log(`Character Count: ${chalk.cyan(result.characterCount)}`);
      
      // Provide query guidance
      console.log(chalk.cyan('\nTo query this knowledge:'));
      console.log(`aixtiv serpew:repository:query --squadron ${result.squadron} --repository ${result.repository} --id ${result.knowledgeId}`);
    } else {
      displayResult(`Error: ${result?.message || 'Failed to add knowledge to repository'}`, 'error');
    }
  } catch (error) {
    displayResult(`Error: ${error.message}`, 'error');
  }
};
