/**
 * Dream Commander - OneT Classification Framework
 *
 * Implements the OneT personality classification system, which categorizes
 * individuals based on their behavioral patterns, communication style,
 * decision-making approach, and interaction preferences.
 *
 * (c) 2025 Copyright AI Publishing International LLP All Rights Reserved.
 */

const { Anthropic } = require('@anthropic-ai/sdk');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const config = require('../../../config/default.json').dreamCommander;

class OneTFramework {
  constructor() {
    this.initialized = false;
    this.anthropicClient = null;
    this.model = 'claude-3-opus-20240229';
    this.secretManager = new SecretManagerServiceClient();
    this.projectId = process.env.GCP_PROJECT_ID || 'api-for-warp-drive';

    // OneT dimensions and their descriptions
    this.dimensions = {
      communicationStyle: {
        direct: 'Straightforward, concise, to-the-point',
        expressive: 'Detailed, narrative, descriptive',
      },
      informationProcessing: {
        concrete: 'Focused on facts, details, and specifics',
        abstract: 'Focused on concepts, patterns, and possibilities',
      },
      decisionMaking: {
        analytical: 'Logic-driven, objective, systematic',
        values: 'Guided by personal values, subjective, empathetic',
      },
      structuralPreference: {
        organized: 'Prefers order, structure, and closure',
        adaptable: 'Prefers flexibility, openness, and exploration',
      },
    };
  }

  /**
   * Initialize the OneT framework
   */
  async initialize() {
    if (this.initialized) return;

    console.log('Initializing OneT Classification Framework...');

    try {
      // Load API key from Secret Manager
      const [version] = await this.secretManager.accessSecretVersion({
        name: `projects/${this.projectId}/secrets/anthropic-admin/versions/latest`,
      });

      const apiKey = version.payload.data.toString();

      // Initialize Anthropic client
      this.anthropicClient = new Anthropic({
        apiKey: apiKey,
      });

      this.initialized = true;
      console.log('OneT Classification Framework initialized successfully');
    } catch (error) {
      console.error('Failed to initialize OneT framework:', error.message);
      throw error;
    }
  }

  /**
   * Classify content using OneT framework
   * @param {string} content - Message content
   * @param {Object} priorClassification - Prior classification results
   * @returns {Object} - OneT classification results
   */
  async classify(content, priorClassification) {
    if (!this.initialized) {
      await this.initialize();
    }

    console.log('Classifying content with OneT framework...');

    try {
      // Build the prompt
      const prompt = this.buildPrompt(content, priorClassification);

      // Call Claude API
      const response = await this.anthropicClient.messages.create({
        model: this.model,
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      });

      // Parse the result
      const result = this.parseResponse(response.content[0].text);

      return result;
    } catch (error) {
      console.error('Error classifying with OneT framework:', error.message);
      return {
        error: error.message,
        dimensions: {},
        type: null,
        confidence: 0,
      };
    }
  }

  /**
   * Build prompt for OneT classification
   * @param {string} content - Message content
   * @param {Object} priorClassification - Prior classification results
   * @returns {string} - Prompt for Claude
   */
  buildPrompt(content, priorClassification) {
    return `
Please analyze the following message and categorize the sender's personality according to the OneT framework with these four dimensions:

1. Communication Style:
   - Direct: Straightforward, concise, to-the-point
   - Expressive: Detailed, narrative, descriptive

2. Information Processing:
   - Concrete: Focused on facts, details, and specifics
   - Abstract: Focused on concepts, patterns, and possibilities

3. Decision Making:
   - Analytical: Logic-driven, objective, systematic
   - Values: Guided by personal values, subjective, empathetic

4. Structural Preference:
   - Organized: Prefers order, structure, and closure
   - Adaptable: Prefers flexibility, openness, and exploration

Prior classification information:
- Sector: ${priorClassification?.sector?.primary || 'Not available'}
- Intent: ${priorClassification?.intent?.intent || 'Not available'}
- Urgency: ${priorClassification?.urgency?.level || 'Not available'}

Please analyze the sender's personality based on their writing style, word choice, content focus, and overall approach. For each dimension, provide a score from 0-100 where 0 is fully the first trait and 100 is fully the second trait.

Format your response as:
Communication Style: [SCORE] (explanation)
Information Processing: [SCORE] (explanation)
Decision Making: [SCORE] (explanation)
Structural Preference: [SCORE] (explanation)
Overall Type: [Four-letter code based on dominant traits]
Confidence: [0-100%]

Message to analyze:
${content}
`;
  }

  /**
   * Parse Claude's response to extract OneT classification
   * @param {string} response - Claude's response text
   * @returns {Object} - Parsed OneT classification
   */
  parseResponse(response) {
    const result = {
      dimensions: {},
      confidence: 0,
      type: null,
      raw: response,
    };

    try {
      // Extract dimension scores
      for (const dimension of Object.keys(this.dimensions)) {
        const regex = new RegExp(
          `${dimension.replace(/([A-Z])/g, ' $1').trim()}:\\s*(\\d+)\\s*\\(([^\\)]+)\\)`,
          'i'
        );
        const match = response.match(regex);

        if (match) {
          const score = parseInt(match[1], 10);
          const explanation = match[2].trim();

          result.dimensions[dimension] = {
            score,
            explanation,
            dominant: this.getDominantTrait(dimension, score),
          };
        }
      }

      // Extract type code
      const typeMatch = response.match(/Overall Type:\s*([A-Z]{4})/i);
      if (typeMatch) {
        result.type = typeMatch[1];
      } else {
        // Generate type from dimensions if not explicitly stated
        result.type = this.generateTypeCode(result.dimensions);
      }

      // Extract confidence
      const confidenceMatch = response.match(/Confidence:\s*(\d+)/i);
      if (confidenceMatch) {
        result.confidence = parseInt(confidenceMatch[1], 10) / 100;
      }

      return result;
    } catch (error) {
      console.error('Error parsing OneT response:', error.message);
      return {
        dimensions: {},
        type: null,
        confidence: 0,
        error: error.message,
        raw: response,
      };
    }
  }

  /**
   * Get the dominant trait for a dimension based on score
   * @param {string} dimension - Dimension name
   * @param {number} score - Dimension score (0-100)
   * @returns {string} - Dominant trait
   */
  getDominantTrait(dimension, score) {
    const traits = Object.keys(this.dimensions[dimension]);
    return score < 50 ? traits[0] : traits[1];
  }

  /**
   * Generate a four-letter type code from dimension scores
   * @param {Object} dimensions - Dimension scores
   * @returns {string} - Four-letter type code
   */
  generateTypeCode(dimensions) {
    if (
      !dimensions.communicationStyle ||
      !dimensions.informationProcessing ||
      !dimensions.decisionMaking ||
      !dimensions.structuralPreference
    ) {
      return 'XXXX';
    }

    const typeCode = [
      dimensions.communicationStyle.score < 50 ? 'D' : 'E',
      dimensions.informationProcessing.score < 50 ? 'C' : 'A',
      dimensions.decisionMaking.score < 50 ? 'T' : 'F',
      dimensions.structuralPreference.score < 50 ? 'O' : 'P',
    ];

    return typeCode.join('');
  }
}

module.exports = new OneTFramework();
