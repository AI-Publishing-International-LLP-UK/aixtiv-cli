/**
 * Universal Dispatcher for Aixtiv CLI
 *
 * This module serves as the central hub for routing user prompts and requests
 * to appropriate handlers, agents, and services within the Aixtiv ecosystem.
 * It implements the Owner-Subscriber pattern to enable efficient real-time
 * communication between components.
 *
 * @module universalDispatcher
 * @author AI Publishing International LLP
 * @copyright 2025 AI Publishing International LLP
 * @version 1.0.0
 */

// Firebase and third-party dependencies
const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

// Internal dependencies
const telemetry = require('../../lib/telemetry');
const { getAgentById } = require('../../lib/agent-tracking');

// Initialize collections if needed
let db;
try {
  db = admin.firestore();
} catch (error) {
  console.error('Firestore initialization error in universalDispatcher:', error.message);
}

/**
 * Dispatcher configuration and constants
 */
const DISPATCHER_CONFIG = {
  PROMPT_COLLECTION: 'unified_prompts',
  RUNS_COLLECTION: 'prompt_runs',
  HISTORY_COLLECTION: 'chat_history',
  RESULT_COLLECTION: 'chain_results',
  DEFAULT_TIMEOUT: 60000, // 60 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
};

/**
 * Supported agent types for routing
 */
const AGENT_TYPES = {
  CLAUDE: 'claude',
  DR_MATCH: 'dr-match',
  LUCY: 'lucy',
  ROARK: 'roark',
  GENERAL: 'general',
};

/**
 * Dispatch status values
 */
const DISPATCH_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  TIMEOUT: 'timeout',
};

/**
 * Core Universal Dispatcher class implementing the Owner-Subscriber pattern
 */
class UniversalDispatcher {
  constructor() {
    this.subscribers = new Map();
    this.activeDispatches = new Map();
    this.dispatchHistory = [];
    this.maxHistoryLength = 100; // Keep the last 100 dispatches in memory
  }

  /**
   * Register a subscriber to receive dispatch results
   * @param {string} subscriberId - Unique identifier for the subscriber
   * @param {Function} callback - Callback function to receive dispatch updates
   * @returns {string} - The subscriber ID
   */
  subscribe(subscriberId = null, callback) {
    const id = subscriberId || uuidv4();

    if (typeof callback !== 'function') {
      throw new Error('Subscriber callback must be a function');
    }

    this.subscribers.set(id, callback);

    // Log subscription for telemetry
    telemetry.recordKnowledgeAccess('dispatcher_subscription');

    return id;
  }

  /**
   * Unregister a subscriber
   * @param {string} subscriberId - ID of the subscriber to remove
   * @returns {boolean} - Whether the unsubscription was successful
   */
  unsubscribe(subscriberId) {
    return this.subscribers.delete(subscriberId);
  }

  /**
   * Notify all subscribers or specific subscriber about a dispatch update
   * @param {Object} data - The data to send to subscribers
   * @param {string} [specificSubscriberId] - Optional specific subscriber to notify
   */
  notifySubscribers(data, specificSubscriberId = null) {
    if (specificSubscriberId) {
      const callback = this.subscribers.get(specificSubscriberId);
      if (callback) {
        callback(data);
      }
      return;
    }

    // Notify all subscribers
    for (const [, callback] of this.subscribers) {
      callback(data);
    }
  }

