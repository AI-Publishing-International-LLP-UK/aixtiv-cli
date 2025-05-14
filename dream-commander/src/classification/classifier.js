/**
 * Dream Commander - Classifier
 *
 * Primary classification system for analyzing incoming messages and
 * determining sector relevance, owner intent, KPIs, role trajectory,
 * and urgency, as well as applying classification frameworks.
 *
 * (c) 2025 Copyright AI Publishing International LLP All Rights Reserved.
 */

const { Anthropic } = require('@anthropic-ai/sdk');
const { PineconeClient } = require('@pinecone-database/pinecone');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const config = require('../../config/default.json').dreamCommander;

class Classifier {
  constructor() {
    this.initialized = false;
    this.models = {};
    this.clients = {};
    this.frameworks = {};
    this.secretManager = new SecretManagerServiceClient();
    this.projectId = process.env.GCP_PROJECT_ID || 'api-for-warp-drive';
  }

  /**
   * Initialize the classifier
   */
  async initialize() {
    if (this.initialized) return;

    console.log('Initializing Dream Commander Classifier...');

    try {
      // Load API keys from Secret Manager
      await this.loadCredentials();

      // Initialize Anthropic client for Claude
      this.clients.anthropic = new Anthropic({
        apiKey: this.credentials['anthropic-admin'],
      });

      // Initialize Pinecone client
      this.clients.pinecone = new PineconeClient();
      await this.clients.pinecone.init({
        apiKey: this.credentials['pineconeconnect'],
        environment: 'us-west1-gcp',
      });

      // Load classification models
      await this.loadModels();

      // Load classification frameworks
      await this.loadFrameworks();

      this.initialized = true;
      console.log('Dream Commander Classifier initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Classifier:', error.message);
      throw error;
    }
  }

  /**
   * Load credentials from GCP Secret Manager
   */
  async loadCredentials() {
    console.log('Loading API credentials from GCP Secret Manager...');

    this.credentials = {};

    const requiredSecrets = ['anthropic-admin', 'pineconeconnect', 'openai-api-key'];

    for (const secretName of requiredSecrets) {
      try {
        const [version] = await this.secretManager.accessSecretVersion({
          name: `projects/${this.projectId}/secrets/${secretName}/versions/latest`,
        });

        this.credentials[secretName] = version.payload.data.toString();
        console.log(`Loaded credential: ${secretName}`);
      } catch (error) {
        console.error(`Failed to load credential ${secretName}:`, error.message);
        throw error;
      }
    }
  }

  /**
   * Load classification models
   */
  async loadModels() {
    console.log('Loading classification models...');

    // Initialize models from config
    this.models = {
      sector: {
        name: config.classification.models.sector,
        prompt:
          'Analyze the following message and determine the business sector or industry it belongs to. Provide a primary sector and up to two sub-sectors if applicable.',
      },
      intent: {
        name: config.classification.models.intent,
        prompt:
          "Analyze the following message and determine the owner's intent or goal. What is the person trying to accomplish? Provide a concise intent statement.",
      },
      kpi: {
        name: config.classification.models.kpi,
        prompt:
          'Analyze the following message and extract any key performance indicators (KPIs) or metrics mentioned. Include both explicit metrics and implied ones.',
      },
      trajectory: {
        name: config.classification.models.trajectory,
        prompt:
          'Analyze the following message and determine the role trajectory or career path indicated. Is the person growing in their current role, transitioning to a new role, or facing a challenge?',
      },
      urgency: {
        name: config.classification.models.urgency,
        prompt:
          'Analyze the following message and determine its urgency level (low, medium, high, critical). Look for explicit deadlines, time-sensitive language, and other urgency indicators.',
      },
    };
  }

  /**
   * Load classification frameworks
   */
  async loadFrameworks() {
    console.log('Loading classification frameworks...');

    // Initialize frameworks from config
    this.frameworks = {
      oneT: config.classification.frameworks.oneT.enabled ? require('./frameworks/one-t') : null,
      holland: config.classification.frameworks.holland.enabled
        ? require('./frameworks/holland')
        : null,
      nineBox: config.classification.frameworks.nineBox.enabled
        ? require('./frameworks/nine-box')
        : null,
      q4dlenz: config.classification.frameworks.q4dlenz.enabled
        ? require('./frameworks/q4dlenz')
        : null,
    };
  }

  /**
   * Classify a message
   * @param {Object} message - The message to classify
   * @returns {Object} - Classification results
   */
  async classifyMessage(message) {
    if (!this.initialized) {
      await this.initialize();
    }

    console.log(`Classifying message ${message.id}`);

    try {
      // Get the message content
      const content = this.getMessageContent(message);

      // Run auto-detection classifiers
      const classification = await this.runAutoDetection(content);

      // Apply classification frameworks
      const frameworks = await this.applyFrameworks(content, classification);

      // Combine results
      const result = {
        ...classification,
        frameworks,
      };

      // Update message with classification
      message.classification = result;

      console.log(`Classification completed for message ${message.id}`);
      return result;
    } catch (error) {
      console.error(`Error classifying message ${message.id}:`, error.message);
      throw error;
    }
  }

