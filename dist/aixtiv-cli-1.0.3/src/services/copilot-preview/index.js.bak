/**
 * Copilot Response Preview Service
 * 
 * Provides transparent previewing of copilot responses before they are sent.
 * Part of the Phase II Experience Immersion implementation for 
 * "Copilot response preview panel with 'this is what the agent sees' transparency"
 *
 * (c) 2025 Copyright AI Publishing International LLP All Rights Reserved.
 * Developed with assistance from the Pilots of Vision Lake.
 */

const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const speechService = require('../speech');

class CopilotPreviewService {
  constructor() {
    this.initialized = false;
    
    // Initialize Firebase Admin if not already initialized
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    
    this.db = admin.firestore();
    this.previewHistoryCache = {};
  }
  
  /**
   * Initialize the preview service
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      await speechService.initialize();
      this.speechService = speechService;
      
      // Create preview collections if they don't exist
      const collections = ['copilot_previews', 'user_preview_settings', 'preview_feedback'];
      
      for (const collection of collections) {
        try {
          await this.db.collection(collection).limit(1).get();
        } catch (error) {
          console.warn(`Collection ${collection} does not exist. It will be created on first write.`);
        }
      }
      
      this.initialized = true;
      console.log('Copilot Preview Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Copilot Preview Service:', error.message);
      throw error;
    }
  }
  
  /**
   * Create a preview for a copilot response
   * 
   * @param {string} userId - User ID
   * @param {string} copilotId - Copilot ID
   * @param {string} message - User's message
   * @param {string} responseText - Response to preview
   * @param {Object} options - Preview options
   * @returns {Promise<Object>} - Preview details
   */
  async createPreview(userId, copilotId, message, responseText, options = {}) {
    await this.initialize();
    
    try {
      // Get user preview settings
      const settings = await this.getUserSettings(userId) || {
        showEmotionIndicators: true,
        showToneSuggestions: true,
        showAIThinking: true,
        transparencyLevel: 'medium',
      };
      
      // Generate preview data
      const previewId = uuidv4();
      const timestamp = admin.firestore.FieldValue.serverTimestamp();
      
      // Analyze sentiment of user message
      const messageSentiment = options.sentiment || await this.speechService.analyzeSentiment(message);
      
      // Generate AI thought process (if enabled)
      let aiThinking = null;
      if (settings.showAIThinking) {
        aiThinking = await this._generateAIThinking(message, responseText, messageSentiment);
      }
      
      // Generate tone analysis and suggestions
      const toneAnalysis = await this._analyzeTone(responseText);
      
      // Create preview data
      const previewData = {
        id: previewId,
        userId,
        copilotId,
        userMessage: message,
        responseText,
        messageSentiment,
        toneAnalysis,
        aiThinking,
        timestamp,
        settings: {
          ...settings,
          ...options.settings
        },
        status: 'active',
        edited: false,
        approved: false,
        changesRequested: false
      };
      
      // Store in Firestore
      await this.db.collection('copilot_previews').doc(previewId).set(previewData);
      
      // Update preview history cache
      if (!this.previewHistoryCache[userId]) {
        this.previewHistoryCache[userId] = [];
      }
      
      this.previewHistoryCache[userId].unshift({
        id: previewId,
        timestamp: new Date(),
        userMessage: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
        copilotId
      });
      
      // Only keep the last 10 preview IDs in cache
      if (this.previewHistoryCache[userId].length > 10) {
        this.previewHistoryCache[userId].pop();
      }
      
      return {
        previewId,
        responseText,
        messageSentiment,
        toneAnalysis: toneAnalysis ? {
          tone: toneAnalysis.tone,
          confidence: toneAnalysis.confidence
        } : null,
        hasAIThinking: !!aiThinking
      };
    } catch (error) {
      console.error('Failed to create copilot response preview:', error.message);
      throw error;
    }
  }
  
  /**
   * Get preview details
   * 
   * @param {string} previewId - Preview ID
   * @returns {Promise<Object>} - Preview details
   */
  async getPreview(previewId) {
    await this.initialize();
    
    try {
      const doc = await this.db.collection('copilot_previews').doc(previewId).get();
      
      if (!doc.exists) {
        throw new Error(`Preview not found: ${previewId}`);
      }
      
      return doc.data();
    } catch (error) {
      console.error('Failed to get preview:', error.message);
      throw error;
    }
  }
  
