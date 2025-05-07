/**
 * Telemetry Configuration for Aixtiv CLI
 * 
 * This file contains the default configuration for telemetry in Aixtiv CLI.
 * You can modify these settings to customize telemetry behavior.
 */

module.exports = {
  /**
   * Whether telemetry is enabled by default.
   * Can be overridden with AIXTIV_TELEMETRY_ENABLED environment variable.
   */
  enabled: true,
  
  /**
   * Whether to show verbose telemetry logs.
   * Can be overridden with AIXTIV_TELEMETRY_VERBOSE environment variable.
   */
  verbose: false,
  
  /**
   * Service name for telemetry identification.
   */
  serviceName: 'aixtiv-cli',
  
  /**
   * Log configuration
   */
  logs: {
    /**
     * Directory for telemetry logs.
     * Set to null to use system temp directory.
     */
    directory: null,
    
    /**
     * Log retention in days.
     * Logs older than this will be deleted during CLI startup.
     * Set to 0 to disable log rotation.
     */
    retention: 7,
    
    /**
     * Maximum log size in megabytes.
     * Logs larger than this will be rotated.
     */
    maxSize: 10
  },
  
  /**
   * Performance metrics collection configuration
   */
  metrics: {
    /**
     * Whether to collect command duration metrics.
     */
    trackDuration: true,
    
    /**
     * Whether to collect resource usage metrics (CPU, memory).
     */
    trackResources: false,
    
    /**
     * Sampling rate for high-frequency commands (0-1).
     * 1 means track every command, 0.5 means track 50% of commands.
     */
    sampling: 1
  },
  
  /**
   * Error tracking configuration
   */
  errors: {
    /**
     * Whether to collect stack traces for errors.
     */
    collectStackTraces: true,
    
    /**
     * Whether to track warning-level issues.
     */
    trackWarnings: false
  },
  
  /**
   * Knowledge access tracking configuration
   */
  knowledge: {
    /**
     * Whether to track knowledge access operations.
     */
    trackAccess: true,
    
    /**
     * Types of knowledge stores to track.
     */
    stores: ['firebase', 'local', 'api', 'ai-model']
  }
};
