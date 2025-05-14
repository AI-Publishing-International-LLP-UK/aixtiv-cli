/**
 * Network Request Interface for Video System
 * 
 * Provides network request handling for video recording system.
 * 
 * (c) 2025 Copyright AI Publishing International LLP All Rights Reserved.
 * Developed with assistance from the Pilots of Vision Lake.
 */

/**
 * NetworkRequest class for video recording system
 */
class NetworkRequest {
  constructor(id, url, method = 'GET', headers = {}) {
    this._id = id;
    this._url = url;
    this._method = method;
    this._headers = headers;
    this._resourceType = this._determineResourceType(url);
    this._status = 'pending';
    this._response = null;
    this._error = null;
    this._startTime = Date.now();
    this._endTime = null;
  }
  
  /**
   * Get request ID
   * @returns {string} Request ID
   */
  id() {
    return this._id;
  }
  
  /**
   * Get request URL
   * @returns {string} Request URL
   */
  url() {
    return this._url;
  }
  
  /**
   * Get request method
   * @returns {string} HTTP method
   */
  method() {
    return this._method;
  }
  
  /**
   * Get request headers
   * @returns {Object} Headers object
   */
  headers() {
    return { ...this._headers };
  }
  
  /**
   * Get resource type
   * @returns {string} Resource type
   */
  resourceType() {
    return this._resourceType;
  }
  
  /**
   * Get request status
   * @returns {string} Status ('pending', 'completed', 'failed')
   */
  status() {
    return this._status;
  }
  
  /**
   * Get response if available
   * @returns {Object|null} Response object or null
   */
  response() {
    return this._response;
  }
  
  /**
   * Get error if request failed
   * @returns {Error|null} Error object or null
   */
  error() {
    return this._error;
  }
  
  /**
   * Get request start time
   * @returns {number} Start time in milliseconds
   */
  startTime() {
    return this._startTime;
  }
  
  /**
   * Get request end time
   * @returns {number|null} End time in milliseconds or null if not completed
   */
  endTime() {
    return this._endTime;
  }
  
  /**
   * Mark request as completed with response
   * @param {Object} response - Response object
   */
  complete(response) {
    this._status = 'completed';
    this._response = response;
    this._endTime = Date.now();
  }
  
  /**
   * Mark request as failed with error
   * @param {Error} error - Error object
   */
  fail(error) {
    this._status = 'failed';
    this._error = error;
    this._endTime = Date.now();
  }
  
  /**
   * Determine resource type based on URL and headers
   * @param {string} url - Request URL
   * @returns {string} Resource type
   * @private
   */
  _determineResourceType(url) {
    const extension = url.split('.').pop().toLowerCase();
    
    // Map extensions to resource types
    const resourceTypeMap = {
      'png': 'image',
      'jpg': 'image',
      'jpeg': 'image',
      'gif': 'image',
      'webp': 'image',
      'svg': 'image',
      
      'css': 'stylesheet',
      
      'js': 'script',
      
      'mp4': 'media',
      'webm': 'media',
      'mp3': 'media',
      'wav': 'media',
      'ogg': 'media',
      
      'ttf': 'font',
      'woff': 'font',
      'woff2': 'font',
      'eot': 'font',
      'otf': 'font',
      
      'json': 'fetch',
      'xml': 'fetch'
    };
    
    return resourceTypeMap[extension] || 'document';
  }
  
  /**
   * Is this a navigation request
   * @returns {boolean} True if this is a navigation request
   */
  isNavigationRequest() {
    return this._resourceType === 'document';
  }
  
  /**
   * Is this request finished
   * @returns {boolean} True if request is completed or failed
   */
  isFinished() {
    return this._status === 'completed' || this._status === 'failed';
  }
}

module.exports = NetworkRequest;