/**
 * Aixtiv CLI - Natural Language Intent Classifier
 * 
 * This module is responsible for:
 * - Classifying natural language inputs into intents
 * - Mapping intents to Aixtiv CLI commands
 * - Extracting parameters from natural language
 */

const winston = require('winston');
const fs = require('fs');
const path = require('path');

// Make sure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Setup logging
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ 
      filename: path.join(logsDir, 'nlp-intent-classifier.log')
    })
  ]
});

/**
 * Main intent classification function
 * 
 * @param {string} input - Natural language input from user
 * @returns {Object} Object containing command, flags, and confidence
 */
function classifyIntent(input) {
  logger.debug(`Classifying intent for input: "${input}"`);
  
  // Normalize input
  const normalizedInput = input.toLowerCase().trim();
  
  // Try each intent classifier in order of priority
  const classifiers = [
    classifyDelegateIntent,
    classifyCodeGenerationIntent,
    classifyGitHubIntent,
    classifyCopilotIntent,
    // Add more classifiers as they're implemented
  ];
  
  for (const classifier of classifiers) {
    const result = classifier(normalizedInput);
    if (result.confidence > 0.6) { // Threshold for accepting an intent
      logger.info(`Classified intent: ${result.command} with confidence ${result.confidence}`);
      return result;
    }
  }
  
  // Default fallback
  logger.warn(`Could not classify intent for input: "${input}"`);
  return {
    command: null,
    flags: {},
    confidence: 0,
    needsMoreInfo: true,
    possibleIntents: guessPossibleIntents(normalizedInput)
  };
}

/**
 * Guess possible intents when confidence is too low
 */
function guessPossibleIntents(input) {
  const possibleIntents = [];
  
  if (input.match(/project|delegate|assign|task|manage/)) {
    possibleIntents.push('project delegation');
  }
  
  if (input.match(/code|generate|create|function|component|build/)) {
    possibleIntents.push('code generation');
  }
  
  if (input.match(/github|repo|repository|git|commit|branch/)) {
    possibleIntents.push('github automation');
  }
  
  if (input.match(/copilot|co-pilot|link|connect|pilot/)) {
    possibleIntents.push('copilot management');
  }
  
  return possibleIntents;
}

/**
 * Extract entity values from input based on patterns
 */
