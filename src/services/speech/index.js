/**
 * Speech Service
 * 
 * Provides integration with Google STT (Speech-to-Text) and TTS (Text-to-Speech)
 * for copilot personalization, sentiment analysis, and Dream Commander.
 * 
 * (c) 2025 Copyright AI Publishing International LLP All Rights Reserved.
 * Developed with assistance from the Pilots of Vision Lake.
 */

const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const speech = require('@google-cloud/speech');
const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

// Initialize Secret Manager
const secretManager = new SecretManagerServiceClient();

/**
 * Speech service for STT and TTS functionality
 */
class SpeechService {
  constructor() {
    this.initialized = false;
    this.config = {
      projectId: process.env.GCP_PROJECT_ID || 'api-for-warp-drive',
      region: process.env.GCP_REGION || 'us-west1',
      voices: {
        'copilot-01': { // SirHand
          name: 'en-US-Neural2-D',
          gender: 'MALE',
          pitch: -2.0,
          speakingRate: 0.9
        },
        'copilot-02': { // QBLucy
          name: 'en-US-Neural2-F',
          gender: 'FEMALE',
          pitch: 0.5,
          speakingRate: 1.1
        },
        'dream-commander': {
          name: 'en-US-Neural2-J',
          gender: 'MALE',
          pitch: -4.0,
          speakingRate: 0.8
        }
      },
      sentimentThresholds: {
        positive: 0.3,
        negative: -0.3
      }
    };
    
    // Initialize Firebase Admin if not already initialized
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    
    this.db = admin.firestore();
    this.ceScores = {}; // Cache for CE scores
  }
  
  /**
   * Initialize the Speech Service
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      // Load API keys from Secret Manager
      const [sttKeyVersion] = await secretManager.accessSecretVersion({
        name: `projects/${this.config.projectId}/secrets/google-speech-api-key/versions/latest`,
      });
      
      const [ttsKeyVersion] = await secretManager.accessSecretVersion({
        name: `projects/${this.config.projectId}/secrets/google-tts-api-key/versions/latest`,
      });
      
      const [nlpKeyVersion] = await secretManager.accessSecretVersion({
        name: `projects/${this.config.projectId}/secrets/google-nlp-api-key/versions/latest`,
      });
      
      this.sttApiKey = sttKeyVersion.payload.data.toString();
      this.ttsApiKey = ttsKeyVersion.payload.data.toString();
      this.nlpApiKey = nlpKeyVersion.payload.data.toString();
      
      // Initialize clients
      this.speechClient = new speech.SpeechClient();
      this.ttsClient = new textToSpeech.TextToSpeechClient();
      
      this.initialized = true;
      console.log('Speech Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Speech Service:', error.message);
      throw error;
    }
  }
  
  /**
   * Transcribe audio to text
   * 
   * @param {Buffer|string} audio - Audio buffer or path to audio file
   * @param {Object} options - Transcription options
   * @returns {Promise<Object>} Transcription result with sentiment
   */
  async transcribe(audio, options = {}) {
    await this.initialize();
    
    try {
      // Prepare audio content
      let audioContent;
      if (typeof audio === 'string') {
        // It's a file path
        audioContent = fs.readFileSync(audio);
      } else {
        // It's already a buffer
        audioContent = audio;
      }
      
      // Set up recognition config
      const config = {
        encoding: options.encoding || 'LINEAR16',
        sampleRateHertz: options.sampleRate || 16000,
        languageCode: options.languageCode || 'en-US',
        enableAutomaticPunctuation: true,
        enableWordTimeOffsets: true,
        model: options.model || 'latest_long',
        useEnhanced: true,
      };
      
      // Perform speech recognition
      const request = {
        audio: { content: audioContent.toString('base64') },
        config: config,
      };
      
      const [response] = await this.speechClient.recognize(request);
      const transcription = response.results
        .map(result => result.alternatives[0].transcript)
        .join('\n');
      
      // Get sentiment if needed
      let sentiment = null;
      if (options.sentiment !== false) {
        sentiment = await this.analyzeSentiment(transcription);
      }
      
      // Store transcription in Firestore if userId provided
      if (options.userId) {
        await this.storeTranscription(options.userId, transcription, sentiment);
      }
      
      return {
        text: transcription,
        sentiment,
        confidence: response.results[0]?.alternatives[0]?.confidence || 0,
      };
    } catch (error) {
      console.error('Transcription error:', error);
      throw error;
    }
  }
  
