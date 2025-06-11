/**
 * Core Speech Service for Google STT/TTS
 * 
 * Provides speech-to-text (STT) and text-to-speech (TTS) capabilities
 * with personalization and sentiment analysis for use with any copilot.
 * 
 * Integration with Google Cloud APIs: Speech-to-Text, Text-to-Speech, and Natural Language.
 * 
 * (c) 2025 Copyright AI Publishing International LLP
 */

const fs = require('fs').promises;
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const textToSpeech = require('@google-cloud/text-to-speech');
const speech = require('@google-cloud/speech');
const language = require('@google-cloud/language');
const admin = require('firebase-admin');

class SpeechCore {
  constructor() {
    this.initialized = false;
    this.secretManager = new SecretManagerServiceClient();
    this.ttsClient = null;
    this.sttClient = null;
    this.nlpClient = null;
    this.firestore = null;
    this.config = {
      stt: {
        languageCode: 'en-US',
        model: 'latest_long',
        useEnhanced: true,
        enableAutomaticPunctuation: true,
        enableWordTimeOffsets: true
      },
      sentiment: {
        enableEntitySentiment: true,
        documentSentimentThreshold: {
          positive: 0.25,
          negative: -0.25
        }
      },
      languages: {
        supported: ['en-US', 'en-GB', 'en-AU', 'en-IN', 'es-ES', 'es-US', 'es-MX'],
        default: 'en-US'
      },
      voices: {
        // Premium studio voices
        'en-US': {
          studio: {
            MALE: ['en-US-Studio-M'],
            FEMALE: ['en-US-Studio-O', 'en-US-Studio-F']
          },
          neural2: {
            MALE: ['en-US-Neural2-D', 'en-US-Neural2-J'],
            FEMALE: ['en-US-Neural2-F', 'en-US-Neural2-C', 'en-US-Neural2-E', 'en-US-Neural2-G', 'en-US-Neural2-H']
          }
        },
        'es-ES': {
          neural2: {
            MALE: ['es-ES-Neural2-B', 'es-ES-Neural2-D'],
            FEMALE: ['es-ES-Neural2-A', 'es-ES-Neural2-C', 'es-ES-Neural2-E']
          }
        },
        'es-US': {
          neural2: {
            MALE: ['es-US-Neural2-A', 'es-US-Neural2-C'],
            FEMALE: ['es-US-Neural2-B']
          }
        }
      }
    };
  }

  /**
   * Initialize the speech service with Google Cloud credentials
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize Firebase Admin if not already initialized
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.applicationDefault()
        });
      }
      
      // Initialize Firestore
      this.firestore = admin.firestore();

      // Initialize STT client
      this.sttClient = new speech.SpeechClient();
      
      // Initialize TTS client
      this.ttsClient = new textToSpeech.TextToSpeechClient();
      
      // Initialize NLP client for sentiment analysis
      this.nlpClient = new language.LanguageServiceClient();

      this.initialized = true;
      console.log('Speech Core service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize speech service:', error);
      throw error;
    }
  }

  /**
   * Transcribe audio to text using Google STT
   * 
   * @param {Buffer|string} audioContent Audio content as buffer or file path
   * @param {Object} options Transcription options
   * @returns {Object} Transcription result
   */
  async transcribe(audioContent, options = {}) {
    await this.initialize();

    try {
      // Handle file path
      if (typeof audioContent === 'string') {
        audioContent = await fs.readFile(audioContent);
      }

      // Set up STT request
      const request = {
        audio: {
          content: audioContent.toString('base64')
        },
        config: {
          ...this.config.stt,
          ...options
        }
      };

      // Perform speech recognition
      const [response] = await this.sttClient.recognize(request);
      const transcription = response.results
        .map(result => result.alternatives[0].transcript)
        .join(' ');

      // Store transcription in Firestore if userId provided
      if (options.userId) {
        await this.storeSTTRequest(options.userId, transcription);
      }

      // Get sentiment if requested
      let sentiment = null;
      if (options.analyzeSentiment !== false) {
        sentiment = await this.analyzeSentiment(transcription);
      }

      return {
        text: transcription,
        sentiment,
        confidence: response.results[0]?.alternatives[0]?.confidence || 0
      };
    } catch (error) {
      console.error('Transcription error:', error);
      throw error;
    }
  }

