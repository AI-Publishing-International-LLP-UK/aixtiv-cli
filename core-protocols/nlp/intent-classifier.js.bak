/**
 * Aixtiv CLI - Intent Classifier
 *
 * This module analyzes natural language input and classifies it into commands
 * and parameters that can be executed by the Aixtiv CLI.
 */

/**
 * Command patterns for intent recognition
 * Each pattern includes:
 * - keywords: Words that indicate this command
 * - flags: Parameter types to extract
 * - examples: Example phrases
 */
const COMMAND_PATTERNS = [
  {
    command: 'claude:code:generate',
    keywords: ['generate', 'create', 'code', 'function', 'class', 'write'],
    flags: {
      task: { required: true, type: 'string' },
      language: { required: false, type: 'string', default: 'javascript' },
      'output-file': { required: false, type: 'string' },
    },
    examples: [
      'generate code for a factorial function',
      'create a login component in React',
      'write a function to parse JSON',
    ],
  },
  {
    command: 'claude:agent:delegate',
    keywords: ['delegate', 'project', 'task', 'assign'],
    flags: {
      project: { required: true, type: 'string' },
      description: { required: true, type: 'string' },
      priority: { required: false, type: 'string', default: 'medium' },
    },
    examples: [
      'delegate a project called website redesign',
      'assign task email validation to claude',
      'create a new project for API integration',
    ],
  },
  {
    command: 'claude:automation:github',
    keywords: ['github', 'repo', 'repository', 'automate'],
    flags: {
      repository: { required: true, type: 'string' },
      action: { required: true, type: 'string', default: 'align' },
    },
    examples: [
      'check security for our main repository',
      'align files in the AIXTIV-SYMPHONY repo',
      'clean up pending changes in repository',
    ],
  },
  {
    command: 'copilot:link',
    keywords: ['link', 'connect', 'copilot'],
    flags: {
      email: { required: true, type: 'string' },
      copilot: { required: true, type: 'string' },
    },
    examples: [
      'link lucy as a copilot',
      'connect copilot dr.grant@drgrant.live',
      'add copilot for pr@coaching2100.com',
    ],
  },
  {
    command: 'domain list',
    keywords: ['list', 'show', 'domains', 'domain'],
    flags: {},
    examples: ['list all domains', 'show domains', 'display available domains'],
  },
  {
    command: 'help',
    keywords: ['help', 'guide', 'tutorial', 'instructions'],
    flags: {},
    examples: ['show help', 'I need help', 'show me the docs'],
  },
];

/**
 * Classify natural language input into a command intent
 *
 * @param {string} input - Natural language input
 * @returns {Object} Intent object with command, flags, and confidence score
 */
function classifyIntent(input) {
  const normalizedInput = input.toLowerCase().trim();
  const words = normalizedInput.split(/\s+/);

  // Initialize best match with empty values
  let bestMatch = {
    command: null,
    flags: {},
    confidence: 0,
    possibleIntents: [],
  };

  // Track possible intents for ambiguous inputs
  const possibleIntents = [];

  // Check against each command pattern
  for (const pattern of COMMAND_PATTERNS) {
    // Calculate how many keywords match
    const matchingKeywords = pattern.keywords.filter((keyword) =>
      normalizedInput.includes(keyword.toLowerCase())
    );

    // Calculate confidence based on keyword matches
    let confidence = matchingKeywords.length / Math.max(pattern.keywords.length, 1);

    // Adjust confidence based on word length (longer inputs need more evidence)
    confidence = confidence * (1 - 0.01 * Math.max(0, words.length - 5));

    // If this pattern is a possible match, record it
    if (confidence > 0.2) {
      possibleIntents.push(pattern.command);
    }

    // If this pattern is the best match so far, update our result
    if (confidence > bestMatch.confidence) {
      const extractedFlags = extractFlags(normalizedInput, pattern);

      // Only consider complete matches where required flags are present
      const hasRequiredFlags = Object.entries(pattern.flags)
        .filter(([_, config]) => config.required)
        .every(([flag, _]) => extractedFlags[flag] !== undefined);

      if (hasRequiredFlags || confidence > 0.8) {
        bestMatch = {
          command: pattern.command,
          flags: extractedFlags,
          confidence: confidence,
        };
      }
    }
  }

  // If there's no clear winner but we have possible intents, provide them
  if (bestMatch.confidence < 0.4 && possibleIntents.length > 0) {
    bestMatch.possibleIntents = possibleIntents;
  }

  return bestMatch;
}

