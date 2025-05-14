/**
 * Speaker Recognition Service
 *
 * Provides voice biometric capabilities for speaker identification and verification
 * through enrollment, verification, and identification processes.
 *
 * Features:
 * - Speaker enrollment (create voice profile)
 * - Speaker verification (verify claimed identity)
 * - Speaker identification (recognize from a set of enrolled voices)
 * - Voice profile management
 *
 * (c) 2025 Copyright AI Publishing International LLP All Rights Reserved.
 * Developed with assistance from the Pilots of Vision Lake.
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const admin = require('firebase-admin');
const axios = require('axios');

// Speaker recognition service implementation
class SpeakerRecognitionService {
  constructor() {
    this.initialized = false;
    this.config = {
      enrollmentAudioMinLength: 20, // seconds
      verificationAudioMinLength: 5, // seconds
      minEnrollmentPhrases: 3,
      confidenceThreshold: 0.75,
      storageBasePath: './data/speaker-profiles'
    };

    // Initialize Firebase if needed
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    
    this.db = admin.firestore();
    this.storage = admin.storage();

    // Ensure storage directory exists
    if (!fs.existsSync(this.config.storageBasePath)) {
      fs.mkdirSync(this.config.storageBasePath, { recursive: true });
    }
  }

  /**
   * Initialize the speaker recognition service
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Load API configuration
      const apiConfig = await this.db.collection('api_config')
        .doc('speaker_recognition')
        .get();
      
      if (apiConfig.exists) {
        this.apiEndpoint = apiConfig.data().endpoint;
        this.apiKey = apiConfig.data().key;
      } else {
        throw new Error('Speaker recognition API configuration not found');
      }

      this.initialized = true;
      console.log('Speaker recognition service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize speaker recognition service:', error.message);
      throw error;
    }
  }

  /**
   * Create or update speaker profile for a user
   * 
   * @param {string} userId - User ID
   * @param {Object} profileData - Speaker profile metadata
   * @returns {Promise<Object>} Profile information
   */
  async createProfile(userId, profileData = {}) {
    await this.initialize();

    try {
      const profileId = profileData.profileId || uuidv4();
      
      // Create profile metadata
      const profile = {
        userId,
        profileId,
        displayName: profileData.displayName || `Profile for ${userId}`,
        description: profileData.description || '',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        enrollmentStatus: 'pending', // pending, in_progress, completed
        enrolledPhrases: [],
        verificationThreshold: profileData.verificationThreshold || this.config.confidenceThreshold,
        locale: profileData.locale || 'en-US'
      };

      // Save to Firestore
      await this.db.collection('speaker_profiles').doc(profileId).set(profile);

      return {
        userId,
        profileId,
        displayName: profile.displayName,
        enrollmentStatus: profile.enrollmentStatus
      };
    } catch (error) {
      console.error('Error creating speaker profile:', error);
      throw error;
    }
  }

  /**
   * Enroll a speaker with an audio sample and phrase
   * 
   * @param {string} profileId - Profile ID
   * @param {Buffer|string} audio - Audio buffer or path to audio file
   * @param {string} phrase - The spoken phrase in the audio
   * @returns {Promise<Object>} Enrollment result
   */
  async enrollSpeaker(profileId, audio, phrase) {
    await this.initialize();

    try {
      // Get profile
      const profileDoc = await this.db.collection('speaker_profiles').doc(profileId).get();
      
      if (!profileDoc.exists) {
        throw new Error(`Profile not found: ${profileId}`);
      }
      
      const profile = profileDoc.data();
      
      // Prepare audio content
      let audioContent;
      if (typeof audio === 'string') {
        // It's a file path
        audioContent = fs.readFileSync(audio);
      } else {
        // It's already a buffer
        audioContent = audio;
      }
      
      // Generate a unique filename for this enrollment
      const enrollmentId = uuidv4();
      const audioFilename = `${profileId}_${enrollmentId}.wav`;
      const audioPath = path.join(this.config.storageBasePath, audioFilename);
      
      // Save audio file locally
      fs.writeFileSync(audioPath, audioContent);
      
      // Process audio for enrollment (call to speaker recognition API)
      const enrollmentResult = await this._processEnrollment(profileId, audioPath, phrase);
      
      // Update profile with enrollment data
      const enrollmentData = {
        enrollmentId,
        phrase,
        audioPath,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        quality: enrollmentResult.quality || 0,
        status: enrollmentResult.status || 'completed'
      };
      
      // Update Firestore
      await this.db.collection('speaker_profiles').doc(profileId).update({
        enrolledPhrases: admin.firestore.FieldValue.arrayUnion({
          phrase,
          enrollmentId,
          timestamp: admin.firestore.Timestamp.now()
        }),
        enrollmentStatus: profile.enrolledPhrases.length + 1 >= this.config.minEnrollmentPhrases ? 
          'completed' : 'in_progress',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Store enrollment data
      await this.db.collection('speaker_enrollments').doc(enrollmentId).set(enrollmentData);
      
      return {
        profileId,
        enrollmentId,
        status: enrollmentResult.status || 'completed',
        quality: enrollmentResult.quality || 0,
        enrollmentProgress: `${profile.enrolledPhrases.length + 1}/${this.config.minEnrollmentPhrases}`,
        enrollmentComplete: profile.enrolledPhrases.length + 1 >= this.config.minEnrollmentPhrases
      };
    } catch (error) {
      console.error('Error enrolling speaker:', error);
      throw error;
    }
  }

  /**
   * Verify a speaker's identity
   * 
   * @param {string} profileId - Profile ID to verify against
   * @param {Buffer|string} audio - Audio buffer or path to audio file
   * @param {string} phrase - The expected phrase (optional)
   * @returns {Promise<Object>} Verification result
   */
  async verifySpeaker(profileId, audio, phrase) {
    await this.initialize();
    
    try {
      // Get profile
      const profileDoc = await this.db.collection('speaker_profiles').doc(profileId).get();
      
      if (!profileDoc.exists) {
        throw new Error(`Profile not found: ${profileId}`);
      }
      
      const profile = profileDoc.data();
      
      // Check enrollment status
      if (profile.enrollmentStatus !== 'completed') {
        throw new Error(`Speaker profile enrollment not completed: ${profileId}`);
      }
      
      // Prepare audio content
      let audioContent;
      if (typeof audio === 'string') {
        // It's a file path
        audioContent = fs.readFileSync(audio);
      } else {
        // It's already a buffer
        audioContent = audio;
      }
      
      // Save audio temporarily for verification
      const verificationId = uuidv4();
      const audioFilename = `verify_${profileId}_${verificationId}.wav`;
      const audioPath = path.join(this.config.storageBasePath, audioFilename);
      
      // Save audio file locally
      fs.writeFileSync(audioPath, audioContent);
      
      // Process audio for verification
      const verificationResult = await this._processVerification(profileId, audioPath, phrase);
      
      // Store verification result
      const verificationData = {
        verificationId,
        profileId,
        phrase: phrase || '',
        audioPath,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        confidence: verificationResult.confidence || 0,
        result: verificationResult.result || 'failed',
        verified: verificationResult.result === 'success'
      };
      
      await this.db.collection('speaker_verifications').doc(verificationId).set(verificationData);
      
      // Clean up temporary audio file
      try {
        fs.unlinkSync(audioPath);
      } catch (err) {
        console.warn('Could not delete temporary verification audio:', err.message);
      }
      
      return {
        verified: verificationResult.result === 'success',
        confidence: verificationResult.confidence || 0,
        profileId,
        verificationId,
        threshold: profile.verificationThreshold
      };
    } catch (error) {
      console.error('Error verifying speaker:', error);
      throw error;
    }
  }

  /**
   * Identify speaker from a set of profiles
   * 
   * @param {Buffer|string} audio - Audio buffer or path to audio file
   * @param {Array<string>} profileIds - Array of profile IDs to check against (optional)
   * @returns {Promise<Object>} Identification result
   */
  async identifySpeaker(audio, profileIds = []) {
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
      
      // Save audio temporarily for identification
      const identificationId = uuidv4();
      const audioFilename = `identify_${identificationId}.wav`;
      const audioPath = path.join(this.config.storageBasePath, audioFilename);
      
      // Save audio file locally
      fs.writeFileSync(audioPath, audioContent);
      
      // If no profileIds provided, get all completed profiles
      if (!profileIds || profileIds.length === 0) {
        const profilesSnapshot = await this.db.collection('speaker_profiles')
          .where('enrollmentStatus', '==', 'completed')
          .get();
        
        profileIds = profilesSnapshot.docs.map(doc => doc.id);
      }
      
      // Ensure we have profiles to check against
      if (profileIds.length === 0) {
        throw new Error('No completed speaker profiles available for identification');
      }
      
      // Process audio for identification
      const identificationResult = await this._processIdentification(audioPath, profileIds);
      
      // Store identification result
      const identificationData = {
        identificationId,
        audioPath,
        profileIds,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        results: identificationResult.matches || [],
        identified: identificationResult.identified
      };
      
      await this.db.collection('speaker_identifications').doc(identificationId).set(identificationData);
      
      // Clean up temporary audio file
      try {
        fs.unlinkSync(audioPath);
      } catch (err) {
        console.warn('Could not delete temporary identification audio:', err.message);
      }
      
      return {
        identified: identificationResult.identified,
        matches: identificationResult.matches || [],
        identificationId
      };
    } catch (error) {
      console.error('Error identifying speaker:', error);
      throw error;
    }
  }

  /**
   * Get all speaker profiles for a user
   * 
   * @param {string} userId - User ID
   * @returns {Promise<Array>} List of profiles
   */
  async getProfiles(userId) {
    await this.initialize();
    
    try {
      const profilesSnapshot = await this.db.collection('speaker_profiles')
        .where('userId', '==', userId)
        .get();
      
      return profilesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          profileId: doc.id,
          userId: data.userId,
          displayName: data.displayName,
          enrollmentStatus: data.enrollmentStatus,
          enrolledPhraseCount: data.enrolledPhrases ? data.enrolledPhrases.length : 0,
          createdAt: data.createdAt ? data.createdAt.toDate() : null,
          updatedAt: data.updatedAt ? data.updatedAt.toDate() : null
        };
      });
    } catch (error) {
      console.error('Error getting speaker profiles:', error);
      throw error;
    }
  }

  /**
   * Get speaker profile details
   * 
   * @param {string} profileId - Profile ID
   * @returns {Promise<Object>} Profile details
   */
  async getProfileDetails(profileId) {
    await this.initialize();
    
    try {
      const profileDoc = await this.db.collection('speaker_profiles').doc(profileId).get();
      
      if (!profileDoc.exists) {
        throw new Error(`Profile not found: ${profileId}`);
      }
      
      const data = profileDoc.data();
      
      // Get recent verifications
      const verificationsSnapshot = await this.db.collection('speaker_verifications')
        .where('profileId', '==', profileId)
        .orderBy('timestamp', 'desc')
        .limit(5)
        .get();
      
      const recentVerifications = verificationsSnapshot.docs.map(doc => {
        const vData = doc.data();
        return {
          verificationId: doc.id,
          timestamp: vData.timestamp ? vData.timestamp.toDate() : null,
          result: vData.result,
          confidence: vData.confidence
        };
      });
      
      return {
        profileId,
        userId: data.userId,
        displayName: data.displayName,
        description: data.description,
        enrollmentStatus: data.enrollmentStatus,
        enrolledPhrases: data.enrolledPhrases || [],
        locale: data.locale,
        createdAt: data.createdAt ? data.createdAt.toDate() : null,
        updatedAt: data.updatedAt ? data.updatedAt.toDate() : null,
        verificationThreshold: data.verificationThreshold,
        recentVerifications
      };
    } catch (error) {
      console.error('Error getting speaker profile details:', error);
      throw error;
    }
  }

  /**
   * Delete a speaker profile
   * 
   * @param {string} profileId - Profile ID
   * @returns {Promise<boolean>} Success indicator
   */
  async deleteProfile(profileId) {
    await this.initialize();
    
    try {
      // Get all enrollments for this profile
      const enrollmentsSnapshot = await this.db.collection('speaker_enrollments')
        .where('profileId', '==', profileId)
        .get();
      
      // Delete enrollment documents and audio files
      const enrollmentDeletePromises = enrollmentsSnapshot.docs.map(async (doc) => {
        const enrollmentData = doc.data();
        
        // Delete audio file if it exists
        if (enrollmentData.audioPath && fs.existsSync(enrollmentData.audioPath)) {
          fs.unlinkSync(enrollmentData.audioPath);
        }
        
        // Delete enrollment document
        return doc.ref.delete();
      });
      
      await Promise.all(enrollmentDeletePromises);
      
      // Delete profile document
      await this.db.collection('speaker_profiles').doc(profileId).delete();
      
      return true;
    } catch (error) {
      console.error('Error deleting speaker profile:', error);
      throw error;
    }
  }

  /**
   * Process enrollment with speaker recognition API
   * 
   * @param {string} profileId - Profile ID
   * @param {string} audioPath - Path to audio file
   * @param {string} phrase - Spoken phrase
   * @returns {Promise<Object>} Enrollment result
   * @private
   */
  async _processEnrollment(profileId, audioPath, phrase) {
    // This is a placeholder for the actual API call implementation
    // In a real implementation, you would call the speaker recognition API
    
    try {
      // Simulate API call with a delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // For demo purposes, always return success
      return {
        status: 'completed',
        quality: 0.85 + (Math.random() * 0.15) // Random quality between 0.85 and 1.0
      };
      
      // In a real implementation, you would do something like:
      /*
      const formData = new FormData();
      formData.append('audio', fs.createReadStream(audioPath));
      formData.append('profileId', profileId);
      formData.append('phrase', phrase);
      
      const response = await axios.post(`${this.apiEndpoint}/enroll`, formData, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          ...formData.getHeaders()
        }
      });
      
      return response.data;
      */
    } catch (error) {
      console.error('Error in enrollment processing:', error);
      throw error;
    }
  }

  /**
   * Process verification with speaker recognition API
   * 
   * @param {string} profileId - Profile ID
   * @param {string} audioPath - Path to audio file
   * @param {string} phrase - Expected phrase (optional)
   * @returns {Promise<Object>} Verification result
   * @private
   */
  async _processVerification(profileId, audioPath, phrase) {
    // This is a placeholder for the actual API call implementation
    
    try {
      // Simulate API call with a delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo purposes, return success with 80% probability
      const isSuccessful = Math.random() > 0.2;
      const confidence = isSuccessful ? 
        0.75 + (Math.random() * 0.25) : // Success: 0.75-1.0
        0.3 + (Math.random() * 0.44);   // Failure: 0.3-0.74
      
      return {
        result: isSuccessful ? 'success' : 'failed',
        confidence
      };
      
      // In a real implementation, you would do something like:
      /*
      const formData = new FormData();
      formData.append('audio', fs.createReadStream(audioPath));
      formData.append('profileId', profileId);
      if (phrase) formData.append('phrase', phrase);
      
      const response = await axios.post(`${this.apiEndpoint}/verify`, formData, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          ...formData.getHeaders()
        }
      });
      
      return response.data;
      */
    } catch (error) {
      console.error('Error in verification processing:', error);
      throw error;
    }
  }

  /**
   * Process identification with speaker recognition API
   * 
   * @param {string} audioPath - Path to audio file
   * @param {Array<string>} profileIds - Array of profile IDs
   * @returns {Promise<Object>} Identification result
   * @private
   */
  async _processIdentification(audioPath, profileIds) {
    // This is a placeholder for the actual API call implementation
    
    try {
      // Simulate API call with a delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // For demo purposes, randomly identify one of the profiles 70% of the time
      const willIdentify = Math.random() > 0.3;
      
      if (!willIdentify || profileIds.length === 0) {
        return {
          identified: false,
          matches: []
        };
      }
      
      // Randomly select a profile and assign high confidence
      const identifiedProfileIndex = Math.floor(Math.random() * profileIds.length);
      const identifiedProfileId = profileIds[identifiedProfileIndex];
      const confidence = 0.8 + (Math.random() * 0.2); // Between 0.8 and 1.0
      
      // Create matches for other profiles with lower confidence
      const matches = profileIds.map((profileId, index) => {
        // Top match gets high confidence, others get progressively lower
        const isTopMatch = index === identifiedProfileIndex;
        const matchConfidence = isTopMatch ? 
          confidence : 
          Math.max(0.2, 0.6 - (0.1 * (index !== identifiedProfileIndex ? index : 999)));
        
        return {
          profileId,
          confidence: matchConfidence
        };
      });
      
      // Sort by confidence descending
      matches.sort((a, b) => b.confidence - a.confidence);
      
      return {
        identified: true,
        matches
      };
      
      // In a real implementation, you would do something like:
      /*
      const formData = new FormData();
      formData.append('audio', fs.createReadStream(audioPath));
      formData.append('profileIds', JSON.stringify(profileIds));
      
      const response = await axios.post(`${this.apiEndpoint}/identify`, formData, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          ...formData.getHeaders()
        }
      });
      
      return response.data;
      */
    } catch (error) {
      console.error('Error in identification processing:', error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new SpeakerRecognitionService();