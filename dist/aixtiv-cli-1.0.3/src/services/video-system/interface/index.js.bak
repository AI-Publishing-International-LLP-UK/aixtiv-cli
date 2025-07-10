/**
 * Video System Interface
 * 
 * Main entry point for the video system interface components.
 * This file exports the interface components for the video system.
 * 
 * (c) 2025 Copyright AI Publishing International LLP All Rights Reserved.
 * Developed with assistance from the Pilots of Vision Lake.
 */

const Browser = require('./Browser');
const Page = require('./Page');
const NetworkRequest = require('./NetworkRequest');

/**
 * Video System Interface
 * Provides browser automation capabilities for video recording with green screen.
 */
module.exports = {
  /**
   * Browser class for video recording automation
   */
  Browser,
  
  /**
   * Page class for video recording automation
   */
  Page,
  
  /**
   * NetworkRequest class for handling network requests
   */
  NetworkRequest,
  
  /**
   * Create a new browser instance
   * @param {Object} options - Browser options
   * @returns {Browser} A new browser instance
   */
  createBrowser: (options = {}) => {
    return new Browser(options);
  },
  
  /**
   * Version information
   */
  version: {
    version: '2.1.0',
    releaseDate: '2025-05-01',
    features: [
      'Green screen recording',
      'Video composition',
      'Google Video Generation API integration'
    ]
  }
};