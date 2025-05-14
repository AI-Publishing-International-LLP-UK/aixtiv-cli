/**
 * Enhanced Secret Manager for Aixtiv CLI
 *
 * Advanced implementation of GCP Secret Manager with:
 * - Automated key rotation
 * - Secret versioning
 * - Access auditing
 * - Cache management
 * - Multi-project support
 *
 * Part of Phase III: Agent Autonomy + Platform Automation
 */

const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { JWT } = require('google-auth-library');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Cache for secrets to reduce API calls
const secretCache = new Map();
const CACHE_TTL = 3600000; // 1 hour in milliseconds

// Default project ID
let DEFAULT_PROJECT_ID = 'api-for-warp-drive';

/**
 * Secret Manager Client with enhanced capabilities
 */
class EnhancedSecretManager {
  constructor(options = {}) {
    this.client = new SecretManagerServiceClient(options.clientOptions);
    this.projectId = options.projectId || DEFAULT_PROJECT_ID;
    this.cacheEnabled = options.cacheEnabled !== false;
    this.cacheTTL = options.cacheTTL || CACHE_TTL;
    this.auditEnabled = options.auditEnabled !== false;
    this.auditLogPath =
      options.auditLogPath || path.join(process.cwd(), 'logs', 'secret-audit.log');

    // Ensure audit log directory exists
    if (this.auditEnabled) {
      const logDir = path.dirname(this.auditLogPath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    }
  }

  /**
   * Set default project ID
   * @param {string} projectId - GCP project ID
   */
  static setDefaultProject(projectId) {
    if (!projectId) {
      throw new Error('Project ID is required');
    }
    DEFAULT_PROJECT_ID = projectId;
  }

  /**
   * Log audit event
   * @param {string} action - Action performed
   * @param {string} secretName - Secret name
   * @param {string} user - User who performed the action
   * @param {object} metadata - Additional metadata
   */
  async logAudit(action, secretName, user, metadata = {}) {
    if (!this.auditEnabled) return;

    const auditEntry = {
      timestamp: new Date().toISOString(),
      action,
      secretName,
      user: user || process.env.USER || 'unknown',
      sourceIp: metadata.sourceIp || 'local',
      userAgent: metadata.userAgent || 'aixtiv-cli',
      status: metadata.status || 'success',
      requestId: metadata.requestId || uuidv4(),
    };

    try {
      fs.appendFileSync(this.auditLogPath, JSON.stringify(auditEntry) + '\n');
    } catch (error) {
      console.error(`Failed to write audit log: ${error.message}`);
    }
  }

  /**
   * Build the full secret name with project and secret ID
   * @param {string} secretId - Secret ID
   * @param {string} projectId - Project ID (optional)
   * @returns {string} Full secret name
   */
  getSecretName(secretId, projectId) {
    const project = projectId || this.projectId;
    return `projects/${project}/secrets/${secretId}`;
  }

  /**
   * Access a secret version
   * @param {string} secretId - Secret ID
   * @param {string} version - Version number or 'latest'
   * @param {object} options - Additional options
   * @returns {Promise<string>} Secret value
   */
  async accessSecret(secretId, version = 'latest', options = {}) {
    const { projectId, bypassCache = false, user, metadata = {} } = options;

    // Generate cache key
    const cacheKey = `${projectId || this.projectId}:${secretId}:${version}`;

    // Check cache if enabled and not bypassed
    if (this.cacheEnabled && !bypassCache) {
      const cached = secretCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        await this.logAudit('access-secret-cached', secretId, user, {
          ...metadata,
          version,
        });
        return cached.value;
      }
    }

    // Build the full secret name
    const name = this.getSecretName(secretId, projectId);
    const versionPath = `${name}/versions/${version}`;

    try {
      // Access the secret version
      const [response] = await this.client.accessSecretVersion({
        name: versionPath,
      });

      // Extract the secret data
      const secretValue = response.payload.data.toString('utf8');

      // Update cache if enabled
      if (this.cacheEnabled) {
        secretCache.set(cacheKey, {
          value: secretValue,
          expiresAt: Date.now() + this.cacheTTL,
        });
      }

      // Log the audit event
      await this.logAudit('access-secret', secretId, user, {
        ...metadata,
        version,
      });

      return secretValue;
    } catch (error) {
      await this.logAudit('access-secret-failed', secretId, user, {
        ...metadata,
        version,
        error: error.message,
        status: 'failed',
      });

      throw new Error(`Failed to access secret ${secretId}: ${error.message}`);
    }
  }