  /**
   * Convert text to speech
   * 
   * @param {string} text - Text to convert to speech
   * @param {Object} options - TTS options
   * @returns {Promise<Buffer>} Audio buffer
   */
  async textToSpeech(text, options = {}) {
    await this.initialize();
    
    try {
      // Get voice configuration
      const copilotId = options.copilotId || 'copilot-01';
      const voiceConfig = this.config.voices[copilotId] || this.config.voices['copilot-01'];
      
      // Apply personalization if specified
      if (options.personalization) {
        const personalization = await this.getPersonalization(options.userId, copilotId);
        Object.assign(voiceConfig, personalization);
      }
      
      // Set up TTS request
      const request = {
        input: { text },
        voice: {
          languageCode: options.languageCode || 'en-US',
          name: voiceConfig.name,
          ssmlGender: voiceConfig.gender
        },
        audioConfig: {
          audioEncoding: options.audioEncoding || 'MP3',
          pitch: voiceConfig.pitch,
          speakingRate: voiceConfig.speakingRate
        },
      };
      
      // Perform text-to-speech
      const [response] = await this.ttsClient.synthesizeSpeech(request);
      
      // Store TTS in Firestore if userId provided
      if (options.userId) {
        await this.storeTTSRequest(options.userId, text, copilotId);
      }
      
      return response.audioContent;
    } catch (error) {
      console.error('Text-to-speech error:', error);
      throw error;
    }
  }
  
  /**
   * Analyze sentiment of text
   * 
   * @param {string} text - Text to analyze
   * @returns {Promise<Object>} Sentiment analysis
   */
  async analyzeSentiment(text) {
    const language = require('@google-cloud/language');
    const client = new language.LanguageServiceClient();
    
    const document = {
      content: text,
      type: 'PLAIN_TEXT',
    };
    
    try {
      const [result] = await client.analyzeSentiment({ document });
      const sentiment = result.documentSentiment;
      
      // Determine sentiment category
      let category = 'neutral';
      if (sentiment.score >= this.config.sentimentThresholds.positive) {
        category = 'positive';
      } else if (sentiment.score <= this.config.sentimentThresholds.negative) {
        category = 'negative';
      }
      
      return {
        score: sentiment.score,
        magnitude: sentiment.magnitude,
        category
      };
    } catch (error) {
      console.error('Sentiment analysis error:', error);
      return {
        score: 0,
        magnitude: 0,
        category: 'neutral'
      };
    }
  }
  
