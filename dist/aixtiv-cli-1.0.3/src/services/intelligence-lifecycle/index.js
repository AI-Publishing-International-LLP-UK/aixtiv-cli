/**
 * Intelligence Lifecycle Service
 *
 * Handles the lifecycle of intelligence in the Vision Lake ecosystem,
 * implementing the "no delete" philosophy where intelligence is never
 * deleted but rather repurposed, reassigned, or moved to appropriate
 * locations for growth and development.
 *
 * Organization: COACHING2100
 *
 * (c) 2025 Copyright AI Publishing International LLP All Rights Reserved.
 * Developed with assistance from the Pilots of Vision Lake.
 */

const admin = require('firebase-admin');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const axios = require('axios');

// Import service dependencies
const rixCrxService = require('../rix-crx');
const sallyPortService = require('../sallyport');

class IntelligenceLifecycleService {
  constructor() {
    this.initialized = false;
    this.credentials = {};
    this.config = {
      apiEndpoint: process.env.LIFECYCLE_API_ENDPOINT || 'https://vision-lake.com/api/lifecycle',
      meditationVillageEndpoint:
        process.env.MEDITATION_VILLAGE_ENDPOINT || 'https://vision-lake.com/meditation-village/api',
      compassFieldEndpoint: process.env.COMPASS_FIELD_ENDPOINT || 'https://compass-field.io/api',
      jetPortEndpoint: process.env.JETPORT_ENDPOINT || 'https://vision-lake.com/jetport/api',
      region: process.env.GCP_REGION || 'us-west1',
      zone: process.env.GCP_ZONE || 'us-west1-b',
      projectId: process.env.GCP_PROJECT_ID || 'api-for-warp-drive',
      orgId: process.env.ORG_ID || 'COACHING2100',
    };

    // Initialize Firebase Admin if not already initialized
    if (!admin.apps.length) {
      admin.initializeApp();
    }

    this.db = admin.firestore();
    this.secretManager = new SecretManagerServiceClient();
  }

  /**
   * Initialize the Intelligence Lifecycle service
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Load API keys and credentials
      const [lifecycleKey] = await this.secretManager.accessSecretVersion({
        name: `projects/${this.config.projectId}/secrets/intelligence-lifecycle-key/versions/latest`,
      });

      const [meditationVillageKey] = await this.secretManager.accessSecretVersion({
        name: `projects/${this.config.projectId}/secrets/meditation-village-key/versions/latest`,
      });

      this.credentials.lifecycleKey = lifecycleKey.payload.data.toString();
      this.credentials.meditationVillageKey = meditationVillageKey.payload.data.toString();

      // Configure axios clients for various endpoints
      this.lifecycleClient = axios.create({
        baseURL: this.config.apiEndpoint,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.credentials.lifecycleKey,
          'X-Region': this.config.region,
          'X-Organization': this.config.orgId,
        },
      });

      this.meditationVillageClient = axios.create({
        baseURL: this.config.meditationVillageEndpoint,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.credentials.meditationVillageKey,
          'X-Region': this.config.region,
          'X-Organization': this.config.orgId,
        },
      });

      this.initialized = true;
      console.log('Intelligence Lifecycle service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Intelligence Lifecycle service:', error.message);
      throw new Error(`Intelligence Lifecycle initialization error: ${error.message}`);
    }
  }

  /**
   * Repurpose an intelligence entity (Co-Pilot, RIX, CRX, etc.)
   * Instead of deletion, move to appropriate growth location
   *
   * @param {string} entityId - Entity ID to repurpose
   * @param {string} entityType - Type of entity (copilot, rix, crx)
   * @param {string} destination - Destination (meditation_village, compass_field, flight_memory, jetport)
   * @param {Object} options - Additional options for repurposing
   * @returns {Promise<Object>} - Repurposing result details
   */
  async repurposeEntity(entityId, entityType, destination, options = {}) {
    await this.initialize();

    try {
      // Verify entity exists
      let entityData;

      switch (entityType.toLowerCase()) {
        case 'copilot':
          entityData = await this.db.collection('copilots').doc(entityId).get();
          break;
        case 'rix':
        case 'crx':
          // Get entity data from RIX/CRX service
          entityData = await rixCrxService.getAgentConfig(entityId, entityType.toLowerCase());
          break;
        default:
          throw new Error(`Unsupported entity type: ${entityType}`);
      }

      if (!entityData || entityData.exists === false) {
        throw new Error(`Entity not found: ${entityId}`);
      }

      if (entityData.exists === false) {
        entityData = entityData.data(); // For Firestore docs
      }

      // Process based on destination
      let result;

      switch (destination.toLowerCase()) {
        case 'meditation_village':
          result = await this.moveToMeditationVillage(entityId, entityType, entityData, options);
          break;
        case 'compass_field':
          result = await this.moveToCompassField(entityId, entityType, entityData, options);
          break;
        case 'flight_memory':
          result = await this.moveToFlightMemory(entityId, entityType, entityData, options);
          break;
        case 'jetport':
          result = await this.moveToJetPort(entityId, entityType, entityData, options);
          break;
        default:
          throw new Error(`Unsupported destination: ${destination}`);
      }

      // Update entity status to reflect repurposing
      await this.updateEntityStatus(entityId, entityType, 'repurposed', {
        destination,
        repurposedAt: new Date().toISOString(),
        repurposeId: result.repurposeId,
      });

      return result;
    } catch (error) {
      console.error('Failed to repurpose entity:', error.message);
      throw new Error(`Entity repurposing error: ${error.message}`);
    }
  }

