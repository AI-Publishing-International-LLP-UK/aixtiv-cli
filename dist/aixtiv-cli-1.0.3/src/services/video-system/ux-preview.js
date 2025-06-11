/**
 * UX Preview System for Dr. Match
 * 
 * Provides visual check overlay tools for reviewing UX screens before go-live.
 * Part of the Phase II Experience Immersion implementation.
 *
 * (c) 2025 Copyright AI Publishing International LLP All Rights Reserved.
 * Developed with assistance from the Pilots of Vision Lake.
 */

const axios = require('axios');
const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
const Interface = require('./interface');

/**
 * UX Preview service for screen assessment and review
 */
class UXPreviewService {
  constructor() {
    this.initialized = false;
    
    // Initialize Firebase Admin if not already initialized
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    
    this.db = admin.firestore();
  }
  
  /**
   * Initialize with the parent video system
   * @param {Object} videoSystem - Parent video system
   */
  async initialize(videoSystem) {
    if (this.initialized) return;
    
    this.videoSystem = videoSystem;
    await videoSystem.initialize();
    
    this.apiClient = videoSystem.videoClient;
    this.interface = new Interface.Browser();
    
    this.initialized = true;
    console.log('UX Preview system initialized successfully');
  }
  
  /**
   * Create a new UX preview session
   * 
   * @param {Object} config - Preview configuration
   * @returns {Promise<Object>} - Session details
   */
  async createPreviewSession(config) {
    if (!this.initialized) {
      throw new Error('UX Preview system not initialized');
    }
    
    try {
      // Create preview session
      const sessionData = {
        id: uuidv4(),
        userId: config.userId,
        agentId: config.agentId || 'dr-match',
        screenType: config.screenType || 'dashboard',
        deviceType: config.deviceType || 'desktop',
        checklist: config.checklist || [
          'Color contrast',
          'Element spacing',
          'Font readability',
          'Interaction elements',
          'Loading indicators',
          'Error states'
        ],
        status: 'initialized',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        settings: {
          resolution: config.resolution || '1080p',
          showGridOverlay: config.showGridOverlay !== false,
          showAccessibilityMarkers: config.showAccessibilityMarkers !== false,
          showTapTargets: config.showTapTargets !== false,
          recordUserInteractions: config.recordUserInteractions !== false
        }
      };
      
      // Store in Firestore
      await this.db.collection('ux_preview_sessions').doc(sessionData.id).set(sessionData);
      
      return sessionData;
    } catch (error) {
      console.error('Failed to create UX preview session:', error.message);
      throw error;
    }
  }
  
  /**
   * Generate UX review for a specific screen
   * 
   * @param {string} sessionId - Preview session ID
   * @param {string} screenshotUrl - URL to the screenshot or screen design
   * @param {Object} options - Review options
   * @returns {Promise<Object>} - Review details
   */
  async generateScreenReview(sessionId, screenshotUrl, options = {}) {
    if (!this.initialized) {
      throw new Error('UX Preview system not initialized');
    }
    
    try {
      // Get session data
      const sessionDoc = await this.db.collection('ux_preview_sessions').doc(sessionId).get();
      
      if (!sessionDoc.exists) {
        throw new Error(`UX preview session not found: ${sessionId}`);
      }
      
      const sessionData = sessionDoc.data();
      
      // Create review
      const reviewId = uuidv4();
      const reviewData = {
        id: reviewId,
        sessionId,
        screenshotUrl,
        name: options.name || `Screen Review ${new Date().toISOString()}`,
        description: options.description || 'Automated UX review',
        status: 'pending',
        reviewItems: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        reviewType: options.reviewType || 'standard',
        overlaySettings: {
          showGrid: options.showGrid !== false,
          showAccessibility: options.showAccessibility !== false,
          showTapTargets: options.showTapTargets !== false,
          gridColor: options.gridColor || 'rgba(0, 100, 255, 0.3)',
          gridSize: options.gridSize || 8
        }
      };
      
      // Store review in Firestore
      await this.db.collection('ux_screen_reviews').doc(reviewId).set(reviewData);
      
      // Queue the review job with the video system API
      const response = await this.apiClient.post('/ux-reviews', {
        reviewId,
        sessionId,
        screenshotUrl,
        agentId: sessionData.agentId,
        overlaySettings: reviewData.overlaySettings
      });
      
      // Update the review with job details
      await this.db.collection('ux_screen_reviews').doc(reviewId).update({
        jobId: response.data.jobId,
        status: 'processing',
        estimatedCompletionTime: response.data.estimatedCompletionTime
      });
      
      return {
        reviewId,
        jobId: response.data.jobId,
        status: 'processing',
        estimatedCompletionTime: response.data.estimatedCompletionTime
      };
    } catch (error) {
      console.error('Failed to generate screen review:', error.message);
      throw error;
    }
  }
  
