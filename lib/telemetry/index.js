/**
 * Telemetry wrapper for the Aixtiv CLI
 * This module provides Node.js bindings to the Go telemetry package
 */

const { execFile } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Path to the telemetry binary (will be built from the Go package)
const TELEMETRY_PATH = path.join(__dirname, '..', '..', 'telemetry', 'bin', 'telemetry-agent');

// Singleton instance
let telemetryInstance = null;

class Telemetry {
  constructor() {
    this.initialized = false;
    this.contextId = `aixtiv-cli-${process.pid}-${Date.now()}`;
    this.serviceName = 'aixtiv-cli';
    this.logEnabled = process.env.AIXTIV_TELEMETRY_ENABLED !== 'false';
    this.logFile = path.join(os.tmpdir(), `aixtiv-telemetry-${this.contextId}.log`);
  }

  /**
   * Initialize telemetry
   * @returns {Promise<boolean>} True if successful
   */
  async init() {
    if (this.initialized) {
      return true;
    }

    if (!this.logEnabled) {
      console.log('Telemetry disabled via AIXTIV_TELEMETRY_ENABLED environment variable');
      return false;
    }

    // Check if the telemetry binary exists
    try {
      if (!fs.existsSync(TELEMETRY_PATH)) {
        console.error(`Telemetry binary not found at ${TELEMETRY_PATH}. Telemetry will be disabled.`);
        return false;
      }
    } catch (error) {
      console.error(`Error checking telemetry binary: ${error.message}`);
      return false;
    }

    try {
      // Start the telemetry provider as a background process
      this.process = execFile(
        TELEMETRY_PATH, 
        ['start', '--service', this.serviceName, '--log', this.logFile],
        { detached: true }
      );

      this.process.unref(); // Allow the process to run independently

      // Wait for the log file to be created (simple way to ensure the provider is running)
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error(`Failed to initialize telemetry: ${error.message}`);
      return false;
    }
  }

  /**
   * Record a request
   * @param {string} commandName The name of the command being executed
   */
  recordRequest(commandName = 'unknown') {
    if (!this.initialized || !this.logEnabled) return;

    try {
      execFile(
        TELEMETRY_PATH,
        ['record-request', '--context-id', this.contextId, '--command', commandName],
        { detached: true }
      ).unref();
    } catch (error) {
      // Silently fail - telemetry should never break the application
    }
  }

  /**
   * Record an error
   * @param {string} commandName The name of the command that encountered an error
   * @param {Error|string} error The error object or message
   */
  recordError(commandName = 'unknown', error = '') {
    if (!this.initialized || !this.logEnabled) return;

    try {
      const errorMsg = error instanceof Error ? error.message : String(error);
      execFile(
        TELEMETRY_PATH,
        [
          'record-error', 
          '--context-id', this.contextId, 
          '--command', commandName,
          '--error', errorMsg.substring(0, 200) // Truncate long error messages
        ],
        { detached: true }
      ).unref();
    } catch (error) {
      // Silently fail - telemetry should never break the application
    }
  }

  /**
   * Record knowledge access
   * @param {string} knowledgeType Type of knowledge being accessed
   */
  recordKnowledgeAccess(knowledgeType = 'general') {
    if (!this.initialized || !this.logEnabled) return;

    try {
      execFile(
        TELEMETRY_PATH,
        ['record-knowledge', '--context-id', this.contextId, '--type', knowledgeType],
        { detached: true }
      ).unref();
    } catch (error) {
      // Silently fail - telemetry should never break the application
    }
  }

  /**
   * Record request duration
   * @param {string} commandName The name of the command
   * @param {number} durationMs Duration in milliseconds
   */
  recordDuration(commandName = 'unknown', durationMs = 0) {
    if (!this.initialized || !this.logEnabled) return;

    try {
      execFile(
        TELEMETRY_PATH,
        [
          'record-duration', 
          '--context-id', this.contextId, 
          '--command', commandName,
          '--duration', String(durationMs)
        ],
        { detached: true }
      ).unref();
    } catch (error) {
      // Silently fail - telemetry should never break the application
    }
  }

  /**
   * Gracefully shutdown telemetry. Should be called when the application exits.
   */
  async shutdown() {
    if (!this.initialized || !this.logEnabled) return;

    try {
      execFile(
        TELEMETRY_PATH,
        ['shutdown', '--context-id', this.contextId],
        { timeout: 1000 }
      );
      this.initialized = false;
    } catch (error) {
      // Silently fail - telemetry should never break the application
    }
  }
}

/**
 * Get the telemetry instance (singleton)
 * @returns {Telemetry} The telemetry instance
 */
function getTelemetry() {
  if (!telemetryInstance) {
    telemetryInstance = new Telemetry();
  }
  return telemetryInstance;
}

module.exports = {
  getTelemetry,
  init: async () => await getTelemetry().init(),
  recordRequest: (commandName) => getTelemetry().recordRequest(commandName),
  recordError: (commandName, error) => getTelemetry().recordError(commandName, error),
  recordKnowledgeAccess: (knowledgeType) => getTelemetry().recordKnowledgeAccess(knowledgeType),
  recordDuration: (commandName, durationMs) => getTelemetry().recordDuration(commandName, durationMs),
  shutdown: async () => await getTelemetry().shutdown()
};