  /**
   * Store transcription in Firestore
   * 
   * @param {string} userId - User ID
   * @param {string} text - Transcribed text
   * @param {Object} sentiment - Sentiment analysis
   * @private
   */
  async storeTranscription(userId, text, sentiment) {
    try {
      await this.db.collection('speech_transcriptions').add({
        userId,
        text,
        sentiment,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Error storing transcription:', error);
    }
  }
  
  /**
   * Store TTS request in Firestore
   * 
   * @param {string} userId - User ID
   * @param {string} text - Original text
   * @param {string} copilotId - Copilot ID
   * @private
   */
  async storeTTSRequest(userId, text, copilotId) {
    try {
      await this.db.collection('speech_tts_requests').add({
        userId,
        text,
        copilotId,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Error storing TTS request:', error);
    }
  }
  
  /**
   * Get personalization settings for a user and copilot
   * 
   * @param {string} userId - User ID
   * @param {string} copilotId - Copilot ID
   * @returns {Promise<Object>} Personalization settings
   * @private
   */
  async getPersonalization(userId, copilotId) {
    if (!userId) return {};
    
    try {
      const doc = await this.db.collection('copilot_personalization')
        .where('userId', '==', userId)
        .where('copilotId', '==', copilotId)
        .limit(1)
        .get();
      
      if (doc.empty) return {};
      
      return doc.docs[0].data().voiceSettings || {};
    } catch (error) {
      console.error('Error getting personalization:', error);
      return {};
    }
  }
  
  /**
   * Set personalization settings for a user and copilot
   * 
   * @param {string} userId - User ID
   * @param {string} copilotId - Copilot ID
   * @param {Object} settings - Personalization settings
   * @returns {Promise<boolean>} Success indicator
   */
  async setPersonalization(userId, copilotId, settings) {
    await this.initialize();
    
    if (!userId || !copilotId) {
      throw new Error('User ID and Copilot ID are required');
    }
    
    try {
      // Get existing doc if it exists
      const querySnapshot = await this.db.collection('copilot_personalization')
        .where('userId', '==', userId)
        .where('copilotId', '==', copilotId)
        .limit(1)
        .get();
      
      if (querySnapshot.empty) {
        // Create new document
        await this.db.collection('copilot_personalization').add({
          userId,
          copilotId,
          voiceSettings: settings,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        // Update existing document
        const docRef = querySnapshot.docs[0].ref;
        await docRef.update({
          voiceSettings: settings,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error setting personalization:', error);
      throw error;
    }
  }
  
  /**
   * Get CE (Collective Empathy) score for a user
   * 
   * @param {string} userId - User ID
   * @returns {Promise<number>} CE score (0-100)
   */
  async getCEScore(userId) {
    await this.initialize();
    
    // Check cache first
    if (this.ceScores[userId]) {
      return this.ceScores[userId];
    }
    
    try {
      const doc = await this.db.collection('ce_scores').doc(userId).get();
      
      if (!doc.exists) {
        // Create a default score
        const defaultScore = 50; // Default CE score
        await this.db.collection('ce_scores').doc(userId).set({
          score: defaultScore,
          history: [],
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        this.ceScores[userId] = defaultScore;
        return defaultScore;
      }
      
      const score = doc.data().score;
      this.ceScores[userId] = score;
      return score;
    } catch (error) {
      console.error('Error getting CE score:', error);
      return 50; // Default value on error
    }
  }
  
  /**
   * Update CE score based on interaction
   * 
   * @param {string} userId - User ID
   * @param {number} delta - Change in CE score
   * @param {string} reason - Reason for the change
   * @returns {Promise<number>} New CE score
   */
  async updateCEScore(userId, delta, reason) {
    await this.initialize();
    
    try {
      // Get current score
      const currentScore = await this.getCEScore(userId);
      
      // Calculate new score (bounded between 0-100)
      const newScore = Math.max(0, Math.min(100, currentScore + delta));
      
      // Update score in Firestore
      const docRef = this.db.collection('ce_scores').doc(userId);
      await docRef.update({
        score: newScore,
        history: admin.firestore.FieldValue.arrayUnion({
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          previous: currentScore,
          new: newScore,
          delta,
          reason
        }),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Update cache
      this.ceScores[userId] = newScore;
      
      return newScore;
    } catch (error) {
      console.error('Error updating CE score:', error);
      throw error;
    }
  }
  
  /**
   * Create Dream Commander session
   * 
   * @param {string} userId - User ID
   * @param {Object} options - Session options
   * @returns {Promise<Object>} Session details
   */
  async createDreamCommanderSession(userId, options = {}) {
    await this.initialize();
    
    try {
      // Check CE score for eligibility
      const ceScore = await this.getCEScore(userId);
      const minimumCEScore = options.minimumCEScore || 60;
      
      if (ceScore < minimumCEScore) {
        throw new Error(`Insufficient CE score (${ceScore}) for Dream Commander. Minimum required: ${minimumCEScore}`);
      }
      
      // Create session
      const sessionId = uuidv4();
      const session = {
        id: sessionId,
        userId,
        ceScore,
        status: 'active',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        config: {
          maxDuration: options.maxDuration || 3600, // 1 hour in seconds
          theme: options.theme || 'default',
          intensity: options.intensity || 'medium'
        },
        interactions: []
      };
      
      await this.db.collection('dream_commander_sessions').doc(sessionId).set(session);
      
      return {
        sessionId,
        ceScore,
        status: 'active',
        config: session.config
      };
    } catch (error) {
      console.error('Error creating Dream Commander session:', error);
      throw error;
    }
  }
  
  /**
   * Add interaction to Dream Commander session
   * 
   * @param {string} sessionId - Session ID
   * @param {string} message - User message
   * @returns {Promise<Object>} Response details
   */
  async dreamCommanderInteraction(sessionId, message) {
    await this.initialize();
    
    try {
      // Get session
      const sessionDoc = await this.db.collection('dream_commander_sessions').doc(sessionId).get();
      
      if (!sessionDoc.exists) {
        throw new Error(`Session not found: ${sessionId}`);
      }
      
      const session = sessionDoc.data();
      
      if (session.status !== 'active') {
        throw new Error(`Session is not active: ${sessionId}`);
      }
      
      // Analyze sentiment
      const sentiment = await this.analyzeSentiment(message);
      
      // Generate response based on CE score and sentiment
      const responseText = await this._generateDreamCommanderResponse(session, message, sentiment);
      
      // Convert to speech
      const audioContent = await this.textToSpeech(responseText, {
        copilotId: 'dream-commander',
        userId: session.userId
      });
      
      // Store interaction
      const interaction = {
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        user: {
          message,
          sentiment
        },
        dreamCommander: {
          message: responseText
        }
      };
      
      await this.db.collection('dream_commander_sessions').doc(sessionId).update({
        interactions: admin.firestore.FieldValue.arrayUnion(interaction),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return {
        text: responseText,
        audio: audioContent,
        sentiment
      };
    } catch (error) {
      console.error('Error in Dream Commander interaction:', error);
      throw error;
    }
  }
  
  /**
   * Generate Dream Commander response
   * 
   * @param {Object} session - Session data
   * @param {string} message - User message
   * @param {Object} sentiment - Sentiment analysis
   * @returns {Promise<string>} Generated response
   * @private
   */
  async _generateDreamCommanderResponse(session, message, sentiment) {
    // This would normally use a more sophisticated approach,
    // possibly involving a language model API call
    
    const ceScore = session.ceScore;
    const intensity = session.config.intensity;
    
    // Simple response generation based on CE score and sentiment
    let responsePrefix = '';
    
    if (ceScore >= 80) {
      responsePrefix = 'I sense your elevated consciousness. ';
    } else if (ceScore >= 60) {
      responsePrefix = 'Your awareness shows promise. ';
    } else {
      responsePrefix = 'Your journey has only begun. ';
    }
    
    let responseSuffix = '';
    
    if (sentiment.category === 'positive') {
      responseSuffix = 'Your positive energy fuels our connection in the dreamscape.';
    } else if (sentiment.category === 'negative') {
      responseSuffix = 'I sense resistance. Release your doubts to progress further.';
    } else {
      responseSuffix = 'Remain mindful of your emotions as we traverse deeper.';
    }
    
    // Intensity modifier
    let intensityPhrase = '';
    if (intensity === 'high') {
      intensityPhrase = 'We are entering a realm of profound significance. ';
    } else if (intensity === 'medium') {
      intensityPhrase = 'The dreamscape reveals itself gradually. ';
    } else {
      intensityPhrase = 'We proceed with caution in this delicate realm. ';
    }
    
    // Combine components
    return `${responsePrefix}${intensityPhrase}${responseSuffix}`;
  }
}

// Export singleton instance
module.exports = new SpeechService();