  /**
   * Dispatch a prompt to the appropriate handler
   * @param {Object} promptData - The prompt data to dispatch
   * @param {string} promptData.type - Type of prompt (text, agent, chain, etc.)
   * @param {string} promptData.content - The actual prompt content
   * @param {Object} options - Additional options for the dispatch
   * @returns {Promise<Object>} - The dispatch result
   */
  async dispatch(promptData, options = {}) {
    // Generate a unique dispatch ID
    const dispatchId = options.dispatchId || uuidv4();

    // Initialize dispatch tracking
    const dispatchInfo = {
      id: dispatchId,
      status: DISPATCH_STATUS.PENDING,
      timestamp: new Date().toISOString(),
      prompt: promptData,
      options,
      result: null,
      error: null,
    };

    // Add to active dispatches
    this.activeDispatches.set(dispatchId, dispatchInfo);

    // Save to Firestore if available
    if (db) {
      try {
        await db
          .collection(DISPATCHER_CONFIG.RUNS_COLLECTION)
          .doc(dispatchId)
          .set({
            ...dispatchInfo,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
      } catch (error) {
        console.error('Error saving dispatch to Firestore:', error);
        // Continue even if Firestore save fails
      }
    }

    // Log dispatch for telemetry
    telemetry.recordRequest('universal_dispatch');

    try {
      // Update status to processing
      dispatchInfo.status = DISPATCH_STATUS.PROCESSING;
      this.notifySubscribers({ type: 'status_update', data: dispatchInfo });
      this.updateDispatchInfo(dispatchId, { status: DISPATCH_STATUS.PROCESSING });

      // Determine the appropriate handler based on prompt type
      let result;

      // Execute the dispatch with timeout
      const timeoutDuration = options.timeout || DISPATCHER_CONFIG.DEFAULT_TIMEOUT;

      result = await this.executeWithTimeout(
        this.routeDispatch(promptData, options),
        timeoutDuration,
        dispatchId
      );

      // Update with success result
      dispatchInfo.status = DISPATCH_STATUS.COMPLETED;
      dispatchInfo.result = result;

      // Add to history and trim if needed
      this.dispatchHistory.unshift({ ...dispatchInfo });
      if (this.dispatchHistory.length > this.maxHistoryLength) {
        this.dispatchHistory.pop();
      }

      // Notify subscribers
      this.notifySubscribers({ type: 'dispatch_complete', data: dispatchInfo });

      // Remove from active dispatches
      this.activeDispatches.delete(dispatchId);

      // Update in Firestore
      this.updateDispatchInfo(dispatchId, {
        status: DISPATCH_STATUS.COMPLETED,
        result,
        completedAt: new Date().toISOString(),
      });

      return { success: true, dispatchId, result };
    } catch (error) {
      // Handle error case
      dispatchInfo.status = DISPATCH_STATUS.FAILED;
      dispatchInfo.error = error.message || 'Unknown error in dispatch';

      // Notify subscribers about error
      this.notifySubscribers({ type: 'dispatch_error', data: dispatchInfo });

      // Log error for telemetry
      telemetry.recordError('universal_dispatch', error);

      // Update in Firestore
      this.updateDispatchInfo(dispatchId, {
        status: DISPATCH_STATUS.FAILED,
        error: dispatchInfo.error,
        completedAt: new Date().toISOString(),
      });

      // Remove from active dispatches
      this.activeDispatches.delete(dispatchId);

      return { success: false, dispatchId, error: dispatchInfo.error };
    }
  }

  /**
   * Execute a promise with a timeout
   * @param {Promise} promise - The promise to execute
   * @param {number} timeoutMs - Timeout in milliseconds
   * @param {string} dispatchId - The ID of the dispatch
   * @returns {Promise} - The result of the promise or a timeout error
   */
  executeWithTimeout(promise, timeoutMs, dispatchId) {
    return new Promise((resolve, reject) => {
      // Set timeout
      const timeoutId = setTimeout(() => {
        // Update the dispatch status to timeout
        this.updateDispatchInfo(dispatchId, { status: DISPATCH_STATUS.TIMEOUT });

        // Notify subscribers about timeout
        const dispatchInfo = this.activeDispatches.get(dispatchId);
        if (dispatchInfo) {
          dispatchInfo.status = DISPATCH_STATUS.TIMEOUT;
          this.notifySubscribers({ type: 'dispatch_timeout', data: dispatchInfo });
        }

        reject(new Error(`Dispatch timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      // Execute the promise
      promise
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Route the dispatch to the appropriate handler
   * @param {Object} promptData - The prompt data
   * @param {Object} options - Additional options
   * @returns {Promise} - The result of the handler
   */
  async routeDispatch(promptData, options) {
    const { type, content, agentId, targetId } = promptData;

    // Handle different types of prompts
    switch (type) {
      case 'agent_request':
        return this.handleAgentRequest(content, agentId, options);

      case 'chain_execution':
        return this.handleChainExecution(content, options);

      case 'copilot_interaction':
        return this.handleCopilotInteraction(content, targetId, options);

      case 'dr_match_brainstorm':
        return this.handleDrMatchBrainstorm(content, options);

      case 'canva_render':
        return this.handleCanvaRender(content, options);

      default:
        return this.handleGenericPrompt(content, options);
    }
  }

  /**
   * Handle a request targeted at a specific agent
   * @param {string} content - The prompt content
   * @param {string} agentId - The target agent ID
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - The agent response
   */
  async handleAgentRequest(content, agentId, options) {
    // Get agent information
    const agent = await getAgentById(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // Send request to appropriate agent endpoint
    const agentEndpoint = agent.endpoint || process.env.DEFAULT_AGENT_ENDPOINT;

    try {
      const response = await axios.post(agentEndpoint, {
        prompt: content,
        agentId,
        options,
      });

      return response.data;
    } catch (error) {
      throw new Error(`Agent request failed: ${error.message}`);
    }
  }

  /**
   * Handle execution of a processing chain (multi-step workflow)
   * @param {Object} chainConfig - The chain configuration
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - The chain result
   */
  async handleChainExecution(chainConfig, options) {
    // Implementation for chain execution
    // Would integrate with LangChain or similar workflow system
    return { message: 'Chain execution not fully implemented yet' };
  }

  /**
   * Handle interaction with a bonded copilot
   * @param {string} content - The prompt content
   * @param {string} targetId - The target copilot ID
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - The copilot response
   */
  async handleCopilotInteraction(content, targetId, options) {
    // Implementation for copilot interaction
    return { message: 'Copilot interaction not fully implemented yet' };
  }

  /**
   * Handle Dr. Match brainstorming request
   * @param {Object} brainstormData - The brainstorm request data
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - The brainstorm result
   */
  async handleDrMatchBrainstorm(brainstormData, options) {
    // Implementation for Dr. Match brainstorming
    return { message: 'Dr. Match brainstorming not fully implemented yet' };
  }

  /**
   * Handle Canva rendering request
   * @param {Object} renderData - The render request data
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - The render result
   */
  async handleCanvaRender(renderData, options) {
    // Implementation for Canva rendering
    return { message: 'Canva rendering not fully implemented yet' };
  }

  /**
   * Handle generic prompt request
   * @param {string} content - The prompt content
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - The response
   */
  async handleGenericPrompt(content, options) {
    // Implementation for generic prompts
    // Could route to a default AI service or process based on content analysis
    return { message: 'Generic prompt handled successfully', content };
  }

  /**
   * Update dispatch information in memory and Firestore
   * @param {string} dispatchId - ID of the dispatch to update
   * @param {Object} updateData - Data to update
   */
  async updateDispatchInfo(dispatchId, updateData) {
    // Update in memory
    const dispatchInfo = this.activeDispatches.get(dispatchId);
    if (dispatchInfo) {
      Object.assign(dispatchInfo, updateData);
    }

    // Update in Firestore if available
    if (db) {
      try {
        await db
          .collection(DISPATCHER_CONFIG.RUNS_COLLECTION)
          .doc(dispatchId)
          .update({
            ...updateData,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
      } catch (error) {
        console.error('Error updating dispatch in Firestore:', error);
        // Continue even if Firestore update fails
      }
    }
  }

  /**
   * Get dispatch status by ID
   * @param {string} dispatchId - ID of the dispatch to check
   * @returns {Promise<Object>} - The dispatch status
   */
  async getDispatchStatus(dispatchId) {
    // Check active dispatches first
    if (this.activeDispatches.has(dispatchId)) {
      return this.activeDispatches.get(dispatchId);
    }

    // Check history
    const historyItem = this.dispatchHistory.find((item) => item.id === dispatchId);
    if (historyItem) {
      return historyItem;
    }

    // Check Firestore if available
    if (db) {
      try {
        const doc = await db.collection(DISPATCHER_CONFIG.RUNS_COLLECTION).doc(dispatchId).get();
        if (doc.exists) {
          return doc.data();
        }
      } catch (error) {
        console.error('Error fetching dispatch from Firestore:', error);
      }
    }

    return null;
  }

  /**
   * Cancel an active dispatch
   * @param {string} dispatchId - ID of the dispatch to cancel
   * @returns {boolean} - Whether the cancellation was successful
   */
  cancelDispatch(dispatchId) {
    if (!this.activeDispatches.has(dispatchId)) {
      return false;
    }

    const dispatchInfo = this.activeDispatches.get(dispatchId);
    dispatchInfo.status = DISPATCH_STATUS.FAILED;
    dispatchInfo.error = 'Dispatch cancelled by user';

    // Notify subscribers about cancellation
    this.notifySubscribers({ type: 'dispatch_cancelled', data: dispatchInfo });

    // Update in Firestore
    this.updateDispatchInfo(dispatchId, {
      status: DISPATCH_STATUS.FAILED,
      error: dispatchInfo.error,
      completedAt: new Date().toISOString(),
    });

    // Remove from active dispatches
    this.activeDispatches.delete(dispatchId);

    return true;
  }
}

// Create singleton instance
const dispatcher = new UniversalDispatcher();

/**
 * Export as module and initialize as Firebase function
 */
module.exports = {
  dispatcher,

  // Function handlers for direct integration with Firebase Cloud Functions
  handleDispatch: async (data, context) => {
    // Validate authentication if needed
    if (context && !context.auth) {
      throw new Error('Unauthorized access to dispatch function');
    }

    return dispatcher.dispatch(data.promptData, data.options);
  },

  // Direct integration with CLI
  dispatchFromCLI: async (promptData, options) => {
    return dispatcher.dispatch(promptData, options);
  },
};
