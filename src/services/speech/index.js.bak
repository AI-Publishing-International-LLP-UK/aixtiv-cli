/**
 * Speech Service
 *
 * Provides integration with Google STT (Speech-to-Text) and TTS (Text-to-Speech)
 * for copilot personalization, sentiment analysis, and speaker recognition.
 *
 * This service serves as a facade to provide access to:
 * - Core speech functionality through speech-core.js
 * - Speaker recognition through speaker-recognition.js
 *
 * (c) 2025 Copyright AI Publishing International LLP All Rights Reserved.
 * Developed with assistance from the Pilots of Vision Lake.
 */

// Import core speech and speaker recognition services
const speechCore = require('./speech-core');
const speakerRecognition = require('./speaker-recognition');

// Export combined speech service
module.exports = {
  // Direct pass-through to speech core functions
  initialize: async () => speechCore.initialize(),
  transcribe: async (audio, options) => speechCore.transcribe(audio, options),
  textToSpeech: async (text, options) => speechCore.textToSpeech(text, options),
  analyzeSentiment: async (text) => speechCore.analyzeSentiment(text),
  getPersonalization: async (userId, copilotId) => speechCore.getPersonalization(userId, copilotId),
  setPersonalization: async (userId, copilotId, settings) =>
    speechCore.setPersonalization(userId, copilotId, settings),

  // Speaker recognition functions
  createSpeakerProfile: async (userId, profileData) =>
    speakerRecognition.createProfile(userId, profileData),
  enrollSpeaker: async (profileId, audio, phrase) =>
    speakerRecognition.enrollSpeaker(profileId, audio, phrase),
  verifySpeaker: async (profileId, audio, phrase) =>
    speakerRecognition.verifySpeaker(profileId, audio, phrase),
  identifySpeaker: async (audio, profileIds) =>
    speakerRecognition.identifySpeaker(audio, profileIds),
  getSpeakerProfiles: async (userId) => speakerRecognition.getProfiles(userId),
  getSpeakerProfileDetails: async (profileId) => speakerRecognition.getProfileDetails(profileId),
  deleteSpeakerProfile: async (profileId) => speakerRecognition.deleteProfile(profileId),
};