  /**
   * Create a new secret
   * @param {string} secretId - Secret ID
   * @param {object} options - Creation options
   * @returns {Promise<object>} Created secret resource
   */
  async createSecret(secretId, options = {}) {
    const {
      projectId,
      labels = {},
      replication = { automatic: {} },
      user,
      metadata = {},
    } = options;

    const parent = `projects/${projectId || this.projectId}`;

    try {
      const [secret] = await this.client.createSecret({
        parent,
        secretId,
        secret: {
          replication,
          labels,
        },
      });

      await this.logAudit('create-secret', secretId, user, metadata);

      return secret;
    } catch (error) {
      await this.logAudit('create-secret-failed', secretId, user, {
        ...metadata,
        error: error.message,
        status: 'failed',
      });

      throw new Error(`Failed to create secret ${secretId}: ${error.message}`);
    }
  }

  /**
   * Add a new version to an existing secret
   * @param {string} secretId - Secret ID
   * @param {string} payload - Secret value
   * @param {object} options - Additional options
   * @returns {Promise<object>} Created version
   */
  async addSecretVersion(secretId, payload, options = {}) {
    const { projectId, user, metadata = {}, invalidateCache = true } = options;

    const parent = this.getSecretName(secretId, projectId);

    // Convert payload to Buffer
    const data = Buffer.from(payload, 'utf8');

    try {
      const [version] = await this.client.addSecretVersion({
        parent,
        payload: { data },
      });

      // Invalidate cache if requested
      if (invalidateCache) {
        const cacheKeyPattern = `${projectId || this.projectId}:${secretId}:`;
        for (const key of secretCache.keys()) {
          if (key.startsWith(cacheKeyPattern)) {
            secretCache.delete(key);
          }
        }
      }

      await this.logAudit('add-secret-version', secretId, user, metadata);

      return version;
    } catch (error) {
      await this.logAudit('add-secret-version-failed', secretId, user, {
        ...metadata,
        error: error.message,
        status: 'failed',
      });

      throw new Error(`Failed to add version to secret ${secretId}: ${error.message}`);
    }
  }

  /**
   * Delete a secret or secret version
   * @param {string} secretId - Secret ID
   * @param {object} options - Deletion options
   * @returns {Promise<void>}
   */
  async deleteSecret(secretId, options = {}) {
    const { projectId, version, user, metadata = {}, invalidateCache = true } = options;

    // Build the name based on whether we're deleting a secret or version
    let name;
    if (version) {
      name = `${this.getSecretName(secretId, projectId)}/versions/${version}`;
    } else {
      name = this.getSecretName(secretId, projectId);
    }

    try {
      if (version) {
        // Delete a specific version
        await this.client.destroySecretVersion({ name });
        await this.logAudit('destroy-secret-version', secretId, user, {
          ...metadata,
          version,
        });
      } else {
        // Delete the entire secret
        await this.client.deleteSecret({ name });
        await this.logAudit('delete-secret', secretId, user, metadata);
      }

      // Invalidate cache if requested
      if (invalidateCache) {
        const cacheKeyPattern = `${projectId || this.projectId}:${secretId}:`;
        for (const key of secretCache.keys()) {
          if (key.startsWith(cacheKeyPattern)) {
            secretCache.delete(key);
          }
        }
      }
    } catch (error) {
      const action = version ? 'destroy-secret-version' : 'delete-secret';
      await this.logAudit(`${action}-failed`, secretId, user, {
        ...metadata,
        version,
        error: error.message,
        status: 'failed',
      });

      throw new Error(`Failed to delete secret ${secretId}: ${error.message}`);
    }
  }

  /**
   * List secrets in a project
   * @param {object} options - Listing options
   * @returns {Promise<Array<object>>} List of secrets
   */
  async listSecrets(options = {}) {
    const { projectId, filter, user, metadata = {} } = options;

    const parent = `projects/${projectId || this.projectId}`;

    try {
      const [secrets] = await this.client.listSecrets({
        parent,
        filter,
      });

      await this.logAudit('list-secrets', 'all', user, metadata);

      return secrets;
    } catch (error) {
      await this.logAudit('list-secrets-failed', 'all', user, {
        ...metadata,
        error: error.message,
        status: 'failed',
      });

      throw new Error(`Failed to list secrets: ${error.message}`);
    }
  }

