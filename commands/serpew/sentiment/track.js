const { firestore, admin } = require('../../../lib/firestore');
const { displayResult, withSpinner, parseOptions } = require('../../../lib/utils');
const { getCurrentAgentId, logAgentAction } = require('../../../lib/agent-tracking');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

/**
 * Tracks sentiment data from agent interactions
 * Stores raw sentiment data for later analysis
 */
module.exports = async function trackSentiment(options) {
  const { 
    interaction_id,
    content,
    file,
    sentiment,
    agent,
    squadron,
    tags = '',
    source = 'manual',
    session_id 
  } = parseOptions(options);
  
  // Validate required parameters
  if (!interaction_id) {
    displayResult('Error: Interaction ID is required (--interaction_id)', 'error');
    return;
  }
  
  if (!sentiment) {
    displayResult('Error: Sentiment value is required (--sentiment)', 'error');
    return;
  }
  
  // Validate sentiment format
  const validSentiments = ['positive', 'negative', 'neutral'];
  if (!validSentiments.includes(sentiment.toLowerCase())) {
    displayResult(`Error: Invalid sentiment value. Must be one of: ${validSentiments.join(', ')}`, 'error');
    return;
  }
  
  try {
    // Get content from file if specified
    let contentToStore = content;
    if (file) {
      try {
        const filePath = path.resolve(file);
        contentToStore = fs.readFileSync(filePath, 'utf8');
      } catch (fileError) {
        displayResult(`Error reading file: ${fileError.message}`, 'error');
        return;
      }
    }
    
    // Get the current agent ID for tracking
    const agentId = agent || getCurrentAgentId();
    
    // Parse tags into array
    const tagsList = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    
    // Add to sentimentData
    const result = await withSpinner(
      `Tracking sentiment data for interaction ${interaction_id}`,
      async () => {
        // Create document in sentimentData collection
        const docRef = firestore.collection('sentimentData').doc(interaction_id);
        
        // Prepare data object
        const data = {
          interaction_id,
          agent_id: agentId,
          sentiment: sentiment.toLowerCase(),
          content: contentToStore,
          squadron_id: squadron || null,
          session_id: session_id || null,
          tags: tagsList,
          metadata: {
            source,
            content_length: contentToStore ? contentToStore.length : 0
          },
          created_at: admin.firestore.FieldValue.serverTimestamp()
        };
        
        // Write document to Firestore
        await docRef.set(data);
        
        // Log the action
        await logAgentAction('serpew_sentiment_track', {
          interaction_id,
          sentiment: sentiment.toLowerCase(),
          agent: agentId,
          squadron: squadron,
          session_id: session_id
        });
        
        return {
          success: true,
          message: 'Sentiment data tracked successfully',
          interaction_id,
          sentiment: sentiment.toLowerCase(),
          agent: agentId
        };
      }
    );
    
    if (result && result.success) {
      console.log(chalk.green('\n✓ Success: Sentiment data tracked successfully\n'));
      console.log(`Interaction ID: ${chalk.cyan(result.interaction_id)}`);
      console.log(`Agent: ${chalk.cyan(result.agent)}`);
      console.log(`Sentiment: ${getSentimentColorText(result.sentiment)}`);
      
      // Display content summary if provided
      if (contentToStore) {
        console.log(chalk.cyan('\nContent Summary:'));
        console.log(`Characters: ${contentToStore.length}`);
        console.log(`Words: ${contentToStore.split(/\W+/).filter(w => w.length > 0).length}`);
      }
      
      // Provide next steps
      console.log(chalk.cyan('\nNext Steps:'));
      console.log('To view sentiment trends for this agent:');
      console.log(`aixtiv serpew:sentiment:report --agent ${result.agent}`);
    } else {
      displayResult(`Error: ${result?.message || 'Failed to track sentiment data'}`, 'error');
    }
  } catch (error) {
    displayResult(`Error: ${error.message}`, 'error');
  }
};

/**
 * Returns sentiment text with appropriate color
 * @param {string} sentiment - The sentiment value
 * @returns {string} Colored sentiment text
 */
function getSentimentColorText(sentiment) {
  switch (sentiment.toLowerCase()) {
    case 'positive':
      return chalk.green('Positive');
    case 'negative':
      return chalk.red('Negative');
    case 'neutral':
      return chalk.blue('Neutral');
    default:
      return chalk.white(sentiment);
  }
}
