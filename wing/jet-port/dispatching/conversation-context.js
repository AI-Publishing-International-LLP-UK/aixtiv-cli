/**
 * Aixtiv CLI - Conversation Context Manager
 *
 * This module manages conversation state for stateful interactions with agents.
 * It provides storage and retrieval of context, as well as context augmentation.
 */

// In-memory context store (would be replaced with persistent storage in production)
const contextStore = new Map();

/**
 * Update the conversation context with new information
 *
 * @param {string} sessionId - Unique session identifier
 * @param {string} input - User input
 * @param {Object} result - Processing result
 * @returns {Object} Updated context
 */
function updateContext(sessionId, input, result) {
  // Get existing context or create a new one
  const context = getContext(sessionId);

  // Update context with this interaction
  const updatedContext = {
    ...context,
    lastInput: input,
    lastIntent: result,
    lastUpdated: new Date().toISOString(),
    interactions: (context.interactions || 0) + 1,
  };

  // Store the updated context
  contextStore.set(sessionId, updatedContext);

  return updatedContext;
}

/**
 * Get the conversation context for a session
 *
 * @param {string} sessionId - Unique session identifier
 * @returns {Object} Conversation context
 */
function getContext(sessionId) {
  return (
    contextStore.get(sessionId) || {
      sessionId,
      created: new Date().toISOString(),
      interactions: 0,
    }
  );
}

/**
 * Process a user clarification response
 *
 * @param {string} sessionId - Unique session identifier
 * @param {string} clarification - User's clarification input
 * @returns {Object|null} Clarified intent or null if unable to clarify
 */
function handleClarification(sessionId, clarification) {
  const context = getContext(sessionId);

  // If there's no clarification state, we can't handle it
  if (!context.clarificationState || !context.clarificationState.waitingForClarification) {
    return null;
  }

  // Process clarification based on the options
  const { options } = context.clarificationState;
  const normalizedInput = clarification.toLowerCase().trim();

  // Look for matches in the options
  for (const option of options) {
    if (normalizedInput.includes(option.toLowerCase())) {
      // Clear clarification state
      const updatedContext = {
        ...context,
        clarificationState: null,
      };

      contextStore.set(sessionId, updatedContext);

      // Return the clarified intent
      return context.lastIntent;
    }
  }

  // No match found, return null
  return null;
}

/**
 * Request clarification from user
 *
 * @param {string} sessionId - Unique session identifier
 * @param {string} question - Question to ask user
 * @param {Array<string>} options - Available options for clarification
 * @returns {Object} Updated context
 */
function requestClarification(sessionId, question, options) {
  const context = getContext(sessionId);

  // Set clarification state
  const updatedContext = {
    ...context,
    clarificationState: {
      waitingForClarification: true,
      question,
      options,
      startedAt: new Date().toISOString(),
    },
  };

  // Store the updated context
  contextStore.set(sessionId, updatedContext);

  return updatedContext;
}

module.exports = {
  updateContext,
  getContext,
  handleClarification,
  requestClarification,
};