  /**
   * Approve a copilot response preview
   * 
   * @param {string} previewId - Preview ID
   * @param {Object} options - Approval options
   * @returns {Promise<Object>} - Updated preview
   */
  async approvePreview(previewId, options = {}) {
    await this.initialize();
    
    try {
      // Get preview
      const doc = await this.db.collection('copilot_previews').doc(previewId).get();
      
      if (!doc.exists) {
        throw new Error(`Preview not found: ${previewId}`);
      }
      
      const preview = doc.data();
      
      // Update preview
      await this.db.collection('copilot_previews').doc(previewId).update({
        approved: true,
        changesRequested: false,
        approvedAt: admin.firestore.FieldValue.serverTimestamp(),
        approvalNote: options.note || ''
      });
      
      return {
        ...preview,
        approved: true,
        changesRequested: false,
        approvedAt: new Date(),
        approvalNote: options.note || ''
      };
    } catch (error) {
      console.error('Failed to approve preview:', error.message);
      throw error;
    }
  }
  
  /**
   * Request changes to a copilot response preview
   * 
   * @param {string} previewId - Preview ID
   * @param {string} feedback - Feedback for changes
   * @param {Object} options - Change request options
   * @returns {Promise<Object>} - Updated preview
   */
  async requestChanges(previewId, feedback, options = {}) {
    await this.initialize();
    
    try {
      // Get preview
      const doc = await this.db.collection('copilot_previews').doc(previewId).get();
      
      if (!doc.exists) {
        throw new Error(`Preview not found: ${previewId}`);
      }
      
      const preview = doc.data();
      
      // Update preview
      await this.db.collection('copilot_previews').doc(previewId).update({
        approved: false,
        changesRequested: true,
        changeRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
        feedback,
        changeOptions: options.changeOptions || []
      });
      
      return {
        ...preview,
        approved: false,
        changesRequested: true,
        changeRequestedAt: new Date(),
        feedback,
        changeOptions: options.changeOptions || []
      };
    } catch (error) {
      console.error('Failed to request changes to preview:', error.message);
      throw error;
    }
  }
  
  /**
   * Edit a copilot response preview
   * 
   * @param {string} previewId - Preview ID
   * @param {string} editedText - Edited response text
   * @returns {Promise<Object>} - Updated preview
   */
  async editPreview(previewId, editedText) {
    await this.initialize();
    
    try {
      // Get preview
      const doc = await this.db.collection('copilot_previews').doc(previewId).get();
      
      if (!doc.exists) {
        throw new Error(`Preview not found: ${previewId}`);
      }
      
      const preview = doc.data();
      
      // Generate tone analysis for edited text
      const toneAnalysis = await this._analyzeTone(editedText);
      
      // Update preview
      await this.db.collection('copilot_previews').doc(previewId).update({
        responseText: editedText,
        originalText: preview.edited ? preview.originalText : preview.responseText,
        edited: true,
        editedAt: admin.firestore.FieldValue.serverTimestamp(),
        toneAnalysis
      });
      
      return {
        ...preview,
        responseText: editedText,
        originalText: preview.edited ? preview.originalText : preview.responseText,
        edited: true,
        editedAt: new Date(),
        toneAnalysis
      };
    } catch (error) {
      console.error('Failed to edit preview:', error.message);
      throw error;
    }
  }
  
