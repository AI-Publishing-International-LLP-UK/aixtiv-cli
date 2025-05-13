/**
 * Dream Commander - Entry Point
 * 
 * Main entry point for the Dream Commander system, providing
 * centralized access to all components and subsystems.
 * 
 * (c) 2025 Copyright AI Publishing International LLP All Rights Reserved.
 */

// Core API Adapter - primary interface for CLI and external systems
const apiAdapter = require('./core/api-adapter');

// Export Dream Commander API
module.exports = {
  /**
   * API object for direct interaction with Dream Commander
   */
  api: apiAdapter,
  
  /**
   * Initialize all Dream Commander components
   * @param {Object} options - Initialization options
   * @returns {Promise<Object>} - Initialization result
   */
  async initialize(options = {}) {
    console.log('Initializing Dream Commander system...');
    
    try {
      // Initialize API adapter
      await apiAdapter.initialize();
      
      return {
        success: true,
        message: 'Dream Commander system initialized successfully'
      };
    } catch (error) {
      console.error('Failed to initialize Dream Commander system:', error.message);
      
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Submit a message to Dream Commander
   * @param {Object} message - Message content
   * @param {Object} options - Submission options
   * @returns {Promise<Object>} - Submission result
   */
  async submitMessage(message, options = {}) {
    return apiAdapter.submitMessage(message, options);
  },
  
  /**
   * Get a message by ID
   * @param {string} messageId - Message ID
   * @returns {Promise<Object>} - Message object
   */
  async getMessage(messageId) {
    return apiAdapter.getMessage(messageId);
  },
  
  /**
   * Get recent messages
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Messages
   */
  async getRecentMessages(options = {}) {
    return apiAdapter.getRecentMessages(options);
  },
  
  /**
   * Get message statistics
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Statistics
   */
  async getMessageStats(options = {}) {
    return apiAdapter.getMessageStats(options);
  },
  
  /**
   * Get system configuration
   * @returns {Promise<Object>} - Configuration
   */
  async getConfiguration() {
    return apiAdapter.getConfiguration();
  },
  
  /**
   * Update system configuration
   * @param {Object} config - New configuration
   * @returns {Promise<Object>} - Update result
   */
  async updateConfiguration(config) {
    return apiAdapter.updateConfiguration(config);
  }
};