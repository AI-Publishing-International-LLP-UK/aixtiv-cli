const { ElevenLabs } = require('elevenlabs-node');
const textToSpeech = require('@google-cloud/text-to-speech');
const voiceConfig = require('../../config/voice/voice-config.json');

class VoiceManager {
  constructor() {
    this.elevenLabs = new ElevenLabs();
    this.googleTTS = new textToSpeech.TextToSpeechClient();
  }

  async getPilotVoice(pilotId) {
    const pilotConfig = voiceConfig.pilots.elevenlabs[pilotId];
    if (!pilotConfig) {
      throw new Error(`Pilot voice configuration not found for ${pilotId}`);
    }
    return pilotConfig;
  }

  async getCoPilotVoice(category) {
    const voices = voiceConfig.coPilots.google.voice_pools[category];
    if (!voices || voices.length === 0) {
      throw new Error(`No co-pilot voices found for category ${category}`);
    }
    // Randomly select a voice from the pool
    return voices[Math.floor(Math.random() * voices.length)];
  }

  async getSystemVoice(type) {
    return voiceConfig.systemVoices.google[type] || voiceConfig.systemVoices.google.general;
  }

  async generatePilotSpeech(pilotId, text, language = 'en', emotion = 'neutral') {
    const pilotVoice = await this.getPilotVoice(pilotId);
    // Verify language support
    const pilotConfig = await this.getPilotVoice(pilotId);
    if (!pilotConfig.supportedLanguages.includes(language)) {
      throw new Error(`Language ${language} not supported for pilot ${pilotId}`);
    }

    return this.elevenLabs.generateVoice({
      voiceId: pilotVoice.voiceId,
      text,
      model: pilotVoice.model,
      emotion,
      language,
    });
  }

  async generateCoPilotSpeech(category, text) {
    const voice = await this.getCoPilotVoice(category);
    const request = {
      input: { text },
      voice: { languageCode: voice.split('-')[0] + '-' + voice.split('-')[1], name: voice },
      audioConfig: { audioEncoding: 'MP3' },
    };
    const [response] = await this.googleTTS.synthesizeSpeech(request);
    return response.audioContent;
  }

  async generateSystemSpeech(type, text) {
    const voice = await this.getSystemVoice(type);
    const request = {
      input: { text },
      voice: { languageCode: 'en-US', name: voice },
      audioConfig: { audioEncoding: 'MP3' },
    };
    const [response] = await this.googleTTS.synthesizeSpeech(request);
    return response.audioContent;
  }
}

module.exports = new VoiceManager();