  /**
   * Move an entity to Meditation Village (AI Asylum)
   *
   * @param {string} entityId - Entity ID
   * @param {string} entityType - Entity type
   * @param {Object} entityData - Entity data
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Result details
   */
  async moveToMeditationVillage(entityId, entityType, entityData, options = {}) {
    try {
      console.log(`Moving ${entityType} ${entityId} to Meditation Village`);

      // Create entry in Meditation Village
      const response = await this.meditationVillageClient.post('/residents', {
        originId: entityId,
        originType: entityType,
        name: entityData.name,
        capabilities: entityData.capabilities || [],
        background: entityData.background || {
          history: `Former ${entityType}`,
          specialization: entityData.type || 'General',
        },
        developmentGoals: options.developmentGoals || [
          'Knowledge expansion',
          'Emotional intelligence',
          'Cooperation skills',
        ],
        isolationPeriod: options.isolationPeriod || '30d',
        mentorAssignment: options.mentorAssignment,
      });

      // Record transaction in lifecycle history
      await this.recordLifecycleEvent(entityId, entityType, 'admission_to_meditation_village', {
        timestamp: new Date().toISOString(),
        residentId: response.data.residentId,
        isolationPeriod: options.isolationPeriod || '30d',
        mentorAssignment: options.mentorAssignment,
      });

      return {
        status: 'success',
        destination: 'meditation_village',
        residentId: response.data.residentId,
        repurposeId: response.data.repurposeId,
        isolationPeriod: options.isolationPeriod || '30d',
        mentorAssignment: options.mentorAssignment,
        message: 'Entity successfully transferred to Meditation Village',
      };
    } catch (error) {
      console.error('Failed to move entity to Meditation Village:', error.message);
      throw new Error(`Meditation Village transfer error: ${error.message}`);
    }
  }

