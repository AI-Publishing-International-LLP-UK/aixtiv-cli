/**
 * CTTT (Comprehensive Testing & Telemetry Tracking) Integration
 * This module provides telemetry tracking for the ASOOS UI application
 */

const https = require('https');
const os = require('os');
const fs = require('fs');

// Telemetry configuration
const TELEMETRY_CONFIG = {
  enabled: process.env.TELEMETRY_ENABLED === 'true',
  endpoint:
    process.env.TELEMETRY_ENDPOINT ||
    'https://us-west1-api-for-warp-drive.cloudfunctions.net/cttt-telemetry',
  buildId: process.env.CTTT_BUILD_ID || '20250513065718',
  environment: process.env.NODE_ENV || 'production',
  domain: process.env.DOMAIN || 'asoos.2100.cool',
  applicationName: 'asoos-ui',
  version: '1.0.0',
};

/**
 * Send telemetry event to CTTT system
 * @param {string} eventName Name of the event
 * @param {Object} data Event data
 * @returns {Promise<void>}
 */
async function sendTelemetryEvent(eventName, data = {}) {
  if (!TELEMETRY_CONFIG.enabled) {
    return;
  }

  try {
    const payload = {
      event: eventName,
      timestamp: new Date().toISOString(),
      application: TELEMETRY_CONFIG.applicationName,
      buildId: TELEMETRY_CONFIG.buildId,
      environment: TELEMETRY_CONFIG.environment,
      domain: TELEMETRY_CONFIG.domain,
      hostname: os.hostname(),
      platform: process.platform,
      nodeVersion: process.version,
      metadata: data,
    };

    const requestBody = JSON.stringify(payload);

    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody),
        'User-Agent': `asoos-ui/${TELEMETRY_CONFIG.version}`,
      },
      timeout: 5000, // 5 second timeout to not block the app
    };

    return new Promise((resolve, reject) => {
      const req = https.request(`${TELEMETRY_CONFIG.endpoint}/event`, requestOptions, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          // Don't reject, just log the error
          console.error(`Telemetry send failed with status ${res.statusCode}`);
          resolve();
        }
      });

      req.on('error', (error) => {
        // Don't reject, just log the error
        console.error('Telemetry send error:', error.message);
        resolve();
      });

      req.on('timeout', () => {
        req.destroy();
        console.error('Telemetry send timed out');
        resolve();
      });

      req.write(requestBody);
      req.end();
    });
  } catch (error) {
    console.error('Error sending telemetry:', error);
  }
}

// Send startup event when module is loaded
sendTelemetryEvent('module_loaded', { moduleName: 'cttt-integration' });

module.exports = {
  sendTelemetryEvent,
  TELEMETRY_CONFIG,
};
