/**
 * Agent Emotion Tuning System
 * 
 * Provides emotional tone adjustment capabilities for copilot responses.
 * Phase II implementation for "Agent emotion tuner – softens or sharpens tone based on user preference."
 *
 * (c) 2025 Copyright AI Publishing International LLP All Rights Reserved.
 * Developed with assistance from the Pilots of Vision Lake.
 */

const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const speechService = require('../speech');

class EmotionTuningService {
  constructor() {
    this.initialized = false;
    
    // Initialize Firebase Admin if not already initialized
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    
    this.db = admin.firestore();
    
    // Available emotional tones
    this.emotionalTones = {
      formal: {
        description: 'Professional, precise and structured tone',
        intensity: 0,
        keywords: {
          add: ['therefore', 'consequently', 'furthermore', 'additionally', 'accordingly'],
          replace: [
            { from: 'think|believe|feel', to: 'assess|determine|conclude' },
            { from: 'good|great|nice', to: 'appropriate|beneficial|effective' },
            { from: 'thanks|thank you', to: 'I appreciate|I acknowledge' }
          ]
        },
        sentenceStructure: 'complex'
      },
      friendly: {
        description: 'Warm, approachable and conversational tone',
        intensity: 0,
        keywords: {
          add: ['actually', 'really', 'definitely', 'absolutely', 'happily'],
          replace: [
            { from: 'assess|determine|conclude', to: 'think|believe|feel' },
            { from: 'implement|utilize|employ', to: 'use|try|add' },
            { from: 'I appreciate|I acknowledge', to: 'thanks|thank you' }
          ]
        },
        sentenceStructure: 'simple'
      },
      empathetic: {
        description: 'Understanding, supportive and compassionate tone',
        intensity: 0,
        keywords: {
          add: ['understand', 'appreciate', 'recognize', 'imagine', 'sense'],
          replace: [
            { from: 'issue|problem|error', to: 'challenge|situation|difficulty' },
            { from: 'fail|failed|failure', to: 'didn\'t work out|wasn\'t successful' },
            { from: 'must|should|have to', to: 'might want to|could consider' }
          ]
        },
        sentenceStructure: 'balanced'
      },
      confident: {
        description: 'Direct, assertive and definitive tone',
        intensity: 0,
        keywords: {
          add: ['certainly', 'definitely', 'absolutely', 'undoubtedly', 'clearly'],
          replace: [
            { from: 'might|may|could', to: 'will|can|should' },
            { from: 'try|attempt|consider', to: 'do|implement|execute' },
            { from: 'I think|I believe', to: 'I know|I am certain' }
          ]
        },
        sentenceStructure: 'direct'
      },
      enthusiastic: {
        description: 'Energetic, positive and encouraging tone',
        intensity: 0,
        keywords: {
          add: ['amazing', 'fantastic', 'exciting', 'wonderful', 'excellent'],
          replace: [
            { from: 'good|nice|fine', to: 'great|excellent|outstanding' },
            { from: 'interesting|notable', to: 'fascinating|remarkable|incredible' },
            { from: 'like|appreciate', to: 'love|adore|enjoy' }
          ]
        },
        sentenceStructure: 'exclamatory'
      }
    };
  }
  
