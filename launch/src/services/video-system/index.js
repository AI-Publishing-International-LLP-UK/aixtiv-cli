/**
 * Video System Integration Service
 *
 * Provides integration with automated video system using green screen
 * technology and Google Video Generation API for RIX, CRX, and Co-Pilots.
 *
 * Organization: COACHING2100
 *
 * (c) 2025 Copyright AI Publishing International LLP All Rights Reserved.
 * Developed with assistance from the Pilots of Vision Lake.
 */

const axios = require('axios');
const admin = require('firebase-admin');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

// Initialize Secret Manager
const secretManager = new SecretManagerServiceClient();

class VideoSystem {
  constructor() {
    this.initialized = false;
    this.config = {
      apiEndpoint: process.env.VIDEO_SYSTEM_API_ENDPOINT || 'https://video.coaching2100.com/api',
      googleVideoEndpoint:
        process.env.GOOGLE_VIDEO_API_ENDPOINT || 'https://videoapi.googleapis.com/v1',
      region: process.env.GCP_REGION || 'us-west1',
      zone: process.env.GCP_ZONE || 'us-west1-b',
      projectId: process.env.GCP_PROJECT_ID || 'api-for-warp-drive',
      orgId: process.env.ORG_ID || 'COACHING2100',
      interfaces: {
        v1Enabled: true,
        v2Enabled: true,
      },
    };

    // Import interface components
    try {
      this.interface = require('./interface');
      console.log('Video system interface loaded successfully');
    } catch (error) {
      console.warn('Video system interface could not be loaded:', error.message);
      this.interface = null;
    }

    // Initialize Firebase Admin if not already initialized
    if (!admin.apps.length) {
      admin.initializeApp();
    }

    this.db = admin.firestore();
  }