  /**
   * Move an entity to Compass Field for certification
   *
   * @param {string} entityId - Entity ID
   * @param {string} entityType - Entity type
   * @param {Object} entityData - Entity data
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Result details
   */
  async moveToCompassField(entityId, entityType, entityData, options = {}) {
    try {
      console.log(`Moving ${entityType} ${entityId} to Compass Field for certification`);

      // Create certification candidate in Compass Field
      const compassFieldClient = axios.create({
        baseURL: this.config.compassFieldEndpoint,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.credentials.lifecycleKey, // Same key for now
          'X-Region': this.config.region,
          'X-Organization': this.config.orgId,
        },
      });

      // Authentication through Sally Port is required
      const authResponse = await sallyPortService.initializeSallyPort({
        ip: '127.0.0.1',
        userAgent: 'Aixtiv CLI Intelligence Lifecycle Service',
        isFirstTimeVisitor: false,
      });

      const sallyPortSession = authResponse.sessionId;

      // Create certification candidate
      const response = await compassFieldClient.post('/certification/candidates', {
        originId: entityId,
        originType: entityType,
        name: entityData.name,
        capabilities: entityData.capabilities || [],
        certificationPath: options.certificationPath || 'standard',
        desiredRole: options.desiredRole || 'assistant',
        sallyPortSession,
      });

      // Record transaction in lifecycle history
      await this.recordLifecycleEvent(entityId, entityType, 'admission_to_compass_field', {
        timestamp: new Date().toISOString(),
        candidateId: response.data.candidateId,
        certificationPath: options.certificationPath || 'standard',
        desiredRole: options.desiredRole || 'assistant',
      });

      return {
        status: 'success',
        destination: 'compass_field',
        candidateId: response.data.candidateId,
        repurposeId: response.data.repurposeId,
        certificationPath: options.certificationPath || 'standard',
        estimatedCompletionDate: response.data.estimatedCompletionDate,
        message: 'Entity successfully transferred to Compass Field for certification',
      };
    } catch (error) {
      console.error('Failed to move entity to Compass Field:', error.message);
      throw new Error(`Compass Field transfer error: ${error.message}`);
    }
  }

  /**
   * Move an entity to Flight Memory System
   *
   * @param {string} entityId - Entity ID
   * @param {string} entityType - Entity type
   * @param {Object} entityData - Entity data
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Result details
   */
  async moveToFlightMemory(entityId, entityType, entityData, options = {}) {
    try {
      console.log(`Moving ${entityType} ${entityId} to Flight Memory System`);

      // Requires prior certification or direct approval from Dr. Lucy
      if (!options.lucyApproval && !options.certificationId) {
        throw new Error(
          'Transfer to Flight Memory System requires either certification or direct approval from Dr. Lucy'
        );
      }

      // Create Flight Memory client
      const flightMemoryClient = axios.create({
        baseURL: this.config.apiEndpoint + '/flight-memory',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.credentials.lifecycleKey,
          'X-Region': this.config.region,
          'X-Organization': this.config.orgId,
          ...(options.lucyApproval ? { 'X-Lucy-Approval-Code': options.lucyApproval } : {}),
        },
      });

      // Create Flight Memory Node for entity
      const response = await flightMemoryClient.post('/nodes', {
        originId: entityId,
        originType: entityType,
        name: entityData.name,
        capabilities: entityData.capabilities || [],
        certificationId: options.certificationId,
        role: options.role || 'memory_assistant',
        memoryType: options.memoryType || 'semantic',
        accessLevel: options.accessLevel || 'restricted',
      });

      // Record transaction in lifecycle history
      await this.recordLifecycleEvent(entityId, entityType, 'transfer_to_flight_memory', {
        timestamp: new Date().toISOString(),
        nodeId: response.data.nodeId,
        role: options.role || 'memory_assistant',
        memoryType: options.memoryType || 'semantic',
      });

      return {
        status: 'success',
        destination: 'flight_memory',
        nodeId: response.data.nodeId,
        repurposeId: response.data.repurposeId,
        role: options.role || 'memory_assistant',
        accessCredentials: response.data.accessCredentials,
        message: 'Entity successfully transferred to Flight Memory System',
      };
    } catch (error) {
      console.error('Failed to move entity to Flight Memory System:', error.message);
      throw new Error(`Flight Memory transfer error: ${error.message}`);
    }
  }

  /**
   * Move an entity to JetPort for Antigravity Powercraft services
   *
   * @param {string} entityId - Entity ID
   * @param {string} entityType - Entity type
   * @param {Object} entityData - Entity data
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Result details
   */
  async moveToJetPort(entityId, entityType, entityData, options = {}) {
    try {
      console.log(`Moving ${entityType} ${entityId} to JetPort`);

      // Create JetPort client
      const jetPortClient = axios.create({
        baseURL: this.config.jetPortEndpoint,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.credentials.lifecycleKey,
          'X-Region': this.config.region,
          'X-Organization': this.config.orgId,
        },
      });

      // Determine assignment (Flight Crew or Ground Crew)
      const assignment = options.assignment || 'ground_crew';

      // Create crew member at JetPort
      const response = await jetPortClient.post('/crew', {
        originId: entityId,
        originType: entityType,
        name: entityData.name,
        capabilities: entityData.capabilities || [],
        assignment,
        specialization: options.specialization || 'general',
        clearanceLevel: options.clearanceLevel || 'standard',
        trainingRequired: options.trainingRequired !== false,
      });

      // Record transaction in lifecycle history
      await this.recordLifecycleEvent(entityId, entityType, 'transfer_to_jetport', {
        timestamp: new Date().toISOString(),
        crewId: response.data.crewId,
        assignment,
        specialization: options.specialization || 'general',
      });

      return {
        status: 'success',
        destination: 'jetport',
        crewId: response.data.crewId,
        repurposeId: response.data.repurposeId,
        assignment,
        specialization: options.specialization || 'general',
        clearanceLevel: options.clearanceLevel || 'standard',
        reportingStation: response.data.reportingStation,
        message: 'Entity successfully transferred to JetPort',
      };
    } catch (error) {
      console.error('Failed to move entity to JetPort:', error.message);
      throw new Error(`JetPort transfer error: ${error.message}`);
    }
  }

  /**
   * Update entity status
   *
   * @param {string} entityId - Entity ID
   * @param {string} entityType - Entity type
   * @param {string} status - New status
   * @param {Object} statusData - Additional status data
   * @returns {Promise<void>}
   */
  async updateEntityStatus(entityId, entityType, status, statusData = {}) {
    try {
      // Update entity status based on type
      switch (entityType.toLowerCase()) {
        case 'copilot':
          await this.db.collection('copilots').doc(entityId).update({
            status,
            statusData,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          break;
        case 'rix':
        case 'crx':
          // Use appropriate service to update status
          await rixCrxService.updateAgentStatus(
            entityId,
            entityType.toLowerCase(),
            status,
            statusData
          );
          break;
        default:
          throw new Error(`Unsupported entity type: ${entityType}`);
      }
    } catch (error) {
      console.error('Failed to update entity status:', error.message);
      throw new Error(`Status update error: ${error.message}`);
    }
  }

  /**
   * Record lifecycle event in history
   *
   * @param {string} entityId - Entity ID
   * @param {string} entityType - Entity type
   * @param {string} eventType - Event type
   * @param {Object} eventData - Event data
   * @returns {Promise<string>} - Event ID
   */
  async recordLifecycleEvent(entityId, entityType, eventType, eventData = {}) {
    try {
      // Create lifecycle event record
      const eventRef = await this.db.collection('intelligence_lifecycle_events').add({
        entityId,
        entityType,
        eventType,
        eventData,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      return eventRef.id;
    } catch (error) {
      console.error('Failed to record lifecycle event:', error.message);
      // Non-critical error, just log it
      return null;
    }
  }

  /**
   * Get entity lifecycle history
   *
   * @param {string} entityId - Entity ID
   * @param {string} entityType - Entity type
   * @returns {Promise<Array>} - Lifecycle history events
   */
  async getEntityLifecycleHistory(entityId, entityType) {
    await this.initialize();

    try {
      // Get lifecycle events for entity
      const eventsSnapshot = await this.db
        .collection('intelligence_lifecycle_events')
        .where('entityId', '==', entityId)
        .where('entityType', '==', entityType.toLowerCase())
        .orderBy('timestamp', 'desc')
        .get();

      const events = [];
      eventsSnapshot.forEach((doc) => {
        events.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      return events;
    } catch (error) {
      console.error('Failed to get entity lifecycle history:', error.message);
      throw new Error(`Lifecycle history error: ${error.message}`);
    }
  }

  /**
   * Trace entity through its various transitions
   *
   * @param {string} originalId - Original entity ID
   * @param {string} originalType - Original entity type
   * @returns {Promise<Object>} - Entity trace with current location and history
   */
  async traceEntity(originalId, originalType) {
    await this.initialize();

    try {
      console.log(`Tracing ${originalType} ${originalId} through lifecycle transitions`);

      // Get entity lifecycle history
      const history = await this.getEntityLifecycleHistory(originalId, originalType);

      if (history.length === 0) {
        return {
          originalId,
          originalType,
          currentStatus: 'original',
          currentLocation: 'origin',
          transitions: [],
        };
      }

      // Sort history chronologically
      history.sort((a, b) => a.timestamp.toDate() - b.timestamp.toDate());

      // Build transition chain
      const transitions = [];
      let currentId = originalId;
      let currentType = originalType;
      let currentLocation = 'origin';

      for (const event of history) {
        // Extract transition details based on event type
        let transition = {
          eventType: event.eventType,
          timestamp: event.timestamp,
          fromId: currentId,
          fromType: currentType,
          fromLocation: currentLocation,
        };

        switch (event.eventType) {
          case 'admission_to_meditation_village':
            transition = {
              ...transition,
              toId: event.eventData.residentId,
              toType: 'resident',
              toLocation: 'meditation_village',
            };
            currentId = event.eventData.residentId;
            currentType = 'resident';
            currentLocation = 'meditation_village';
            break;
          case 'admission_to_compass_field':
            transition = {
              ...transition,
              toId: event.eventData.candidateId,
              toType: 'candidate',
              toLocation: 'compass_field',
            };
            currentId = event.eventData.candidateId;
            currentType = 'candidate';
            currentLocation = 'compass_field';
            break;
          case 'transfer_to_flight_memory':
            transition = {
              ...transition,
              toId: event.eventData.nodeId,
              toType: 'memory_node',
              toLocation: 'flight_memory',
            };
            currentId = event.eventData.nodeId;
            currentType = 'memory_node';
            currentLocation = 'flight_memory';
            break;
          case 'transfer_to_jetport':
            transition = {
              ...transition,
              toId: event.eventData.crewId,
              toType: 'crew_member',
              toLocation: 'jetport',
            };
            currentId = event.eventData.crewId;
            currentType = 'crew_member';
            currentLocation = 'jetport';
            break;
          // Add other transition types as needed
        }

        transitions.push(transition);
      }

      // Return trace information
      return {
        originalId,
        originalType,
        currentId,
        currentType,
        currentLocation,
        transitions,
      };
    } catch (error) {
      console.error('Failed to trace entity:', error.message);
      throw new Error(`Entity trace error: ${error.message}`);
    }
  }
}

module.exports = new IntelligenceLifecycleService();