/**
 * Extract flag values from natural language input
 *
 * @param {string} input - Natural language input
 * @param {Object} pattern - Command pattern definition
 * @returns {Object} Extracted flags and their values
 */
function extractFlags(input, pattern) {
  const flags = {};

  // Extract flags based on pattern definitions
  for (const [flag, config] of Object.entries(pattern.flags)) {
    let value = null;

    // Simple extraction strategies based on flag type
    switch (flag) {
      case 'task':
        // For code generation tasks
        if (pattern.command === 'claude:code:generate') {
          // Get the part after "generate", "create", "code", etc.
          for (const keyword of ['generate', 'create', 'code', 'function', 'write']) {
            const index = input.indexOf(keyword);
            if (index !== -1) {
              value = input.substr(index + keyword.length).trim();
              break;
            }
          }
        }
        break;

      case 'project':
        // Look for project name after "called", "named", etc.
        const projectMarkers = [' called ', ' named ', ' for ', ' titled '];
        for (const marker of projectMarkers) {
          const index = input.indexOf(marker);
          if (index !== -1) {
            value = input.substr(index + marker.length).trim();
            // Trim quotes and periods
            value = value.replace(/["'.]+$/, '');
            break;
          }
        }
        break;

      case 'language':
        // Look for programming language names
        const languages = [
          'javascript',
          'python',
          'java',
          'typescript',
          'c#',
          'c++',
          'ruby',
          'go',
          'php',
          'rust',
        ];
        for (const lang of languages) {
          if (input.includes(lang)) {
            value = lang;
            break;
          }
        }
        break;

      case 'repository':
        // Look for repo names
        const repoMarkers = [' repo ', ' repository ', ' for repo ', ' for repository '];
        for (const marker of repoMarkers) {
          const index = input.indexOf(marker);
          if (index !== -1) {
            value = input
              .substr(index + marker.length)
              .split(' ')[0]
              .trim();
            break;
          }
        }

        // If no repo specified but we need one, use 'main'
        if (!value && pattern.command === 'claude:automation:github') {
          const actionWords = ['check', 'secure', 'align', 'clean'];
          if (actionWords.some((word) => input.includes(word))) {
            value = 'main';
          }
        }
        break;

      case 'action':
        // For GitHub automation
        const actions = {
          security: 'secure',
          secure: 'secure',
          clean: 'clean',
          cleanup: 'clean',
          align: 'align',
          format: 'align',
          memoria: 'memoria-assist',
          sync: 'sync',
        };

        for (const [actionWord, actionValue] of Object.entries(actions)) {
          if (input.includes(actionWord)) {
            value = actionValue;
            break;
          }
        }
        break;

      case 'copilot':
        // Extract copilot name or email
        const copilotMarkers = [' copilot ', ' co-pilot ', ' as copilot', ' as a copilot'];
        for (const marker of copilotMarkers) {
          const index = input.indexOf(marker);
          if (index !== -1) {
            // Get word before or after marker
            const beforeText = input.substr(0, index).trim().split(' ');
            const afterText = input
              .substr(index + marker.length)
              .trim()
              .split(' ');

            // If there's a word after the marker, use it
            if (afterText.length > 0 && afterText[0].length > 0) {
              value = afterText[0];
            }
            // Otherwise use the word before the marker
            else if (beforeText.length > 0) {
              value = beforeText[beforeText.length - 1];
            }

            // Clean up value
            if (value) {
              value = value.replace(/[,.:;'"]/, '');
            }
            break;
          }
        }

        // If explicit names mentioned
        const namePatterns = ['lucy', 'sabina', 'memoria', 'grant', 'claude'];
        for (const name of namePatterns) {
          if (input.includes(name)) {
            value = name;
            break;
          }
        }
        break;
    }

    // If we found a value, add it to flags
    if (value) {
      flags[flag] = value;
    }
    // Otherwise use default if specified
    else if (config.default) {
      flags[flag] = config.default;
    }
  }

  return flags;
}

module.exports = {
  classifyIntent,
};