  /**
   * Check the status of a UX review
   * 
   * @param {string} reviewId - Review ID
   * @returns {Promise<Object>} - Review status and results
   */
  async checkReviewStatus(reviewId) {
    if (!this.initialized) {
      throw new Error('UX Preview system not initialized');
    }
    
    try {
      // Get review data
      const reviewDoc = await this.db.collection('ux_screen_reviews').doc(reviewId).get();
      
      if (!reviewDoc.exists) {
        throw new Error(`UX review not found: ${reviewId}`);
      }
      
      const reviewData = reviewDoc.data();
      
      // Check status with video system API
      const response = await this.apiClient.get(`/ux-reviews/${reviewData.jobId}`);
      
      // Update review with latest status
      const updatedData = {
        status: response.data.status,
        progress: response.data.progress || 0,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      // If review is completed, add results
      if (response.data.status === 'completed') {
        updatedData.reviewItems = response.data.reviewItems || [];
        updatedData.overlayImageUrl = response.data.overlayImageUrl;
        updatedData.accessibilityScore = response.data.accessibilityScore;
        updatedData.usabilityScore = response.data.usabilityScore;
        updatedData.visualDesignScore = response.data.visualDesignScore;
        updatedData.overallScore = response.data.overallScore;
        updatedData.recommendations = response.data.recommendations || [];
      }
      
      // Update review in Firestore
      await this.db.collection('ux_screen_reviews').doc(reviewId).update(updatedData);
      
      return {
        reviewId,
        status: updatedData.status,
        progress: updatedData.progress,
        overlayImageUrl: updatedData.overlayImageUrl,
        scores: response.data.status === 'completed' ? {
          accessibility: updatedData.accessibilityScore,
          usability: updatedData.usabilityScore,
          visualDesign: updatedData.visualDesignScore,
          overall: updatedData.overallScore
        } : null
      };
    } catch (error) {
      console.error('Failed to check UX review status:', error.message);
      throw error;
    }
  }
  
  /**
   * Get a list of review items with overlay annotation data
   * 
   * @param {string} reviewId - Review ID
   * @returns {Promise<Array>} - Review items with annotations
   */
  async getReviewItems(reviewId) {
    if (!this.initialized) {
      throw new Error('UX Preview system not initialized');
    }
    
    try {
      // Get review data
      const reviewDoc = await this.db.collection('ux_screen_reviews').doc(reviewId).get();
      
      if (!reviewDoc.exists) {
        throw new Error(`UX review not found: ${reviewId}`);
      }
      
      const reviewData = reviewDoc.data();
      
      if (reviewData.status !== 'completed') {
        throw new Error(`UX review not completed yet: ${reviewId}`);
      }
      
      // Get all review items
      return reviewData.reviewItems.map(item => ({
        id: item.id,
        type: item.type,
        severity: item.severity,
        title: item.title,
        description: item.description,
        coordinates: item.coordinates,
        recommendations: item.recommendations
      }));
    } catch (error) {
      console.error('Failed to get UX review items:', error.message);
      throw error;
    }
  }
  
  /**
   * Generate a comparison view of before/after UX implementation
   * 
   * @param {string} beforeReviewId - Before review ID
   * @param {string} afterReviewId - After review ID
   * @returns {Promise<Object>} - Comparison result
   */
  async generateComparisonView(beforeReviewId, afterReviewId) {
    if (!this.initialized) {
      throw new Error('UX Preview system not initialized');
    }
    
    try {
      // Get both reviews
      const beforeDoc = await this.db.collection('ux_screen_reviews').doc(beforeReviewId).get();
      const afterDoc = await this.db.collection('ux_screen_reviews').doc(afterReviewId).get();
      
      if (!beforeDoc.exists || !afterDoc.exists) {
        throw new Error('One or both reviews not found');
      }
      
      // Create comparison in API
      const response = await this.apiClient.post('/ux-reviews/compare', {
        beforeReviewId,
        afterReviewId
      });
      
      // Store comparison in Firestore
      const comparisonId = uuidv4();
      await this.db.collection('ux_comparisons').doc(comparisonId).set({
        id: comparisonId,
        beforeReviewId,
        afterReviewId,
        jobId: response.data.jobId,
        status: 'processing',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return {
        comparisonId,
        jobId: response.data.jobId,
        status: 'processing',
        estimatedCompletionTime: response.data.estimatedCompletionTime
      };
    } catch (error) {
      console.error('Failed to generate comparison view:', error.message);
      throw error;
    }
  }
  
  /**
   * Live preview current UX implementation with interactive elements
   * 
   * @param {string} sessionId - Preview session ID
   * @param {string} url - URL of the live implementation to preview
   * @param {Object} options - Preview options
   * @returns {Promise<Object>} - Live preview details
   */
  async startLivePreview(sessionId, url, options = {}) {
    if (!this.initialized) {
      throw new Error('UX Preview system not initialized');
    }
    
    try {
      // Get session data
      const sessionDoc = await this.db.collection('ux_preview_sessions').doc(sessionId).get();
      
      if (!sessionDoc.exists) {
        throw new Error(`UX preview session not found: ${sessionId}`);
      }
      
      const sessionData = sessionDoc.data();
      
      // Start browser interface
      const page = await this.interface.newPage();
      
      // Set viewport based on device type
      let viewport;
      switch (options.deviceType || sessionData.deviceType) {
        case 'mobile':
          viewport = { width: 390, height: 844 };
          break;
        case 'tablet':
          viewport = { width: 768, height: 1024 };
          break;
        case 'desktop':
        default:
          viewport = { width: 1440, height: 900 };
          break;
      }
      
      await page.setViewport(viewport);
      
      // Enable grid overlay if requested
      if (options.showGrid || sessionData.settings.showGridOverlay) {
        await page.evaluateOnNewDocument(() => {
          const grid = document.createElement('div');
          grid.id = 'ux-preview-grid';
          grid.style.position = 'fixed';
          grid.style.top = '0';
          grid.style.left = '0';
          grid.style.right = '0';
          grid.style.bottom = '0';
          grid.style.zIndex = '9999';
          grid.style.pointerEvents = 'none';
          grid.style.backgroundImage = 'linear-gradient(rgba(0, 100, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 100, 255, 0.1) 1px, transparent 1px)';
          grid.style.backgroundSize = '8px 8px';
          document.body.appendChild(grid);
        });
      }
      
      // Navigate to URL
      await page.goto(url, { waitUntil: 'networkidle0' });
      
      // Take screenshot
      const screenshot = await page.screenshot({ fullPage: true });
      
      // Create preview record
      const previewId = uuidv4();
      const previewData = {
        id: previewId,
        sessionId,
        url,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'active',
        deviceType: options.deviceType || sessionData.deviceType,
        viewport,
        settings: {
          showGrid: options.showGrid || sessionData.settings.showGridOverlay,
          showAccessibility: options.showAccessibility || sessionData.settings.showAccessibilityMarkers,
          showTapTargets: options.showTapTargets || sessionData.settings.showTapTargets
        }
      };
      
      // Store in Firestore
      await this.db.collection('ux_live_previews').doc(previewId).set(previewData);
      
      // Store screenshot in Firebase Storage
      const storage = admin.storage();
      const bucket = storage.bucket();
      const file = bucket.file(`ux-previews/${previewId}/screenshot.png`);
      await file.save(screenshot);
      
      // Update with screenshot URL
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
      });
      
      await this.db.collection('ux_live_previews').doc(previewId).update({
        screenshotUrl: url
      });
      
      return {
        previewId,
        sessionId,
        url,
        status: 'active',
        screenshotUrl: url
      };
    } catch (error) {
      console.error('Failed to start live preview:', error.message);
      throw error;
    }
  }
}

// Export the UX Preview service
module.exports = new UXPreviewService();