  /**
   * Get user preview settings
   * 
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - User settings
   */
  async getUserSettings(userId) {
    await this.initialize();
    
    try {
      const doc = await this.db.collection('user_preview_settings').doc(userId).get();
      
      if (!doc.exists) {
        // Create default settings
        const defaultSettings = {
          userId,
          showEmotionIndicators: true,
          showToneSuggestions: true,
          showAIThinking: true,
          transparencyLevel: 'medium', // low, medium, high
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        await this.db.collection('user_preview_settings').doc(userId).set(defaultSettings);
        
        return defaultSettings;
      }
      
      return doc.data();
    } catch (error) {
      console.error('Failed to get user preview settings:', error.message);
      return null;
    }
  }
  
  /**
   * Update user preview settings
   * 
   * @param {string} userId - User ID
   * @param {Object} settings - New settings
   * @returns {Promise<Object>} - Updated settings
   */
  async updateUserSettings(userId, settings) {
    await this.initialize();
    
    try {
      // Get current settings
      const currentSettings = await this.getUserSettings(userId) || {};
      
      // Update settings
      const updatedSettings = {
        ...currentSettings,
        ...settings,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      await this.db.collection('user_preview_settings').doc(userId).set(updatedSettings);
      
      return updatedSettings;
    } catch (error) {
      console.error('Failed to update user preview settings:', error.message);
      throw error;
    }
  }
  
  /**
   * Get user preview history
   * 
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Preview history
   */
  async getPreviewHistory(userId, options = {}) {
    await this.initialize();
    
    try {
      // Check cache first
      if (this.previewHistoryCache[userId] && !options.skipCache) {
        return this.previewHistoryCache[userId];
      }
      
      // Build query
      let query = this.db.collection('copilot_previews')
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc');
        
      if (options.limit) {
        query = query.limit(options.limit);
      } else {
        query = query.limit(10); // Default limit
      }
      
      if (options.copilotId) {
        query = query.where('copilotId', '==', options.copilotId);
      }
      
      // Execute query
      const querySnapshot = await query.get();
      
      // Extract preview data
      const previews = [];
      querySnapshot.forEach(doc => {
        const data = doc.data();
        previews.push({
          id: data.id,
          timestamp: data.timestamp ? data.timestamp.toDate() : new Date(),
          userMessage: data.userMessage.substring(0, 50) + (data.userMessage.length > 50 ? '...' : ''),
          copilotId: data.copilotId,
          approved: data.approved,
          edited: data.edited
        });
      });
      
      // Update cache
      this.previewHistoryCache[userId] = previews;
      
      return previews;
    } catch (error) {
      console.error('Failed to get preview history:', error.message);
      throw error;
    }
  }
  
  /**
   * Submit feedback on a copilot response
   * 
   * @param {string} previewId - Preview ID
   * @param {string} userId - User ID
   * @param {string} feedbackType - Feedback type (helpful, not-helpful, tone-issue, etc.)
   * @param {string} comment - Optional comment
   * @returns {Promise<Object>} - Feedback details
   */
  async submitFeedback(previewId, userId, feedbackType, comment) {
    await this.initialize();
    
    try {
      // Create feedback ID
      const feedbackId = uuidv4();
      
      // Create feedback data
      const feedbackData = {
        id: feedbackId,
        previewId,
        userId,
        feedbackType,
        comment: comment || '',
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      };
      
      // Store in Firestore
      await this.db.collection('preview_feedback').doc(feedbackId).set(feedbackData);
      
      // Update the preview feedback count
      await this.db.collection('copilot_previews').doc(previewId).update({
        [`feedbackCounts.${feedbackType}`]: admin.firestore.FieldValue.increment(1)
      });
      
      return feedbackData;
    } catch (error) {
      console.error('Failed to submit feedback:', error.message);
      throw error;
    }
  }
  
  /**
   * Generate AI thinking process for transparency
   * 
   * @param {string} message - User message
   * @param {string} responseText - Response text
   * @param {Object} sentiment - Message sentiment analysis
   * @returns {Promise<Object>} - AI thinking process
   * @private
   */
  async _generateAIThinking(message, responseText, sentiment) {
    // NOTE: In a production implementation, this would use a more sophisticated
    // approach with a language model API, but this is a simplified version
    
    try {
      const thinking = {
        steps: [
          {
            step: 'message_analysis',
            description: 'Analyzing user message content and intent',
            details: `Message length: ${message.length} characters. Primary intent detected: ${this._detectIntent(message)}.`
          },
          {
            step: 'sentiment_analysis',
            description: 'Evaluating message sentiment and emotional context',
            details: `Detected sentiment: ${sentiment.category} (score: ${sentiment.score.toFixed(2)}, magnitude: ${sentiment.magnitude.toFixed(2)})`
          },
          {
            step: 'knowledge_retrieval',
            description: 'Retrieving relevant knowledge and context',
            details: 'Accessing agent knowledge base and previous conversation history'
          },
          {
            step: 'response_generation',
            description: 'Generating appropriate response',
            details: `Generated response with ${responseText.length} characters, considering emotional context and required information`
          },
          {
            step: 'response_refinement',
            description: 'Refining response for tone and clarity',
            details: 'Adjusting language patterns to maintain consistency and appropriate tone'
          }
        ],
        reasoning: this._generateReasoning(message, sentiment),
        considerations: [
          'User's emotional state and needs',
          'Relevant contextual information',
          'Appropriate tone and language style',
          'Accuracy and helpfulness of information',
          'Potential follow-up questions'
        ]
      };
      
      return thinking;
    } catch (error) {
      console.error('Failed to generate AI thinking:', error.message);
      return null;
    }
  }
  
  /**
   * Detect intent from message
   * @param {string} message - User message
   * @returns {string} - Detected intent
   * @private
   */
  _detectIntent(message) {
    // Simplified intent detection
    const messageLC = message.toLowerCase();
    
    if (messageLC.includes('?') || messageLC.includes('how') || messageLC.includes('what') || messageLC.includes('why')) {
      return 'Question';
    } else if (messageLC.includes('help') || messageLC.includes('please') || messageLC.includes('need')) {
      return 'Request for assistance';
    } else if (messageLC.includes('thank') || messageLC.includes('appreciate') || messageLC.includes('grateful')) {
      return 'Appreciation';
    } else if (messageLC.includes('problem') || messageLC.includes('issue') || messageLC.includes('error') || messageLC.includes('wrong')) {
      return 'Problem report';
    } else {
      return 'Information sharing';
    }
  }
  
  /**
   * Generate reasoning for AI thinking
   * @param {string} message - User message
   * @param {Object} sentiment - Message sentiment
   * @returns {string} - Generated reasoning
   * @private
   */
  _generateReasoning(message, sentiment) {
    // Generate basic reasoning based on sentiment
    let reasoning = 'Based on the user message, ';
    
    if (sentiment.category === 'positive') {
      reasoning += 'the user appears to be in a positive emotional state. ';
      reasoning += 'A supportive and encouraging tone is appropriate. ';
    } else if (sentiment.category === 'negative') {
      reasoning += 'the user may be experiencing frustration or concern. ';
      reasoning += 'An empathetic and solution-focused tone is appropriate. ';
    } else {
      reasoning += 'the user has a neutral emotional tone. ';
      reasoning += 'A balanced, informative approach is appropriate. ';
    }
    
    // Add intent-based reasoning
    const intent = this._detectIntent(message);
    reasoning += `The user appears to be ${intent.toLowerCase()}, `;
    
    if (intent === 'Question') {
      reasoning += 'so providing a clear, direct answer with relevant context is optimal.';
    } else if (intent === 'Request for assistance') {
      reasoning += 'so offering specific help and actionable steps would be most valuable.';
    } else if (intent === 'Appreciation') {
      reasoning += 'so acknowledging their gratitude and offering further assistance would be appropriate.';
    } else if (intent === 'Problem report') {
      reasoning += 'so validating their concern, showing understanding, and providing troubleshooting steps is important.';
    } else {
      reasoning += 'so acknowledging their information and building upon it would create a natural conversation flow.';
    }
    
    return reasoning;
  }
  
  /**
   * Analyze tone of text
   * @param {string} text - Text to analyze
   * @returns {Promise<Object>} - Tone analysis
   * @private
   */
  async _analyzeTone(text) {
    try {
      // Simplified tone analysis
      const tones = [
        { name: 'formal', keywords: ['therefore', 'furthermore', 'subsequently', 'accordingly', 'thus', 'hence'] },
        { name: 'friendly', keywords: ['hi', 'hello', 'thanks', 'appreciate', 'glad', 'happy', '!'] },
        { name: 'informative', keywords: ['information', 'data', 'research', 'analysis', 'report', 'statistics'] },
        { name: 'empathetic', keywords: ['understand', 'feel', 'sorry', 'empathize', 'difficult', 'challenging'] },
        { name: 'enthusiastic', keywords: ['amazing', 'exciting', 'fantastic', 'great', 'excellent', '!'] },
        { name: 'technical', keywords: ['system', 'function', 'process', 'technical', 'implementation', 'code'] },
        { name: 'reassuring', keywords: ['assure', 'confident', 'trust', 'reliable', 'guarantee', 'certain'] }
      ];
      
      // Count keywords for each tone
      const textLC = text.toLowerCase();
      const scores = tones.map(tone => {
        const matchCount = tone.keywords.reduce((count, keyword) => {
          const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
          const matches = textLC.match(regex);
          return count + (matches ? matches.length : 0);
        }, 0);
        
        return {
          tone: tone.name,
          score: matchCount
        };
      });
      
      // Sort scores and get primary tone
      scores.sort((a, b) => b.score - a.score);
      const primaryTone = scores[0].score > 0 ? scores[0].tone : 'neutral';
      
      // Calculate confidence (simplified)
      const totalScore = scores.reduce((sum, tone) => sum + tone.score, 0);
      const confidence = totalScore > 0 ? scores[0].score / totalScore : 0;
      
      return {
        tone: primaryTone,
        confidence,
        allTones: scores
      };
    } catch (error) {
      console.error('Failed to analyze tone:', error.message);
      return {
        tone: 'neutral',
        confidence: 0,
        allTones: []
      };
    }
  }
}

// Export singleton instance
module.exports = new CopilotPreviewService();