  /**
   * Detect the likely language of a text
   *
   * @param {string} text - The text to analyze
   * @returns {string} The detected language code (e.g., 'en-US', 'es-ES')
   */
  detectLanguage(text) {
    // Simple language detection based on common words
    const spanishWords = ['el', 'la', 'los', 'las', 'un', 'una', 'es', 'son', 'está', 'están', 'y', 'o', 'pero', 'porque', 'como', 'qué', 'quién', 'dónde', 'cuándo', 'hola', 'gracias', 'por favor'];

    // Convert to lowercase and remove punctuation
    const normalizedText = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
    const words = normalizedText.split(/\s+/);

    // Count Spanish words
    let spanishWordCount = 0;
    for (const word of words) {
      if (spanishWords.includes(word)) {
        spanishWordCount++;
      }
    }

    // Calculate percentage of Spanish words
    const spanishPercentage = (spanishWordCount / words.length) * 100;

    // If more than 20% of words are Spanish, assume Spanish
    if (spanishPercentage > 20) {
      return 'es-ES';
    }

    // Default to English
    return 'en-US';
  }

  /**
   * Get the best available voice for a language and gender
   *
   * @param {string} languageCode - Language code (e.g., 'en-US', 'es-ES')
   * @param {string} gender - Voice gender ('MALE' or 'FEMALE')
   * @param {string} quality - Voice quality ('studio', 'neural2', 'wavenet', 'standard')
   * @returns {string} Voice name
   */
  getBestVoice(languageCode, gender, quality = 'studio') {
    // Default to the most widely available quality if requested quality isn't available
    const fallbackQuality = (lang) => {
      // If studio is requested but not available for this language
      if (quality === 'studio' && (!this.config.voices[lang] || !this.config.voices[lang].studio)) {
        return 'neural2';
      }
      return quality;
    };

    // Default to English if language not supported
    const lang = this.config.languages.supported.includes(languageCode)
      ? languageCode
      : this.config.languages.default;

    // Get actual quality level (with fallback)
    const actualQuality = fallbackQuality(lang);

    // Get gender-specific voice
    const genderVoices = this.config.voices[lang]?.[actualQuality]?.[gender];

    // Return first voice of requested gender if available
    if (genderVoices && genderVoices.length > 0) {
      return genderVoices[0];
    }

    // Fallback to any gender for the language
    const anyGender = gender === 'MALE' ? 'FEMALE' : 'MALE';
    const fallbackVoices = this.config.voices[lang]?.[actualQuality]?.[anyGender];

    if (fallbackVoices && fallbackVoices.length > 0) {
      return fallbackVoices[0];
    }

    // Ultimate fallback to English
    if (lang !== 'en-US') {
      return this.getBestVoice('en-US', gender, quality);
    }

    // Last resort - hardcoded fallback
    return gender === 'MALE' ? 'en-US-Neural2-D' : 'en-US-Neural2-F';
  }