  /**
   * List versions of a secret
   * @param {string} secretId - Secret ID
   * @param {object} options - Listing options
   * @returns {Promise<Array<object>>} List of versions
   */
  async listSecretVersions(secretId, options = {}) {
    const { projectId, filter, user, metadata = {} } = options;

    const parent = this.getSecretName(secretId, projectId);

    try {
      const [versions] = await this.client.listSecretVersions({
        parent,
        filter,
      });

      await this.logAudit('list-secret-versions', secretId, user, metadata);

      return versions;
    } catch (error) {
      await this.logAudit('list-secret-versions-failed', secretId, user, {
        ...metadata,
        error: error.message,
        status: 'failed',
      });

      throw new Error(`Failed to list versions for secret ${secretId}: ${error.message}`);
    }
  }

  /**
   * Update secret metadata
   * @param {string} secretId - Secret ID
   * @param {object} metadata - Metadata to update
   * @param {object} options - Update options
   * @returns {Promise<object>} Updated secret
   */
  async updateSecretMetadata(secretId, metadata, options = {}) {
    const { projectId, user, auditMetadata = {} } = options;

    const name = this.getSecretName(secretId, projectId);

    try {
      const [secret] = await this.client.updateSecret({
        secret: {
          name,
          ...metadata,
        },
        updateMask: {
          paths: Object.keys(metadata).map((k) => `${k}`),
        },
      });

      await this.logAudit('update-secret-metadata', secretId, user, auditMetadata);

      return secret;
    } catch (error) {
      await this.logAudit('update-secret-metadata-failed', secretId, user, {
        ...auditMetadata,
        error: error.message,
        status: 'failed',
      });

      throw new Error(`Failed to update metadata for secret ${secretId}: ${error.message}`);
    }
  }

  /**
   * Create or update a secret with automatic versioning
   * @param {string} secretId - Secret ID
   * @param {string} payload - Secret value
   * @param {object} options - Additional options
   * @returns {Promise<object>} Created or updated secret version
   */
  async setSecret(secretId, payload, options = {}) {
    const { projectId, labels = {}, user, metadata = {} } = options;

    try {
      // Check if secret exists
      const secretName = this.getSecretName(secretId, projectId);
      let secretExists = true;

      try {
        await this.client.getSecret({ name: secretName });
      } catch (error) {
        secretExists = false;
      }

      // Create the secret if it doesn't exist
      if (!secretExists) {
        await this.createSecret(secretId, {
          projectId,
          labels,
          user,
          metadata,
        });
      }

      // Add the new version
      return await this.addSecretVersion(secretId, payload, {
        projectId,
        user,
        metadata,
      });
    } catch (error) {
      await this.logAudit('set-secret-failed', secretId, user, {
        ...metadata,
        error: error.message,
        status: 'failed',
      });

      throw new Error(`Failed to set secret ${secretId}: ${error.message}`);
    }
  }

  /**
   * Rotate a service account key
   * @param {string} secretId - Secret ID for storing the key
   * @param {string} serviceAccountEmail - Service account email
   * @param {object} options - Rotation options
   * @returns {Promise<object>} Result with new key info
   */
  async rotateServiceAccountKey(secretId, serviceAccountEmail, options = {}) {
    const {
      projectId,
      user,
      metadata = {},
      keyType = 'json',
      deleteOldKey = true,
      maxKeyAge = 90, // days
    } = options;

    try {
      // Get the Google Auth library for service account management
      const { GoogleAuth } = require('google-auth-library');
      const auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });

      // Get authenticated client
      const client = await auth.getClient();
      const projectId = await auth.getProjectId();

      // List current keys to determine which one to rotate
      const url = `https://iam.googleapis.com/v1/projects/${projectId}/serviceAccounts/${serviceAccountEmail}/keys`;
      const res = await client.request({ url });

      let oldestKey = null;
      let oldestKeyCreationTime = null;

      // Find the oldest key
      for (const key of res.data.keys) {
        const creationTime = new Date(key.validAfterTime);
        if (!oldestKeyCreationTime || creationTime < oldestKeyCreationTime) {
          oldestKey = key;
          oldestKeyCreationTime = creationTime;
        }
      }

      // Check if rotation is needed based on max key age
      const now = new Date();
      const keyAgeInDays = oldestKey
        ? Math.floor((now - oldestKeyCreationTime) / (1000 * 60 * 60 * 24))
        : maxKeyAge + 1;

      const needsRotation = keyAgeInDays >= maxKeyAge;

      if (!needsRotation) {
        await this.logAudit('key-rotation-skipped', secretId, user, {
          ...metadata,
          serviceAccountEmail,
          keyAge: keyAgeInDays,
          maxKeyAge,
        });

        return {
          rotated: false,
          keyAge: keyAgeInDays,
          maxKeyAge,
          message: `Key rotation skipped. Current key age (${keyAgeInDays} days) is less than max age (${maxKeyAge} days).`,
        };
      }

