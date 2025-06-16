/**
 * Browser Interface for Video System
 * 
 * Provides browser automation capabilities for video recording with green screen.
 * 
 * (c) 2025 Copyright AI Publishing International LLP All Rights Reserved.
 * Developed with assistance from the Pilots of Vision Lake.
 */

const EventEmitter = require('events');
const Page = require('./Page');

/**
 * Browser class for video recording automation
 */
class Browser extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      headless: options.headless !== false,
      viewportWidth: options.viewportWidth || 1920,
      viewportHeight: options.viewportHeight || 1080,
      greenScreenEnabled: options.greenScreenEnabled !== false,
      recordingFPS: options.recordingFPS || 30,
      ...options
    };
    
    this._pages = [];
    this._initialized = false;
    
    // Initialize browser capabilities
    this._initialize();
    
    // Handle process termination - ensures video files are properly saved
    process.on('exit', () => this.close());
  }
  
  /**
   * Initialize browser capabilities
   * @private
   */
  _initialize() {
    if (this._initialized) return;
    
    try {
      console.log('Initializing browser with options:', this.options);
      
      // Set up environment for green screen functionality
      if (this.options.greenScreenEnabled) {
        this._setupGreenScreen();
      }
      
      this._initialized = true;
      this.emit('initialized');
    } catch (error) {
      console.error('Failed to initialize browser:', error);
      this.emit('error', error);
    }
  }
  
  /**
   * Set up green screen environment
   * @private
   */
  _setupGreenScreen() {
    console.log('Setting up green screen environment');
    
    // Create green screen environment variables
    process.env.GREEN_SCREEN_ENABLED = 'true';
    process.env.CHROMA_KEY_COLOR = this.options.chromaKeyColor || '#00FF00';
    process.env.CHROMA_KEY_SIMILARITY = this.options.chromaKeySimilarity || '0.4';
    
    // Initialize WebGL context for hardware-accelerated video processing
    // This is a simulated initialization (actual implementation would use WebGL bindings)
    console.log('Green screen environment configured with chroma key:', process.env.CHROMA_KEY_COLOR);
  }
  
  /**
   * Create a new page
   * @returns {Promise<Page>} New page instance
   */
  async newPage() {
    const page = new Page(this);
    this._pages.push(page);
    
    // Configure page for default viewport
    await page.setViewport({
      width: this.options.viewportWidth,
      height: this.options.viewportHeight,
      deviceScaleFactor: 1
    });
    
    // Apply green screen background if enabled
    if (this.options.greenScreenEnabled) {
      await page.setBackgroundColor(process.env.CHROMA_KEY_COLOR);
    }
    
    return page;
  }
  
  /**
   * Close the browser and all pages
   */
  async close() {
    console.log('Closing browser and saving any recordings');
    
    // Close all pages and ensure recordings are saved
    for (const page of this._pages) {
      if (page.isRecording()) {
        await page.stopRecording();
      }
      await page.close();
    }
    
    this._pages = [];
    this._initialized = false;
    this.emit('closed');
  }
  
  /**
   * Get a list of all open pages
   * @returns {Array<Page>} List of open pages
   */
  pages() {
    return [...this._pages];
  }
  
  /**
   * Check if browser is initialized
   * @returns {boolean} True if browser is initialized
   */
  isInitialized() {
    return this._initialized;
  }
  
  /**
   * Check if green screen is enabled
   * @returns {boolean} True if green screen is enabled
   */
  isGreenScreenEnabled() {
    return this.options.greenScreenEnabled;
  }
  
  /**
   * Get browser version information
   * @returns {Object} Browser version info
   */
  version() {
    return {
      browser: 'Aixtiv Video System Browser',
      version: '2.1.0',
      capabilities: {
        greenScreen: this.options.greenScreenEnabled,
        videoRecording: true,
        fps: this.options.recordingFPS
      }
    };
  }
}

module.exports = Browser;