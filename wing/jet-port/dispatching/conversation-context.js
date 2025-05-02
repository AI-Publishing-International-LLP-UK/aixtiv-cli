/**
 * Aixtiv CLI - Conversation Context Manager
 * 
 * This module is responsible for:
 * - Maintaining conversation state between user interactions
 * - Storing context from previous intents
 * - Helping handle clarifications when intent confidence is low
 * 
 * It integrates with the Flight Memory System (FMS) for persistent storage
 * and the Gateway middleware for role validation.
 */

const winston = require('winston');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Make sure logs directory exists
const logsDir = path.join(__dirname, '../../../logs');
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
      filename: path.join(logsDir, 'conversation-context.log')
    })
  ]
});

// In-memory store for conversation context
// In production, this would be replaced with Firestore integration
const sessionStore = new Map();

// Max age for conversation context (30 minutes in milliseconds)
const CONTEXT_MAX_AGE = 30 * 60 * 1000;

// Maximum number of interactions to keep in history
const MAX_HISTORY_LENGTH = 10;

/**
 * Initialize a new session or get existing session
 * 
 * @param {string} sessionId - Unique identifier for the session
 * @returns {Object} The session context object
 */
function initializeSession(sessionId) {
  if (!sessionStore.has(sessionId)) {
    logger.info(`Initializing new conversation session: ${sessionId}`);
    
    sessionStore.set(sessionId, {
      id: sessionId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      history: [],
      lastIntent: null,
      entities: {},
      clarificationState: null
    });
  }
  
  return sessionStore.get(sessionId);
}

/**
 * Get the current conversation context for a session
 * 
 * @param {string} sessionId - Session identifier
 * @returns {Object} Current context for the session
 */
function getContext(sessionId) {
  // Create default session if it doesn't exist
  const session = initializeSession(sessionId);
  
  // Check if the session has expired
  if (Date.now() - session.updatedAt > CONTEXT_MAX_AGE) {
    logger.info(`Session ${sessionId} has expired, resetting context`);
    sessionStore.delete(sessionId);
    return initializeSession(sessionId);
  }
  
  return session;
}

/**
 * Update the conversation context with a new interaction
 * 
 * @param {string} sessionId - Session identifier
 * @param {string} input - Natural language input from user
 * @param {Object} result - The intent classification result 
 * @returns {Object} Updated context
 */
function updateContext(sessionId, input, result) {
  const session = getContext(sessionId);
  
  // Update session timestamps
  session.updatedAt = Date.now();
  
  // Add this interaction to history
  session.history.push({
    timestamp: Date.now(),
    input: input,
    intent: result.command,
    confidence: result.confidence
  });
  
  // Trim history if it's too long
  if (session.history.length > MAX_HISTORY_LENGTH) {
    session.history = session.history.slice(-MAX_HISTORY_LENGTH);
  }
  
  // Update last intent if we have one
  if (result.command) {
    session.lastIntent = {
      command: result.command,
      flags: result.flags,
      confidence: result.confidence
    };
    
    // Clear clarification state if we have a command
    session.clarificationState = null;
  } 
  // Otherwise update clarification state
  else if (result.needsMoreInfo) {
    session.clarificationState = {
      originalInput: input,
      possibleIntents: result.possibleIntents || [],
      waitingForClarification: true
    };
  }
  
  // Extract and merge entities from current result
  if (result.flags) {
    for (const [key, value] of Object.entries(result.flags)) {
      session.entities[key] = value;
    }
  }
  
  logger.debug(`Updated context for session ${sessionId}`, { session });
  return session;
}

/**
 * Handle clarification responses from the user
 * 
 * @param {string} sessionId - Session identifier
 * @param {string} clarification - User's clarification response
 * @returns {Object} - Enhanced intent based on clarification
 */
function handleClarification(sessionId, clarification) {
  const session = getContext(sessionId);
  
  // Check if we're actually waiting for clarification
  if (!session.clarificationState || !session.clarificationState.waitingForClarification) {
    logger.warn(`Received clarification but not in clarification state for session ${sessionId}`);
    return null;
  }
  
  logger.info(`Processing clarification for session ${sessionId}: "${clarification}"`);
  
  // Simple affirmative pattern matching
  const isAffirmative = clarification.match(/yes|yeah|yep|correct|right|that's right|that is right|confirm|affirmative/i);
  
  // If the user confirmed and we have possible intents
  if (isAffirmative && session.clarificationState.possibleIntents.length > 0) {
    // Check which intent they're confirming
    let chosenIntent = null;
    
    // Try to match the clarification to one of the possible intents
    for (const intent of session.clarificationState.possibleIntents) {
      if (clarification.toLowerCase().includes(intent.toLowerCase())) {
        chosenIntent = intent;
        break;
      }
    }
    
    // If we found a match or there's only one possible intent
    if (chosenIntent || session.clarificationState.possibleIntents.length === 1) {
      const confirmedIntent = chosenIntent || session.clarificationState.possibleIntents[0];
      
      // Map

