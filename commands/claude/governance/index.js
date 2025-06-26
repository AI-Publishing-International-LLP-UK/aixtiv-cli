/**
 * Dr. Claude Governance Module
 *
 * This module exports the governance functionality for the Dr. Claude agent suite.
 * It integrates blockchain governance with agent orchestration.
 */

// Import the governance command functionalities
const s2do = require('./s2do');
const approve = require('./approve');
const verify = require('./verify');
const telemetry = require('../../../lib/telemetry');

// Export the governance commands
module.exports = {
  s2do,
  approve,
  verify,
};