  /**
   * Initialize the emotion tuning service
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      await speechService.initialize();
      
      // Create collections if they don't exist
      const collections = ['user_emotion_preferences', 'tone_adjustments', 'tone_feedback'];
      
      for (const collection of collections) {
        try {
          await this.db.collection(collection).limit(1).get();
        } catch (error) {
          console.warn(`Collection ${collection} does not exist. It will be created on first write.`);
        }
      }
      
      this.initialized = true;
      console.log('Emotion Tuning Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Emotion Tuning Service:', error.message);
      throw error;
    }
  }
  
  /**
   * Get user's emotional tone preferences
   * 
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - User's emotional tone preferences
   */
  async getUserPreferences(userId) {
    await this.initialize();
    
    try {
      const doc = await this.db.collection('user_emotion_preferences').doc(userId).get();
      
      if (!doc.exists) {
        // Create default preferences
        const defaultPreferences = {
          userId,
          primaryTone: 'friendly',
          toneIntensity: 5, // Scale of 1-10
          toneAdjustmentEnabled: true,
          contextualToneEnabled: true, // Allow tone to adjust based on conversation context
          domainSpecificTones: {}, // Specific tones for different domains/topics
          customToneRules: [],
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        await this.db.collection('user_emotion_preferences').doc(userId).set(defaultPreferences);
        
        return defaultPreferences;
      }
      
      return doc.data();
    } catch (error) {
      console.error('Failed to get user emotion preferences:', error.message);
      throw error;
    }
  }
  
  /**
   * Update user's emotional tone preferences
   * 
   * @param {string} userId - User ID
   * @param {Object} preferences - New preferences
   * @returns {Promise<Object>} - Updated preferences
   */
  async updateUserPreferences(userId, preferences) {
    await this.initialize();
    
    try {
      // Get current preferences
      const currentPreferences = await this.getUserPreferences(userId);
      
      // Validate tone
      if (preferences.primaryTone && !this.emotionalTones[preferences.primaryTone]) {
        throw new Error(`Invalid tone: ${preferences.primaryTone}`);
      }
      
      // Validate intensity
      if (preferences.toneIntensity !== undefined && 
          (preferences.toneIntensity < 1 || preferences.toneIntensity > 10)) {
        throw new Error('Tone intensity must be between 1 and 10');
      }
      
      // Update preferences
      const updatedPreferences = {
        ...currentPreferences,
        ...preferences,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      await this.db.collection('user_emotion_preferences').doc(userId).update(updatedPreferences);
      
      return updatedPreferences;
    } catch (error) {
      console.error('Failed to update user emotion preferences:', error.message);
      throw error;
    }
  }
  
  /**
   * Adjust the emotional tone of a message
   * 
   * @param {string} message - Original message
   * @param {string} toneType - Type of emotional tone
   * @param {number} intensity - Intensity of adjustment (1-10)
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Adjusted message with metadata
   */
  async adjustTone(message, toneType, intensity, options = {}) {
    await this.initialize();
    
    try {
      // Validate tone
      if (!this.emotionalTones[toneType]) {
        throw new Error(`Invalid tone: ${toneType}`);
      }
      
      // Validate intensity
      if (intensity < 1 || intensity > 10) {
        throw new Error('Intensity must be between 1 and 10');
      }
      
      // Get tone definition
      const toneDefinition = { ...this.emotionalTones[toneType] };
      toneDefinition.intensity = intensity;
      
      // Analyze original message sentiment
      const originalSentiment = await speechService.analyzeSentiment(message);
      
      // Apply tone adjustments
      const adjustedMessage = this._applyToneAdjustments(message, toneDefinition, originalSentiment);
      
      // Create adjustment record
      const adjustmentId = uuidv4();
      const adjustment = {
        id: adjustmentId,
        originalMessage: message,
        adjustedMessage,
        toneType,
        intensity,
        originalSentiment,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userId: options.userId || null,
        copilotId: options.copilotId || null,
        conversationId: options.conversationId || null
      };
      
      // Store in Firestore if userId provided
      if (options.userId) {
        await this.db.collection('tone_adjustments').doc(adjustmentId).set(adjustment);
      }
      
      return {
        id: adjustmentId,
        originalMessage: message,
        adjustedMessage,
        toneType,
        intensity,
        originalSentiment,
        changes: adjustedMessage !== message
      };
    } catch (error) {
      console.error('Failed to adjust tone:', error.message);
      throw error;
    }
  }
  
  /**
   * Apply tone adjustments to a message
   * 
   * @param {string} message - Original message
   * @param {Object} toneDefinition - Tone definition with intensity
   * @param {Object} sentiment - Original message sentiment
   * @returns {string} - Adjusted message
   * @private
   */
  _applyToneAdjustments(message, toneDefinition, sentiment) {
    // Normalize intensity to 0-1 range
    const normalizedIntensity = toneDefinition.intensity / 10;
    
    // Break message into sentences for structure adjustments
    const sentences = message.match(/[^.!?]+[.!?]+/g) || [message];
    
    // Apply tone adjustments
    let adjustedSentences = sentences.map(sentence => {
      // Apply keyword replacements based on intensity
      let adjustedSentence = sentence;
      
      // Only apply certain replacements based on intensity level
      const replacementsToApply = Math.floor(toneDefinition.keywords.replace.length * normalizedIntensity);
      
      for (let i = 0; i < replacementsToApply; i++) {
        const replacement = toneDefinition.keywords.replace[i];
        const regex = new RegExp(`\\b(${replacement.from})\\b`, 'gi');
        adjustedSentence = adjustedSentence.replace(regex, replacement.to);
      }
      
      // Add tone-specific keywords based on intensity
      if (normalizedIntensity > 0.3) {
        const keywordsToAdd = Math.min(
          2, 
          Math.floor(toneDefinition.keywords.add.length * normalizedIntensity)
        );
        
        for (let i = 0; i < keywordsToAdd; i++) {
          // Only add keywords if probability matches intensity
          if (Math.random() < normalizedIntensity) {
            const keyword = toneDefinition.keywords.add[i];
            
            // Only add if not already present
            if (!adjustedSentence.toLowerCase().includes(keyword.toLowerCase())) {
              if (adjustedSentence.trim().length > 10) {
                // Insert at beginning of sentence with 1/3 probability
                if (Math.random() < 0.33) {
                  adjustedSentence = `${keyword.charAt(0).toUpperCase() + keyword.slice(1)}, ${adjustedSentence.toLowerCase()}`;
                } 
                // Otherwise insert in the middle
                else {
                  const words = adjustedSentence.split(' ');
                  const insertPos = Math.floor(words.length / 2);
                  words.splice(insertPos, 0, keyword);
                  adjustedSentence = words.join(' ');
                }
              }
            }
          }
        }
      }
      
      // Adjust sentence structure based on tone and intensity
      if (normalizedIntensity > 0.5) {
        switch (toneDefinition.sentenceStructure) {
          case 'complex':
            // Make sentences more complex for formal tone
            if (!adjustedSentence.includes(',') && adjustedSentence.length > 20) {
              const words = adjustedSentence.split(' ');
              const insertPos = Math.floor(words.length / 2);
              words.splice(insertPos, 0, ', however,');
              adjustedSentence = words.join(' ');
            }
            break;
            
          case 'simple':
            // Simplify sentences for friendly tone
            adjustedSentence = adjustedSentence.replace(/,\s*however,\s*/g, ' and ');
            adjustedSentence = adjustedSentence.replace(/,\s*therefore,\s*/g, ' so ');
            break;
            
          case 'exclamatory':
            // Add emphasis for enthusiastic tone
            if (normalizedIntensity > 0.7 && !adjustedSentence.includes('!')) {
              adjustedSentence = adjustedSentence.replace(/[.]\s*$/, '! ');
            }
            break;
            
          case 'direct':
            // Make more direct and concise for confident tone
            adjustedSentence = adjustedSentence.replace(/I think that |In my opinion, |It seems that /gi, '');
            break;
        }
      }
      
      return adjustedSentence;
    });
    
    return adjustedSentences.join(' ');
  }
  
  /**
   * Automatically determine the most appropriate emotional tone based on context
   * 
   * @param {string} userMessage - User's message
   * @param {Object} options - Additional context
   * @returns {Promise<Object>} - Recommended tone
   */
  async suggestTone(userMessage, options = {}) {
    await this.initialize();
    
    try {
      // Analyze message sentiment
      const sentiment = await speechService.analyzeSentiment(userMessage);
      
      // Determine message intent
      const intent = this._determineIntent(userMessage);
      
      // Suggest tone based on sentiment and intent
      let suggestedTone = 'friendly'; // Default
      let suggestedIntensity = 5; // Default
      
      if (sentiment.category === 'negative') {
        if (sentiment.score < -0.5) {
          // Highly negative - use empathetic tone
          suggestedTone = 'empathetic';
          suggestedIntensity = 7;
        } else {
          // Moderately negative - use empathetic but less intense
          suggestedTone = 'empathetic';
          suggestedIntensity = 5;
        }
      } else if (sentiment.category === 'positive') {
        if (sentiment.score > 0.5) {
          // Highly positive - match enthusiasm
          suggestedTone = 'enthusiastic';
          suggestedIntensity = 6;
        } else {
          // Moderately positive - friendly works well
          suggestedTone = 'friendly';
          suggestedIntensity = 6;
        }
      }
      
      // Override based on intent
      if (intent === 'inquiry-technical' || intent === 'inquiry-factual') {
        suggestedTone = 'formal';
        suggestedIntensity = 6;
      } else if (intent === 'request-urgent' || intent === 'instruction') {
        suggestedTone = 'confident';
        suggestedIntensity = 7;
      } else if (intent === 'complaint') {
        suggestedTone = 'empathetic';
        suggestedIntensity = 8;
      }
      
      // Get user preferences if available
      if (options.userId) {
        const preferences = await this.getUserPreferences(options.userId);
        
        // Apply user's preferred tone if contextual tone is disabled
        if (!preferences.contextualToneEnabled) {
          suggestedTone = preferences.primaryTone;
          suggestedIntensity = preferences.toneIntensity;
        } 
        // Otherwise, check for domain-specific preferences
        else if (options.domain && preferences.domainSpecificTones[options.domain]) {
          suggestedTone = preferences.domainSpecificTones[options.domain].tone;
          suggestedIntensity = preferences.domainSpecificTones[options.domain].intensity;
        }
      }
      
      return {
        tone: suggestedTone,
        intensity: suggestedIntensity,
        sentiment,
        intent,
        explanation: this._generateToneExplanation(suggestedTone, sentiment, intent)
      };
    } catch (error) {
      console.error('Failed to suggest tone:', error.message);
      throw error;
    }
  }
  
  /**
   * Determine intent of user message
   * 
   * @param {string} message - User message
   * @returns {string} - Detected intent
   * @private
   */
  _determineIntent(message) {
    const lowerMessage = message.toLowerCase();
    
    // Simple rule-based intent detection - would be replaced by a more sophisticated model in production
    if (lowerMessage.includes('?')) {
      if (lowerMessage.includes('how') || lowerMessage.includes('explain') || 
          lowerMessage.includes('process') || lowerMessage.includes('code')) {
        return 'inquiry-technical';
      } else if (lowerMessage.includes('what') || lowerMessage.includes('when') || 
                lowerMessage.includes('where') || lowerMessage.includes('who')) {
        return 'inquiry-factual';
      } else {
        return 'inquiry-general';
      }
    } else if (lowerMessage.includes('help') || lowerMessage.includes('urgent') || 
              lowerMessage.includes('emergency') || lowerMessage.includes('asap')) {
      return 'request-urgent';
    } else if (lowerMessage.includes('do this') || lowerMessage.includes('follow') || 
              lowerMessage.includes('steps')) {
      return 'instruction';
    } else if (lowerMessage.includes('problem') || lowerMessage.includes('issue') || 
              lowerMessage.includes('wrong') || lowerMessage.includes('doesn\'t work') || 
              lowerMessage.includes('does not work') || lowerMessage.includes('broken')) {
      return 'complaint';
    } else if (lowerMessage.includes('thank') || lowerMessage.includes('appreciate') || 
              lowerMessage.includes('grateful')) {
      return 'gratitude';
    } else {
      return 'statement';
    }
  }
  
  /**
   * Generate explanation for tone suggestion
   * 
   * @param {string} tone - Suggested tone
   * @param {Object} sentiment - Message sentiment
   * @param {string} intent - Detected intent
   * @returns {string} - Explanation for tone suggestion
   * @private
   */
  _generateToneExplanation(tone, sentiment, intent) {
    const toneDescriptions = {
      formal: 'professional and precise',
      friendly: 'warm and approachable',
      empathetic: 'understanding and supportive',
      confident: 'direct and assertive',
      enthusiastic: 'energetic and positive'
    };
    
    const intentDescriptions = {
      'inquiry-technical': 'technical question',
      'inquiry-factual': 'factual question',
      'inquiry-general': 'general question',
      'request-urgent': 'urgent request',
      'instruction': 'instruction or directive',
      'complaint': 'problem report or complaint',
      'gratitude': 'expression of thanks',
      'statement': 'general statement'
    };
    
    const sentimentDescriptions = {
      positive: 'positive',
      neutral: 'neutral',
      negative: 'negative'
    };
    
    return `A ${toneDescriptions[tone]} tone is recommended because the message appears to be a ${intentDescriptions[intent]} with a ${sentimentDescriptions[sentiment.category]} sentiment (${sentiment.score.toFixed(2)}).`;
  }
  
  /**
   * Submit feedback on tone adjustment
   * 
   * @param {string} adjustmentId - Tone adjustment ID
   * @param {string} userId - User ID
   * @param {string} feedback - Feedback type (helpful, too-strong, too-weak, wrong-tone)
   * @param {string} comment - Optional comment
   * @returns {Promise<Object>} - Feedback record
   */
  async submitFeedback(adjustmentId, userId, feedback, comment) {
    await this.initialize();
    
    try {
      // Create feedback ID
      const feedbackId = uuidv4();
      
      // Create feedback record
      const feedbackRecord = {
        id: feedbackId,
        adjustmentId,
        userId,
        feedback,
        comment: comment || '',
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      };
      
      // Store in Firestore
      await this.db.collection('tone_feedback').doc(feedbackId).set(feedbackRecord);
      
      return feedbackRecord;
    } catch (error) {
      console.error('Failed to submit tone feedback:', error.message);
      throw error;
    }
  }
  
  /**
   * Get available emotional tones
   * 
   * @returns {Object} - Available emotional tones
   */
  getAvailableTones() {
    return Object.keys(this.emotionalTones).reduce((result, tone) => {
      result[tone] = {
        description: this.emotionalTones[tone].description
      };
      return result;
    }, {});
  }
  
  /**
   * Add a custom tone for a user
   * 
   * @param {string} userId - User ID
   * @param {string} toneName - Name of the custom tone
   * @param {Object} toneDefinition - Tone definition
   * @returns {Promise<Object>} - Updated user preferences
   */
  async addCustomTone(userId, toneName, toneDefinition) {
    await this.initialize();
    
    try {
      // Get current preferences
      const preferences = await this.getUserPreferences(userId);
      
      // Validate tone definition
      if (!toneDefinition.description || !toneDefinition.keywords) {
        throw new Error('Invalid tone definition');
      }
      
      // Create custom tone rule
      const customTone = {
        name: toneName,
        description: toneDefinition.description,
        keywords: toneDefinition.keywords,
        sentenceStructure: toneDefinition.sentenceStructure || 'balanced',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      // Add to custom tone rules
      const customTones = preferences.customToneRules || [];
      customTones.push(customTone);
      
      // Update preferences
      const updatedPreferences = await this.updateUserPreferences(userId, {
        customToneRules: customTones
      });
      
      return updatedPreferences;
    } catch (error) {
      console.error('Failed to add custom tone:', error.message);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new EmotionTuningService();