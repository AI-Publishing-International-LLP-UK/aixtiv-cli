/**
 * Agent tracking and attribution system
 * Records all actions performed by agents with proper attribution
 */

// Try to import logger from utils, but create a fallback if not available
let logger;
try {
  const utils = require('./utils');
  logger = utils.logger;
} catch (error) {
  // Fallback logger using console
  logger = {
    info: (message) => console.log(message),
    error: (message) => console.error(message)
  };
}

// Check if logger is undefined and create a fallback
if (!logger) {
  logger = {
    info: (message) => console.log(message),
    error: (message) => console.error(message)
  };
}

const fs = require('fs');
const path = require('path');
const os = require('os');

// Try to import Firestore, but create a fallback if not available
let firestore;
try {
  const firestoreModule = require('./firestore');
  firestore = firestoreModule.firestore;
} catch (error) {
  logger.error(`Failed to load Firestore module: ${error.message}`);
  firestore = null;
}

// Agent ID environment variable name
const AGENT_ID_ENV = 'AGENT_ID';
const LOG_DIR = path.join(os.homedir(), '.aixtiv', 'logs');

// Ensure log directory exists
try {
  fs.mkdirSync(LOG_DIR, { recursive: true });
} catch (error) {
  // Ignore errors if directory already exists
}

/**
 * Get the current agent ID from environment or default to UNSPECIFIED
 * @returns {string} The agent ID
 */
function getCurrentAgentId() {
  return process.env[AGENT_ID_ENV] || 'UNSPECIFIED_AGENT';
}

/**
 * Log an action performed by an agent
 * @param {string} action - The action being performed
 * @param {object} details - Details about the action
 * @returns {Promise<object>} The log entry
 */
async function logAgentAction(action, details = {}) {
  const agentId = getCurrentAgentId();
  const timestamp = new Date().toISOString();
  const today = new Date().toISOString().split('T')[0];
  const logFile = path.join(LOG_DIR, `agent-actions-${today}.log`);
  
  const logEntry = {
    timestamp,
    agent_id: agentId,
    action_type: action,
    description: details.description || '',
    details
  };

  // Log to console
  logger.info(`Agent: ${agentId} | Action: ${action} | Details: ${JSON.stringify(details)}`);
  
  // Write to local log file
  try {
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  } catch (error) {
    logger.error(`Failed to write to log file: ${error.message}`);
  }
  
  // Store in Firestore if available
  if (firestore) {
    try {
      await firestore.collection('agentActions').add(logEntry);
    } catch (error) {
      logger.error(`Failed to store agent action in Firestore: ${error.message}`);
    }
  }
  
  return logEntry;
}

/**
 * Set the current agent ID for the process
 * @param {string} agentId - The agent identifier to set
 */
function setAgentId(agentId) {
  if (!agentId) {
    throw new Error('Agent ID cannot be empty');
  }
  process.env[AGENT_ID_ENV] = agentId;
  logger.info(`Set current agent ID to: ${agentId}`);
  
  // Log agent ID change
  logAgentAction('agent_id_set', { 
    new_agent_id: agentId,
    previous_agent_id: getCurrentAgentId()
  });
}

/**
 * Middleware to require agent ID for Express routes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function requireAgentId(req, res, next) {
  const agentId = req.headers['x-agent-id'] || req.query.agent_id;
  
  if (!agentId) {
    return res.status(400).json({ 
      error: 'Missing agent ID. Please provide x-agent-id header or agent_id query parameter.' 
    });
  }
  
  // Set the agent ID for this request context
  req.agentId = agentId;
  process.env[AGENT_ID_ENV] = agentId;
  
  // Log request with agent ID
  logAgentAction('api_request', { 
    method: req.method,
    path: req.path,
    agent_id: agentId
  });
  
  next();
}

/**
 * Create a wrapped function that logs agent actions before execution
 * @param {Function} fn - The function to wrap
 * @param {string} actionName - Name of the action being performed
 * @returns {Function} Wrapped function that logs agent attribution
 */