  /**
   * Initialize the Video System
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Load API keys from Secret Manager
      const [videoKeyVersion] = await secretManager.accessSecretVersion({
        name: `projects/${this.config.projectId}/secrets/video-system-api-key/versions/latest`,
      });

      const [googleKeyVersion] = await secretManager.accessSecretVersion({
        name: `projects/${this.config.projectId}/secrets/google-video-api-key/versions/latest`,
      });

      this.videoApiKey = videoKeyVersion.payload.data.toString();
      this.googleApiKey = googleKeyVersion.payload.data.toString();

      // Configure axios clients
      this.videoClient = axios.create({
        baseURL: this.config.apiEndpoint,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.videoApiKey,
          'X-Organization': this.config.orgId,
          'X-Region': this.config.region,
        },
      });

      this.googleClient = axios.create({
        baseURL: this.config.googleVideoEndpoint,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.googleApiKey}`,
        },
      });

      this.initialized = true;
      console.log('Video System initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Video System:', error.message);
      throw error;
    }
  }

  /**
   * Create a video session for an agent
   *
   * @param {Object} config - Session configuration
   * @returns {Promise<Object>} - Session details
   */
  async createSession(config) {
    await this.initialize();

    try {
      const sessionData = {
        agentId: config.agentId,
        agentType: config.agentType,
        title: config.title || `${config.agentType} Video Session`,
        description: config.description || 'Automated video session',
        settings: {
          resolution: config.resolution || '1080p',
          frameRate: config.frameRate || 30,
          greenScreen: config.greenScreen !== false,
          googleVideoGeneration: config.googleVideoGeneration !== false,
        },
        interfaceVersion: config.interfaceVersion || 'v2',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Create session in Firestore
      const sessionRef = await this.db.collection('video_sessions').add(sessionData);
      const sessionId = sessionRef.id;

      // Update with ID
      await sessionRef.update({ id: sessionId });

      // Register session with video system API
      const apiResponse = await this.videoClient.post('/sessions', {
        id: sessionId,
        ...sessionData,
      });

      // Update with system data
      await sessionRef.update({
        systemSessionId: apiResponse.data.sessionId,
        status: 'ready',
      });

      return {
        id: sessionId,
        systemSessionId: apiResponse.data.sessionId,
        status: 'ready',
        ...sessionData,
      };
    } catch (error) {
      console.error('Failed to create video session:', error.message);
      throw error;
    }
  }

  /**
   * Generate background video using Google Video Generation API
   *
   * @param {Object} config - Background configuration
   * @returns {Promise<Object>} - Background generation details
   */
  async generateBackground(config) {
    await this.initialize();

    try {
      // Validate config
      if (!config.prompt) {
        throw new Error('Background generation requires a prompt');
      }

      // Create background generation job
      const response = await this.googleClient.post('/videos:generate', {
        prompt: config.prompt,
        duration: config.duration || '30s',
        resolution: config.resolution || '1080p',
        outputFormat: config.format || 'mp4',
      });

      // Store job details in Firestore
      const jobData = {
        jobId: response.data.name,
        prompt: config.prompt,
        duration: config.duration || '30s',
        status: 'processing',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await this.db.collection('background_generation_jobs').doc(response.data.name).set(jobData);

      return {
        jobId: response.data.name,
        status: 'processing',
        estimatedCompletionTime: response.data.metadata?.estimatedCompletionTime,
      };
    } catch (error) {
      console.error('Failed to generate background video:', error.message);
      throw error;
    }
  }

  /**
   * Generate agent video with green screen
   *
   * @param {string} sessionId - Video session ID
   * @param {Object} config - Video configuration
   * @returns {Promise<Object>} - Video generation details
   */
  async generateAgentVideo(sessionId, config) {
    await this.initialize();

    try {
      // Get session data
      const sessionDoc = await this.db.collection('video_sessions').doc(sessionId).get();

      if (!sessionDoc.exists) {
        throw new Error(`Video session not found: ${sessionId}`);
      }

      const sessionData = sessionDoc.data();

      // Use interface components if available
      if (this.interface && sessionData.settings.useInterface) {
        console.log('Using browser interface for video generation');
        const browser = new this.interface.Browser();
        const page = await browser.newPage();
        // Set up browser for video recording
        await page.setViewport({
          width: parseInt(sessionData.settings.resolution.replace('p', '')),
          height: (parseInt(sessionData.settings.resolution.replace('p', '')) * 9) / 16,
          deviceScaleFactor: 1,
        });
        console.log('Browser interface configured for video recording');
      }

      // Create video generation job
      const jobData = {
        sessionId,
        agentId: sessionData.agentId,
        agentType: sessionData.agentType,
        script: config.script,
        duration: config.duration || 30,
        settings: {
          greenScreen: sessionData.settings.greenScreen,
          resolution: sessionData.settings.resolution,
          frameRate: sessionData.settings.frameRate,
        },
        backgroundId: config.backgroundId,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Store job in Firestore
      const jobRef = await this.db.collection('agent_video_jobs').add(jobData);
      const jobId = jobRef.id;

      // Update with ID
      await jobRef.update({ id: jobId });

      // Submit job to video system API
      const apiResponse = await this.videoClient.post('/agent-videos', {
        jobId,
        sessionId,
        agentId: sessionData.agentId,
        agentType: sessionData.agentType,
        script: config.script,
        duration: config.duration || 30,
        backgroundId: config.backgroundId,
        settings: jobData.settings,
      });

      // Update job with system data
      await jobRef.update({
        systemJobId: apiResponse.data.jobId,
        status: 'processing',
        estimatedCompletionTime: apiResponse.data.estimatedCompletionTime,
      });

      return {
        jobId,
        systemJobId: apiResponse.data.jobId,
        status: 'processing',
        estimatedCompletionTime: apiResponse.data.estimatedCompletionTime,
      };
    } catch (error) {
      console.error('Failed to generate agent video:', error.message);
      throw error;
    }
  }

  /**
   * Combine agent green screen footage with background
   *
   * @param {string} agentJobId - Agent video job ID
   * @param {string} backgroundJobId - Background generation job ID
   * @returns {Promise<Object>} - Combined video details
   */
  async combineVideos(agentJobId, backgroundJobId) {
    await this.initialize();

    try {
      // Get job data
      const agentJobDoc = await this.db.collection('agent_video_jobs').doc(agentJobId).get();
      const backgroundJobDoc = await this.db
        .collection('background_generation_jobs')
        .doc(backgroundJobId)
        .get();

      if (!agentJobDoc.exists || !backgroundJobDoc.exists) {
        throw new Error('One or more jobs not found');
      }

      // Create composition job
      const compositionData = {
        agentJobId,
        backgroundJobId,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Store composition in Firestore
      const compositionRef = await this.db.collection('video_compositions').add(compositionData);
      const compositionId = compositionRef.id;

      // Update with ID
      await compositionRef.update({ id: compositionId });

      // Submit composition to video system API
      const apiResponse = await this.videoClient.post('/compositions', {
        compositionId,
        agentJobId,
        backgroundJobId,
      });

      // Update composition with system data
      await compositionRef.update({
        systemCompositionId: apiResponse.data.compositionId,
        status: 'processing',
        estimatedCompletionTime: apiResponse.data.estimatedCompletionTime,
      });

      return {
        compositionId,
        systemCompositionId: apiResponse.data.compositionId,
        status: 'processing',
        estimatedCompletionTime: apiResponse.data.estimatedCompletionTime,
      };
    } catch (error) {
      console.error('Failed to combine videos:', error.message);
      throw error;
    }
  }

  /**
   * Check job status
   *
   * @param {string} jobId - Job ID
   * @param {string} jobType - Job type (agent, background, composition)
   * @returns {Promise<Object>} - Job status details
   */
  async checkJobStatus(jobId, jobType) {
    await this.initialize();

    try {
      let jobDoc;
      let apiEndpoint;

      // Get collection and API endpoint based on job type
      switch (jobType) {
        case 'agent':
          jobDoc = await this.db.collection('agent_video_jobs').doc(jobId).get();
          apiEndpoint = `/agent-videos/${jobDoc.data().systemJobId}`;
          break;
        case 'background':
          jobDoc = await this.db.collection('background_generation_jobs').doc(jobId).get();
          return await this.checkGoogleVideoJob(jobId);
        case 'composition':
          jobDoc = await this.db.collection('video_compositions').doc(jobId).get();
          apiEndpoint = `/compositions/${jobDoc.data().systemCompositionId}`;
          break;
        default:
          throw new Error(`Invalid job type: ${jobType}`);
      }

      if (!jobDoc.exists) {
        throw new Error(`Job not found: ${jobId}`);
      }

      // Check status with video system API
      const apiResponse = await this.videoClient.get(apiEndpoint);

      // Update job status in Firestore
      await jobDoc.ref.update({
        status: apiResponse.data.status,
        progress: apiResponse.data.progress,
        videoUrl: apiResponse.data.videoUrl,
        thumbnailUrl: apiResponse.data.thumbnailUrl,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        id: jobId,
        status: apiResponse.data.status,
        progress: apiResponse.data.progress,
        videoUrl: apiResponse.data.videoUrl,
        thumbnailUrl: apiResponse.data.thumbnailUrl,
      };
    } catch (error) {
      console.error('Failed to check job status:', error.message);
      throw error;
    }
  }

  /**
   * Check Google Video Generation job status
   *
   * @param {string} jobId - Google operation name
   * @returns {Promise<Object>} - Job status details
   */
  async checkGoogleVideoJob(jobId) {
    try {
      // Get operation status from Google API
      const response = await this.googleClient.get(`/operations/${jobId}`);

      // Parse status
      const status = response.data.done ? 'completed' : 'processing';
      const progress = response.data.metadata?.progress || 0;

      // Get video URL if completed
      let videoUrl = null;
      if (status === 'completed' && response.data.response?.video) {
        videoUrl = response.data.response.video.uri;
      }

      // Update job in Firestore
      await this.db.collection('background_generation_jobs').doc(jobId).update({
        status,
        progress,
        videoUrl,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        id: jobId,
        status,
        progress,
        videoUrl,
      };
    } catch (error) {
      console.error('Failed to check Google video job status:', error.message);
      throw error;
    }
  }

  /**
   * Get video download URL
   *
   * @param {string} jobId - Job ID
   * @param {string} jobType - Job type (agent, background, composition)
   * @returns {Promise<string>} - Download URL
   */
  async getVideoDownloadUrl(jobId, jobType) {
    await this.initialize();

    try {
      let jobDoc;

      // Get job document based on job type
      switch (jobType) {
        case 'agent':
          jobDoc = await this.db.collection('agent_video_jobs').doc(jobId).get();
          break;
        case 'background':
          jobDoc = await this.db.collection('background_generation_jobs').doc(jobId).get();
          break;
        case 'composition':
          jobDoc = await this.db.collection('video_compositions').doc(jobId).get();
          break;
        default:
          throw new Error(`Invalid job type: ${jobType}`);
      }

      if (!jobDoc.exists) {
        throw new Error(`Job not found: ${jobId}`);
      }

      // Check if job is completed
      if (jobDoc.data().status !== 'completed') {
        throw new Error(`Job is not completed: ${jobId}`);
      }

      // Get download URL
      let downloadUrl;

      if (jobType === 'background') {
        // Get download URL from Google
        const response = await this.googleClient.get(`/videos/${jobId}:download`);
        downloadUrl = response.data.downloadUri;
      } else {
        // Get download URL from video system API
        const systemId =
          jobType === 'agent' ? jobDoc.data().systemJobId : jobDoc.data().systemCompositionId;

        const apiEndpoint =
          jobType === 'agent'
            ? `/agent-videos/${systemId}/download`
            : `/compositions/${systemId}/download`;

        const response = await this.videoClient.get(apiEndpoint);
        downloadUrl = response.data.downloadUrl;
      }

      return downloadUrl;
    } catch (error) {
      console.error('Failed to get video download URL:', error.message);
      throw error;
    }
  }

  /**
   * List available backgrounds
   *
   * @returns {Promise<Array>} - List of backgrounds
   */
  async listBackgrounds() {
    await this.initialize();

    try {
      const response = await this.videoClient.get('/backgrounds');
      return response.data.backgrounds;
    } catch (error) {
      console.error('Failed to list backgrounds:', error.message);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new VideoSystem();