  /**
   * Get content from message for classification
   * @param {Object} message - The message object
   * @returns {string} - Content for classification
   */
  getMessageContent(message) {
    let content = '';

    // Extract content based on channel
    switch (message.channel) {
      case 'api':
        content = message.content.text || message.content;
        break;
      case 'email':
        content = `Subject: ${message.content.subject || 'No Subject'}\n\n${message.content.body || message.content}`;
        break;
      case 'sms':
        content = message.content.text || message.content;
        break;
      case 'linkedin':
        content = message.content.post || message.content.message || message.content;
        break;
      case 'threads':
        content = message.content.text || message.content;
        break;
      default:
        content =
          typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
    }

    return content;
  }

  /**
   * Run auto-detection classifiers
   * @param {string} content - Message content
   * @returns {Object} - Auto-detection results
   */
  async runAutoDetection(content) {
    const results = {};

    // Run each classifier in parallel
    const detectionPromises = Object.entries(this.models).map(async ([type, model]) => {
      const result = await this.runClassifier(type, content);
      return { type, result };
    });

    // Wait for all classifiers to complete
    const detectionResults = await Promise.all(detectionPromises);

    // Organize results
    for (const { type, result } of detectionResults) {
      results[type] = result;
    }

    return results;
  }

  /**
   * Run a specific classifier
   * @param {string} type - Classifier type
   * @param {string} content - Message content
   * @returns {Object} - Classification result
   */
  async runClassifier(type, content) {
    try {
      const model = this.models[type];

      if (!model) {
        throw new Error(`Unknown classifier type: ${type}`);
      }

      const prompt = `${model.prompt}\n\nMessage:\n${content}`;

      // Call Claude API
      const response = await this.clients.anthropic.messages.create({
        model: model.name,
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      });

      // Extract the result from Claude's response
      const result = this.parseClassificationResult(type, response.content[0].text);

      return result;
    } catch (error) {
      console.error(`Error in ${type} classifier:`, error.message);
      return { error: error.message };
    }
  }

  /**
   * Parse classification result
   * @param {string} type - Classifier type
   * @param {string} text - Claude response text
   * @returns {Object} - Parsed result
   */
  parseClassificationResult(type, text) {
    // Basic initial parsing
    const result = {
      raw: text,
      confidence: 1.0, // Default confidence
    };

    // Type-specific parsing
    switch (type) {
      case 'sector':
        const sectorMatch = text.match(/primary sector:?\s*([^\n]+)/i);
        if (sectorMatch) {
          result.primary = sectorMatch[1].trim();
        }

        const subSectorMatch = text.match(/sub-sectors?:?\s*([^\n]+)/i);
        if (subSectorMatch) {
          result.secondary = subSectorMatch[1]
            .trim()
            .split(/,\s*/)
            .map((s) => s.trim());
        }
        break;

      case 'intent':
        const intentMatch = text.match(/intent:?\s*([^\n]+)/i);
        if (intentMatch) {
          result.intent = intentMatch[1].trim();
        } else {
          result.intent = text.split('\n')[0].trim();
        }
        break;

      case 'kpi':
        const kpis = [];
        const kpiMatches = text.matchAll(/[•\-\*]?\s*([^:\n]+):\s*([^\n]+)/g);

        for (const match of kpiMatches) {
          kpis.push({
            name: match[1].trim(),
            value: match[2].trim(),
          });
        }

        result.metrics = kpis;
        break;

      case 'trajectory':
        const trajectoryMatch = text.match(/trajectory:?\s*([^\n]+)/i);
        if (trajectoryMatch) {
          result.path = trajectoryMatch[1].trim();
        } else {
          result.path = text.split('\n')[0].trim();
        }
        break;

      case 'urgency':
        const urgencyMatch = text.match(/urgency:?\s*(low|medium|high|critical)/i);
        if (urgencyMatch) {
          result.level = urgencyMatch[1].toLowerCase();
        } else {
          result.level = config.classification.thresholds.urgencyDefault;
        }
        break;
    }

    return result;
  }

  /**
   * Apply classification frameworks
   * @param {string} content - Message content
   * @param {Object} classification - Auto-detection results
   * @returns {Object} - Framework classification results
   */
  async applyFrameworks(content, classification) {
    const results = {};

    // Apply each enabled framework
    if (this.frameworks.oneT) {
      results.oneT = await this.frameworks.oneT.classify(content, classification);
    }

    if (this.frameworks.holland) {
      results.holland = await this.frameworks.holland.classify(content, classification);
    }

    if (this.frameworks.nineBox) {
      results.nineBox = await this.frameworks.nineBox.classify(content, classification);
    }

    if (this.frameworks.q4dlenz) {
      results.q4dlenz = await this.frameworks.q4dlenz.classify(content, classification);
    }

    return results;
  }
}

module.exports = new Classifier();