function withAgentAttribution(fn, actionName) {
  return async (...args) => {
    const agentId = getCurrentAgentId();
    const details = { 
      args: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg),
      description: `Executing ${actionName}`
    };
    
    await logAgentAction(actionName, details);
    
    const startTime = Date.now();
    
    try {
      const result = await fn(...args);
      const duration = Date.now() - startTime;
      
      await logAgentAction(`${actionName}_completed`, { 
        success: true,
        duration_ms: duration,
        description: `Completed ${actionName} in ${duration}ms`
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      await logAgentAction(`${actionName}_failed`, { 
        error: error.message, 
        stack: error.stack,
        duration_ms: duration,
        description: `Failed ${actionName} after ${duration}ms: ${error.message}`
      });
      
      throw error;
    }
  };
}

/**
 * Get recent agent actions from local logs
 * @param {object} filters - Optional filters for agent actions
 * @param {number} limit - Maximum number of actions to return
 * @returns {Array<object>} Recent agent actions
 */
function getRecentAgentActions(filters = {}, limit = 100) {
  const { agentId, actionType, from, to } = filters;
  
  try {
    // Get all log files
    const logFiles = fs.readdirSync(LOG_DIR)
      .filter(file => file.startsWith('agent-actions-') && file.endsWith('.log'))
      .sort((a, b) => b.localeCompare(a)); // Sort by date descending
    
    const actions = [];
    
    // Process log files
    for (const logFile of logFiles) {
      const fileDate = logFile.replace('agent-actions-', '').replace('.log', '');
      
      // Apply date range filter
      if (from && fileDate < from) continue;
      if (to && fileDate > to) continue;
      
      // Read log file
      const logContent = fs.readFileSync(path.join(LOG_DIR, logFile), 'utf8');
      const logLines = logContent.split('\n').filter(line => line.trim());
      
      // Parse and filter log entries
      for (const line of logLines) {
        if (actions.length >= limit) break;
        
        try {
          const entry = JSON.parse(line);
          
          // Apply filters
          if (agentId && entry.agent_id !== agentId) continue;
          if (actionType && entry.action_type !== actionType) continue;
          
          actions.push(entry);
        } catch (error) {
          logger.error(`Failed to parse log entry: ${error.message}`);
        }
      }
      
      if (actions.length >= limit) break;
    }
    
    return actions;
  } catch (error) {
    logger.error(`Failed to get recent agent actions: ${error.message}`);
    return [];
  }
}

/**
 * Get agent activity summary
 * @param {number} days - Number of days to include in summary
 * @returns {object} Agent activity summary
 */
function getAgentActivitySummary(days = 7) {
  try {
    const summary = {
      total_actions: 0,
      actions_by_agent: {},
      actions_by_type: {},
      recent_actions: []
    };
    
    // Calculate date range
    const today = new Date();
    const fromDate = new Date(today);
    fromDate.setDate(fromDate.getDate() - days);
    
    // Get log files in date range
    const fromDateStr = fromDate.toISOString().split('T')[0];
    const logFiles = fs.readdirSync(LOG_DIR)
      .filter(file => {
        const fileDate = file.replace('agent-actions-', '').replace('.log', '');
        return file.startsWith('agent-actions-') && 
               file.endsWith('.log') &&
               fileDate >= fromDateStr;
      })
      .sort((a, b) => a.localeCompare(b)); // Sort by date ascending
    
    // Process log files
    for (const logFile of logFiles) {
      // Read log file
      const logContent = fs.readFileSync(path.join(LOG_DIR, logFile), 'utf8');
      const logLines = logContent.split('\n').filter(line => line.trim());
      
      // Parse log entries
      for (const line of logLines) {
        try {
          const entry = JSON.parse(line);
          summary.total_actions++;
          
          // Count by agent
          if (!summary.actions_by_agent[entry.agent_id]) {
            summary.actions_by_agent[entry.agent_id] = 0;
          }
          summary.actions_by_agent[entry.agent_id]++;
          
          // Count by action type
          if (!summary.actions_by_type[entry.action_type]) {
            summary.actions_by_type[entry.action_type] = 0;
          }
          summary.actions_by_type[entry.action_type]++;
          
          // Add to recent actions (keep newest 10)
          summary.recent_actions.push(entry);
          if (summary.recent_actions.length > 10) {
            summary.recent_actions.shift();
          }
        } catch (error) {
          // Skip invalid entries
        }
      }
    }
    
    return summary;
  } catch (error) {
    logger.error(`Failed to get agent activity summary: ${error.message}`);
    return {
      total_actions: 0,
      actions_by_agent: {},
      actions_by_type: {},
      recent_actions: []
    };
  }
}

/**
 * Log OpenAI/Anthropic API usage with proper attribution
 * @param {string} provider - AI provider name (e.g., 'openai', 'anthropic')
 * @param {string} model - Model name (e.g., 'gpt-4', 'claude-3')
 * @param {string} prompt - The prompt sent to the API
 * @param {string} operation - Type of operation (e.g., 'completion', 'chat')
 * @param {object} metadata - Additional metadata
 * @returns {Promise<object>} The log entry
 */
async function logAIUsage(provider, model, prompt, operation, metadata = {}) {
  return await logAgentAction('ai_api_call', {
    provider,
    model,
    prompt,
    operation,
    metadata,
    description: `${provider} ${model} ${operation} request`
  });
}

/**
 * Log OpenAI/Anthropic API response with proper attribution
 * @param {string} provider - AI provider name (e.g., 'openai', 'anthropic')
 * @param {string} model - Model name (e.g., 'gpt-4', 'claude-3')
 * @param {object} response - The API response object
 * @param {string} operation - Type of operation (e.g., 'completion', 'chat')
 * @param {object} metadata - Additional metadata
 * @returns {Promise<object>} The log entry
 */
async function logAIResponse(provider, model, response, operation, metadata = {}) {
  // Extract content from response
  let content = '';
  if (response && typeof response === 'object') {
    if (provider === 'openai') {
      content = response.choices?.[0]?.message?.content || 
                response.choices?.[0]?.text || 
                JSON.stringify(response);
    } else if (provider === 'anthropic') {
      content = response.content || JSON.stringify(response);
    } else {
      content = JSON.stringify(response);
    }
  } else {
    content = String(response);
  }
  
  // Truncate content if too long
  if (content.length > 1000) {
    content = content.substring(0, 1000) + '... [truncated]';
  }
  
  return await logAgentAction('ai_api_response', {
    provider,
    model,
    content,
    operation,
    metadata,
    description: `${provider} ${model} ${operation} response`
  });
}

module.exports = {
  getCurrentAgentId,
  logAgentAction,
  setAgentId,
  requireAgentId,
  withAgentAttribution,
  getRecentAgentActions,
  getAgentActivitySummary,
  logAIUsage,
  logAIResponse
};