  /**
   * Convert text to speech using Google TTS
   *
   * @param {string} text Text to convert to speech
   * @param {Object} options TTS options
   * @returns {Buffer} Audio content
   */
  async textToSpeech(text, options = {}) {
    await this.initialize();

    try {
      // Detect language from text if not explicitly provided
      const languageCode = options.languageCode || options.language ||
        (text ? this.detectLanguage(text) : this.config.languages.default);
      const gender = options.gender || 'FEMALE';
      const quality = options.quality || 'studio';

      // Get best voice or use provided voice name
      const voiceName = options.name || options.voice ||
        this.getBestVoice(languageCode, gender, quality);

      // Default voice settings - using Google's advanced voice selection
      let voiceSettings = {
        name: voiceName,
        gender: gender,
        pitch: options.pitch !== undefined ? Number(options.pitch) : 0,
        speakingRate: options.rate !== undefined ? Number(options.rate) : 1.0
      };
      
      // Apply personalization if specified
      if (options.personalization !== false && options.userId && options.copilotId) {
        const personalization = await this.getPersonalization(options.userId, options.copilotId);
        Object.assign(voiceSettings, personalization);
      }
      
      // Set up TTS request
      // Get language code from the voice name if possible
      const voiceLanguageCode = voiceSettings.name.split('-')[0] + '-' + voiceSettings.name.split('-')[1];

      const request = {
        input: { text },
        voice: {
          languageCode: voiceLanguageCode, // Must match the voice's language
          name: voiceSettings.name,
          ssmlGender: voiceSettings.gender
        },
        audioConfig: {
          audioEncoding: options.audioEncoding || 'MP3',
          pitch: voiceSettings.pitch,
          speakingRate: voiceSettings.speakingRate
        },
      };
      
      // Perform text-to-speech
      const [response] = await this.ttsClient.synthesizeSpeech(request);
      
      // Store TTS request in Firestore if userId provided
      if (options.userId && options.copilotId) {
        await this.storeTTSRequest(options.userId, text, options.copilotId);
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
   * @param {string} text Text to analyze
   * @returns {Object} Sentiment analysis result
   */
  async analyzeSentiment(text) {
    await this.initialize();
    
    try {
      const document = {
        content: text,
        type: 'PLAIN_TEXT',
      };
      
      // Analyze sentiment
      const [result] = await this.nlpClient.analyzeSentiment({ document });
      
      // Get document sentiment
      const sentiment = result.documentSentiment;
      
      // Analyze entities if enabled
      let entities = [];
      if (this.config.sentiment.enableEntitySentiment) {
        const [entityResult] = await this.nlpClient.analyzeEntitySentiment({ document });
        entities = entityResult.entities.map(entity => ({
          name: entity.name,
          type: entity.type,
          salience: entity.salience,
          sentiment: {
            score: entity.sentiment.score,
            magnitude: entity.sentiment.magnitude
          }
        }));
      }
      
      return {
        score: sentiment.score,
        magnitude: sentiment.magnitude,
        entities,
        sentiment: this.classifySentiment(sentiment.score)
      };
    } catch (error) {
      console.error('Sentiment analysis error:', error);
      throw error;
    }
  }

  /**
   * Classify sentiment score into a category
   * 
   * @param {number} score Sentiment score (-1 to 1)
   * @returns {string} Sentiment category
   */
  classifySentiment(score) {
    const { positive, negative } = this.config.sentiment.documentSentimentThreshold;
    
    if (score >= positive) {
      return 'positive';
    } else if (score <= negative) {
      return 'negative';
    } else {
      return 'neutral';
    }
  }

  /**
   * Get personalization settings for a user
   * 
   * @param {string} userId User ID
   * @param {string} copilotId Copilot ID
   * @returns {Object} Personalization settings
   */
  async getPersonalization(userId, copilotId) {
    await this.initialize();
    
    try {
      // Get user's personalization settings
      const querySnapshot = await this.firestore
        .collection('voicePersonalization')
        .where('userId', '==', userId)
        .where('copilotId', '==', copilotId)
        .limit(1)
        .get();
      
      if (querySnapshot.empty) {
        return {}; // No personalization
      }
      
      const data = querySnapshot.docs[0].data();
      return data.voiceSettings || {};
    } catch (error) {
      console.error('Error getting personalization:', error);
      return {};
    }
  }

  /**
   * Set personalization settings for a user
   * 
   * @param {string} userId User ID
   * @param {string} copilotId Copilot ID
   * @param {Object} settings Personalization settings
   * @returns {boolean} Success status
   */
  async setPersonalization(userId, copilotId, settings) {
    await this.initialize();
    
    if (!userId || !copilotId) {
      throw new Error('User ID and Copilot ID are required');
    }
    
    try {
      // Get existing doc if it exists
      const querySnapshot = await this.firestore
        .collection('voicePersonalization')
        .where('userId', '==', userId)
        .where('copilotId', '==', copilotId)
        .limit(1)
        .get();
      
      if (querySnapshot.empty) {
        // Create new document
        await this.firestore.collection('voicePersonalization').add({
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
      return false;
    }
  }

  /**
   * Store STT request in Firestore
   * 
   * @param {string} userId User ID
   * @param {string} transcription Transcription text
   * @returns {boolean} Success status
   */
  async storeSTTRequest(userId, transcription) {
    await this.initialize();
    
    try {
      await this.firestore.collection('speech_transcriptions').add({
        userId,
        text: transcription,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return true;
    } catch (error) {
      console.error('Error storing STT request:', error);
      return false;
    }
  }

  /**
   * Store TTS request in Firestore
   * 
   * @param {string} userId User ID
   * @param {string} text Text to speak
   * @param {string} copilotId Copilot ID
   * @returns {boolean} Success status
   */
  async storeTTSRequest(userId, text, copilotId) {
    await this.initialize();
    
    try {
      await this.firestore.collection('speech_tts_requests').add({
        userId,
        text,
        copilotId,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return true;
    } catch (error) {
      console.error('Error storing TTS request:', error);
      return false;
    }
  }
}

// Export singleton instance
module.exports = new SpeechCore();