      // Create new key
      const createUrl = `${url}?privateKeyType=${keyType === 'json' ? 'TYPE_GOOGLE_CREDENTIALS_FILE' : 'TYPE_PKCS12_FILE'}`;
      const createRes = await client.request({
        url: createUrl,
        method: 'POST',
      });

      const newKeyData = createRes.data;

      // Store the new key in Secret Manager
      await this.setSecret(
        secretId,
        keyType === 'json'
          ? Buffer.from(newKeyData.privateKeyData, 'base64').toString('utf8')
          : newKeyData.privateKeyData,
        {
          projectId,
          user,
          metadata: {
            ...metadata,
            serviceAccountEmail,
            keyId: newKeyData.name.split('/').pop(),
          },
        }
      );

      // Delete the old key if requested
      if (deleteOldKey && oldestKey) {
        const deleteUrl = `https://iam.googleapis.com/v1/${oldestKey.name}`;
        await client.request({
          url: deleteUrl,
          method: 'DELETE',
        });
      }

      await this.logAudit('key-rotation-completed', secretId, user, {
        ...metadata,
        serviceAccountEmail,
        oldKeyId: oldestKey ? oldestKey.name.split('/').pop() : 'none',
        newKeyId: newKeyData.name.split('/').pop(),
        keyAge: keyAgeInDays,
      });