function extractEntity(input, entityType) {
  // Extract project names (usually quoted or clearly delineated)
  if (entityType === 'projectName') {
    // First check for quoted project names
    const quotedMatch = input.match(/"([^"]+)"|'([^']+)'/);
    if (quotedMatch) {
      return quotedMatch.find(m => m && m !== quotedMatch[0]);
    }
    
    // Then check for "called X" or "named X" patterns, allowing multi-word names
    const calledOrNamedMatch = input.match(/called\s+([A-Za-z0-9\s-_]+?)(?:\.|\,|\s+with|\s+to|\s+that|\s+which|\s+and|\s+$)/i);
    if (calledOrNamedMatch) {
      return calledOrNamedMatch[1].trim();
    }
    
    // If no clear delineation, try to find noun phrases after certain key words
    const afterKeyword = input.match(/project\s+(?:called|named|for|on)?\s+([A-Za-z0-9\s-_]+?)(?:\.|\,|\s+with|\s+to|\s+that|\s+which|\s+and|\s+$)/i);
    if (afterKeyword) {
      return afterKeyword[1].trim();
    }
    
    // Look for phrases like "create a X project" or "start X project"
    const createOrStartMatch = input.match(/(?:create|start|make|build)\s+(?:a|an|the)?\s+([A-Za-z0-9\s-_]+?)\s+project/i);
    if (createOrStartMatch) {
      return createOrStartMatch[1].trim();
    }
  }
  
  // Extract description (usually longer text after certain keywords)
  if (entityType === 'description') {
    const descMatch = input.match(/(?:to|that|which)\s+(.*?)(?:\.|\,|\s+with|\s+by|\s+before|\s+$)/i);
    if (descMatch) {
      return descMatch[1].trim();
    }
  }
  
  // Extract priority levels
  if (entityType === 'priority') {
    if (input.match(/\bhigh\s+priority\b|\bimportant\b|\bcritical\b|\burgent\b/i)) {
      return 'high';
    }
    if (input.match(/\blow\s+priority\b|\bnot\s+urgent\b|\bnot\s+important\b|\bminor\b/i)) {
      return 'low';
    }
    return 'medium'; // Default priority
  }
  
  // Extract agent names
  if (entityType === 'agent') {
    const agentMatch = input.match(/(?:agent|to|with|using|via)\s+(?:dr\.\s*)?([a-z]+)(?:\b|\.|\,)/i);
    if (agentMatch) {
      return agentMatch[1].trim().toLowerCase();
    }
  }
  
  // Extract programming language
  if (entityType === 'language') {
    const languageMatch = input.match(/\b(javascript|js|python|typescript|ts|java|ruby|go|rust|php|c\+\+|csharp|c#)\b/i);
    if (languageMatch) {
      const lang = languageMatch[1].toLowerCase();
      
      // Normalize language names
      const langMap = {
        'js': 'javascript',
        'ts': 'typescript',
        'c#': 'csharp'
      };
      
      return langMap[lang] || lang;
    }
    return 'javascript'; // Default language
  }
  
  // Extract repository names
  if (entityType === 'repository') {
    const repoMatch = input.match(/(?:repo|repository)\s+([A-Za-z0-9_-]+)/i);
    if (repoMatch) {
      return repoMatch[1];
    }
  }
  
  return null;
}

/**
 * Classifier for project delegation intent (claude:agent:delegate)
 */
function classifyDelegateIntent(input) {
  let confidence = 0;
  const result = {
    command: 'claude:agent:delegate',
    flags: {},
    confidence: 0
  };
  
  // Check for delegation keywords
  if (input.match(/delegate|delegat|assign|project|task|manage|create\s+(?:a|an|the)?\s+project|make\s+(?:a|an|the)?\s+project|start\s+(?:a|an|the)?\s+project/i)) {
    confidence += 0.3;
    
    // Extract project name
    const projectName = extractEntity(input, 'projectName');
    if (projectName) {
      result.flags['project'] = projectName;
      confidence += 0.2;
    }
    
    // Extract description
    const description = extractEntity(input, 'description');
    if (description) {
      result.flags['description'] = description;
      confidence += 0.2;
    } else {
      // Add a default description if none was provided
      // If we have a project name, use it in the description
      if (projectName) {
        result.flags['description'] = `Project created for ${projectName} via natural language interface`;
      } else {
        result.flags['description'] = 'Project created via natural language interface';
      }
      // Less confidence boost for default description
      confidence += 0.1;
    }
    
    // Extract priority
    const priority = extractEntity(input, 'priority');
    if (priority) {
      result.flags['priority'] = priority;
      confidence += 0.1;
    }
    
    // Extract agent assignment
    const agent = extractEntity(input, 'agent');
    if (agent) {
      result.flags['assign-to'] = agent;
      confidence += 0.1;
    }
    
    // Additional confidence if certain key phrases are present
    if (input.match(/claude.*delegate|delegate.*project|assign.*task|create.*project/i)) {
      confidence += 0.2;
    }
    
    // Higher confidence for very clear project creation phrases
    if (input.match(/create\s+(?:a|an|the)?\s+project|make\s+(?:a|an|the)?\s+project|start\s+(?:a|an|the)?\s+project/i)) {
      confidence += 0.1;
    }
  }
  
  result.confidence = Math.min(confidence, 1.0);
  return result;
}

/**
 * Classifier for code generation intent (claude:code:generate)
 */
function classifyCodeGenerationIntent(input) {
  let confidence = 0;
  const result = {
    command: 'claude:code:generate',
    flags: {},
    confidence: 0
  };
  
  // Check for code generation keywords
  if (input.match(/generat|code|creat|build|develop|function|component|class|script|write code/i)) {
    confidence += 0.3;
    
    // Extract task description
    const description = extractEntity(input, 'description');
    if (description) {
      result.flags['task'] = description;
      confidence += 0.3;
    } else {
      // If no specific description, use the whole input as task
      result.flags['task'] = input;
      confidence += 0.1;
    }
    
    // Extract programming language
    const language = extractEntity(input, 'language');
    if (language) {
      result.flags['language'] = language;
      confidence += 0.2;
    }
    
    // Additional confidence if certain key phrases are present
    if (input.match(/generat.*code|create.*component|build.*function|write.*code/i)) {
      confidence += 0.2;
    }
  }
  
  result.confidence = Math.min(confidence, 1.0);
  return result;
}

/**
 * Classifier for GitHub automation intent (claude:automation:github)
 */
function classifyGitHubIntent(input) {
  let confidence = 0;
  const result = {
    command: 'claude:automation:github',
    flags: {},
    confidence: 0
  };
  
  // Check for GitHub keywords
  if (input.match(/github|git|repo|repository|branch|commit|pull request|pr|sync|align|clean|secure/i)) {
    confidence += 0.3;
    
    // Extract repository name
    const repo = extractEntity(input, 'repository');
    if (repo) {
      result.flags['repository'] = repo;
      confidence += 0.2;
    }
    
    // Determine action type
    if (input.match(/align|organiz|structur|best practice/i)) {
      result.flags['action'] = 'align';
      confidence += 0.2;
    } else if (input.match(/clean|cleanup|tidy|remove|delete/i)) {
      result.flags['action'] = 'clean';
      confidence += 0.2;
    } else if (input.match(/secure|security|check|vulnerab|scan/i)) {
      result.flags['action'] = 'secure';
      confidence += 0.2;
    } else if (input.match(/sync|synchronize|update|pull|push/i)) {
      result.flags['action'] = 'sync';
      confidence += 0.2;
    } else if (input.match(/memoria|assist|anthology|document/i)) {
      result.flags['action'] = 'memoria-assist';
      confidence += 0.2;
    }
    
    // Additional confidence if certain key phrases are present
    if (input.match(/github.*repo|manage.*repo|clean.*github|secure.*repository/i)) {
      confidence += 0.2;
    }
  }
  
  result.confidence = Math.min(confidence, 1.0);
  return result;
}

/**
 * Classifier for copilot management intent
 */
function classifyCopilotIntent(input) {
  let confidence = 0;
  const result = {
    command: null,
    flags: {},
    confidence: 0
  };
  
  // Check for copilot keywords
  if (input.match(/copilot|co-pilot|link|connect|pilot/i)) {
    confidence += 0.3;
    
    // Determine specific copilot command
    if (input.match(/link|connect|add|create|assign|new/i)) {
      result.command = 'copilot:link';
      confidence += 0.2;
      
      // Extract copilot name/email
      const copilot = extractEntity(input, 'agent');
      if (copilot) {
        result.flags['copilot'] = copilot;
        confidence += 0.2;
      }
    } else if (input.match(/unlink|disconnect|remove|delete/i)) {
      result.command = 'copilot:unlink';
      confidence += 0.2;
      
      // Extract copilot name/email
      const copilot = extractEntity(input, 'agent');
      if (copilot) {
        result.flags['copilot'] = copilot;
        confidence += 0.2;
      }
    } else if (input.match(/list|show|display/i)) {
      result.command = 'copilot:list';
      confidence += 0.2;
    } else if (input.match(/verify|check|validate|confirm/i)) {
      result.command = 'copilot:verify';
      confidence += 0.2;
      
      // Extract copilot name/email
      const copilot = extractEntity(input, 'agent');
      if (copilot) {
        result.flags['copilot'] = copilot;
        confidence += 0.2;
      }
    } else if (input.match(/grant|give|allow|access/i)) {
      result.command = 'copilot:grant';
      confidence += 0.2;
      
      // Extract copilot name/email
      const copilot = extractEntity(input, 'agent');
      if (copilot) {
        result.flags['copilot'] = copilot;
        confidence += 0.2;
      }
      
      // Try to extract resource
      const resource = extractEntity(input, 'repository');
      if (resource) {
        result.flags['resource'] = resource;
        confidence += 0.1;
      }
    }
    
    // Additional confidence if certain key phrases are present
    if (input.match(/link.*copilot|verify.*copilot|copilot.*access/i)) {
      confidence += 0.2;
    }
  }
  
  result.confidence = Math.min(confidence, 1.0);
  return result;
}

module.exports = {
  classifyIntent,
  extractEntity
};

