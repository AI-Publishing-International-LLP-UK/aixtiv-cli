/**
 * Secrets Management Service
 * 
 * Exports unified access to secrets and credentials across providers.
 * 
 * (c) 2025 Copyright AI Publishing International LLP All Rights Reserved.
 * Developed with assistance from the Pilots of Vision Lake and
 * Claude Code Generator. This is Human Driven and 100% Human Project
 * Amplified by attributes of AI Technology.
 */

const secretManager = require('./secret-manager');
const providers = require('./provider-factory');

module.exports = {
  secretManager,
  providers
};