      return {
        rotated: true,
        oldKeyId: oldestKey ? oldestKey.name.split('/').pop() : null,
        newKeyId: newKeyData.name.split('/').pop(),
        keyAge: keyAgeInDays,
        maxKeyAge,
      };
    } catch (error) {
      await this.logAudit('key-rotation-failed', secretId, user, {
        ...metadata,
        serviceAccountEmail,
        error: error.message,
        status: 'failed',
      });

      throw new Error(
        `Failed to rotate service account key for ${serviceAccountEmail}: ${error.message}`
      );
    }
  }

  /**
   * Rotate an API key stored in Secret Manager
   * @param {string} secretId - Secret ID storing the API key
   * @param {string} apiKeyName - API key resource name
   * @param {object} options - Rotation options
   * @returns {Promise<object>} Result with new key info
   */
  async rotateApiKey(secretId, apiKeyName, options = {}) {
    const {
      projectId,
      user,
      metadata = {},
      keyRestrictions = {},
      maxKeyAge = 90, // days
    } = options;

    try {
      // Get the Google Auth library for API key management
      const { GoogleAuth } = require('google-auth-library');
      const auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });

      // Get authenticated client
      const client = await auth.getClient();

      // Get current key to check age
      const getUrl = `https://apikeys.googleapis.com/v2/${apiKeyName}`;
      const getRes = await client.request({ url: getUrl });

      const currentKey = getRes.data;
      const creationTime = new Date(currentKey.createTime);

      // Check if rotation is needed based on max key age
      const now = new Date();
      const keyAgeInDays = Math.floor((now - creationTime) / (1000 * 60 * 60 * 24));

      const needsRotation = keyAgeInDays >= maxKeyAge;

      if (!needsRotation) {
        await this.logAudit('api-key-rotation-skipped', secretId, user, {
          ...metadata,
          apiKeyName,
          keyAge: keyAgeInDays,
          maxKeyAge,
        });

        return {
          rotated: false,
          keyAge: keyAgeInDays,
          maxKeyAge,
          message: `API key rotation skipped. Current key age (${keyAgeInDays} days) is less than max age (${maxKeyAge} days).`,
        };
      }

      // Create a new API key with the same restrictions
      const keyPrefix = apiKeyName.split('/').pop().replace(/-.*$/, '');
      const createUrl = `https://apikeys.googleapis.com/v2/${apiKeyName.split('/').slice(0, -1).join('/')}/keys`;

      const createPayload = {
        displayName: `${keyPrefix}-${Date.now()}`,
        restrictions: keyRestrictions || currentKey.restrictions,
      };

      const createRes = await client.request({
        url: createUrl,
        method: 'POST',
        data: createPayload,
      });

      const newKey = createRes.data;

      // Store the new key in Secret Manager
      await this.setSecret(secretId, newKey.keyString, {
        projectId,
        user,
        metadata: {
          ...metadata,
          apiKeyName: newKey.name,
        },
      });

      // Schedule the old key for deletion (typically after a grace period)
      const deleteUrl = `https://apikeys.googleapis.com/v2/${apiKeyName}`;
      await client.request({
        url: deleteUrl,
        method: 'DELETE',
      });

      await this.logAudit('api-key-rotation-completed', secretId, user, {
        ...metadata,
        oldApiKeyName: apiKeyName,
        newApiKeyName: newKey.name,
        keyAge: keyAgeInDays,
      });

      return {
        rotated: true,
        oldApiKeyName: apiKeyName,
        newApiKeyName: newKey.name,
        keyAge: keyAgeInDays,
        maxKeyAge,
      };
    } catch (error) {
      await this.logAudit('api-key-rotation-failed', secretId, user, {
        ...metadata,
        apiKeyName,
        error: error.message,
        status: 'failed',
      });

      throw new Error(`Failed to rotate API key ${apiKeyName}: ${error.message}`);
    }
  }

  /**
   * Create a rotation schedule for secrets
   * @param {Array<object>} schedule - Array of secrets to rotate
   * @param {object} options - Schedule options
   * @returns {object} Schedule configuration
   */
  async createRotationSchedule(schedule, options = {}) {
    const {
      projectId,
      user,
      metadata = {},
      schedulePath = path.join(process.cwd(), 'config', 'secret-rotation-schedule.json'),
    } = options;

    try {
      // Format the schedule entries
      const formattedSchedule = schedule.map((entry) => {
        return {
          secretId: entry.secretId,
          projectId: entry.projectId || projectId || this.projectId,
          type: entry.type || 'generic',
          interval: entry.interval || 90, // days
          lastRotated: entry.lastRotated || new Date().toISOString(),
          nextRotation:
            entry.nextRotation ||
            new Date(Date.now() + entry.interval * 24 * 60 * 60 * 1000).toISOString(),
          metadata: entry.metadata || {},
          enabled: entry.enabled !== false,
        };
      });

      // Write the schedule to file
      const scheduleDir = path.dirname(schedulePath);
      if (!fs.existsSync(scheduleDir)) {
        fs.mkdirSync(scheduleDir, { recursive: true });
      }

      fs.writeFileSync(
        schedulePath,
        JSON.stringify(
          {
            schedule: formattedSchedule,
            lastUpdated: new Date().toISOString(),
            updatedBy: user || process.env.USER || 'unknown',
          },
          null,
          2
        )
      );

      await this.logAudit('create-rotation-schedule', 'multiple', user, {
        ...metadata,
        count: formattedSchedule.length,
      });

      return {
        scheduled: formattedSchedule.length,
        path: schedulePath,
      };
    } catch (error) {
      await this.logAudit('create-rotation-schedule-failed', 'multiple', user, {
        ...metadata,
        error: error.message,
        status: 'failed',
      });

      throw new Error(`Failed to create rotation schedule: ${error.message}`);
    }
  }

  /**
   * Clear the secret cache
   * @param {string} secretId - Optional specific secret ID to clear
   * @param {string} projectId - Optional specific project ID to clear
   * @returns {number} Number of cache entries cleared
   */
  clearCache(secretId, projectId) {
    let count = 0;

    if (secretId && projectId) {
      // Clear specific secret and project
      const cacheKeyPattern = `${projectId}:${secretId}:`;
      for (const key of secretCache.keys()) {
        if (key.startsWith(cacheKeyPattern)) {
          secretCache.delete(key);
          count++;
        }
      }
    } else if (secretId) {
      // Clear all projects with this secret ID
      for (const key of secretCache.keys()) {
        if (key.includes(`:${secretId}:`)) {
          secretCache.delete(key);
          count++;
        }
      }
    } else if (projectId) {
      // Clear all secrets in this project
      const cacheKeyPattern = `${projectId}:`;
      for (const key of secretCache.keys()) {
        if (key.startsWith(cacheKeyPattern)) {
          secretCache.delete(key);
          count++;
        }
      }
    } else {
      // Clear all
      count = secretCache.size;
      secretCache.clear();
    }

    return count;
  }

  /**
   * Generate a secure random string (for API keys, passwords, etc.)
   * @param {object} options - Generation options
   * @returns {string} Random string
   */
  static generateSecureString(options = {}) {
    const {
      length = 32,
      charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{}|;:,.<>?',
      prefix = '',
    } = options;

    const randomBytes = crypto.randomBytes(length);
    let result = '';

    for (let i = 0; i < length; i++) {
      const index = randomBytes[i] % charset.length;
      result += charset[index];
    }

    return prefix + result;
  }
}

module.exports = EnhancedSecretManager;
