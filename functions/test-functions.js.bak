/**
 * Test script for Aixtiv CLI Owner-Subscriber V1-V2 Immersive System Firebase Functions
 *
 * This script provides utility functions to test the Firebase Functions locally
 * before deployment. It can be run using the Firebase emulator.
 *
 * @module test-functions
 * @author Aixtiv Symphony Team
 * @copyright 2025 AI Publishing International LLP
 * @version 1.0.0
 */

const admin = require('firebase-admin');
const axios = require('axios');

// Local emulator URL
const EMULATOR_URL = 'http://localhost:5001/api-for-warp-drive/us-central1';

/**
 * Test the Universal Dispatcher functions
 */
async function testDispatcherFunctions() {
  console.log('Testing Universal Dispatcher functions...');

  try {
    // Test handleDispatch
    const dispatchResult = await axios.post(`${EMULATOR_URL}/handleDispatch`, {
      data: {
        promptData: {
          type: 'text_prompt',
          content: 'Test prompt content',
          metadata: { test: true },
        },
        options: {
          priority: 'high',
          test: true,
        },
      },
    });

    console.log('handleDispatch test result:', dispatchResult.data);

    // Get the dispatch ID from the result
    const dispatchId = dispatchResult.data.result.dispatchId;

    // Test getDispatchStatus
    const statusResult = await axios.post(`${EMULATOR_URL}/getDispatchStatus`, {
      data: {
        dispatchId,
      },
    });

    console.log('getDispatchStatus test result:', statusResult.data);

    // Test cancelDispatch
    const cancelResult = await axios.post(`${EMULATOR_URL}/cancelDispatch`, {
      data: {
        dispatchId,
      },
    });

    console.log('cancelDispatch test result:', cancelResult.data);

    // Test routeToAgent
    const routeResult = await axios.post(`${EMULATOR_URL}/routeToAgent`, {
      data: {
        prompt: 'Test agent prompt',
        agentId: 'test-agent',
        options: { test: true },
      },
    });

    console.log('routeToAgent test result:', routeResult.data);

    console.log('Universal Dispatcher function tests completed successfully');
  } catch (error) {
    console.error(
      'Error testing Universal Dispatcher functions:',
      error.response?.data || error.message
    );
  }
}

/**
 * Test the Memory System functions
 */
async function testMemoryFunctions() {
  console.log('Testing Memory System functions...');

  try {
    // Test addMemory
    const addResult = await axios.post(`${EMULATOR_URL}/addMemory`, {
      data: {
        content: 'Test memory content',
        sessionId: 'test-session-123',
        copilotId: 'test-copilot',
        type: 'user_input',
        importance: 7,
        category: 'test',
        metadata: { test: true },
      },
    });

    console.log('addMemory test result:', addResult.data);

    // Test queryMemories
    const queryResult = await axios.post(`${EMULATOR_URL}/queryMemories`, {
      data: {
        sessionId: 'test-session-123',
        limit: 10,
      },
    });

    console.log('queryMemories test result:', queryResult.data);

    // Test getMemoryStats
    const statsResult = await axios.post(`${EMULATOR_URL}/getMemoryStats`, {
      data: {},
    });

    console.log('getMemoryStats test result:', statsResult.data);

    console.log('Memory System function tests completed successfully');
  } catch (error) {
    console.error('Error testing Memory System functions:', error.response?.data || error.message);
  }
}

/**
 * Test the Agent Trigger functions
 */
async function testAgentTriggerFunctions() {
  console.log('Testing Agent Trigger functions...');

  try {
    // Test triggerAgent
    const triggerResult = await axios.post(`${EMULATOR_URL}/triggerAgent`, {
      data: {
        agentId: 'test-agent',
        prompt: 'Test agent trigger prompt',
        options: {
          sessionId: 'test-session-123',
          promptType: 'test',
          metadata: { test: true },
        },
      },
    });

    console.log('triggerAgent test result:', triggerResult.data);

    console.log('Agent Trigger function tests completed successfully');
  } catch (error) {
    console.error('Error testing Agent Trigger functions:', error.response?.data || error.message);
  }
}

/**
 * Test HTTP endpoints
 */
async function testHttpEndpoints() {
  console.log('Testing HTTP endpoints...');

  try {
    // Test contextStorage (GET)
    const contextGetResult = await axios.get(`${EMULATOR_URL}/contextStorage`);
    console.log('contextStorage GET test result:', contextGetResult.data);

    // Test contextStorage (POST)
    const contextPostResult = await axios.post(`${EMULATOR_URL}/contextStorage`, {
      data: { context: 'Test context' },
    });
    console.log('contextStorage POST test result:', contextPostResult.data);

    // Test modelMetrics
    const metricsResult = await axios.get(`${EMULATOR_URL}/modelMetrics`);
    console.log('modelMetrics test result:', metricsResult.data);

    // Test healthCheck
    const healthResult = await axios.get(`${EMULATOR_URL}/healthCheck`);
    console.log('healthCheck test result:', healthResult.data);

    console.log('HTTP endpoint tests completed successfully');
  } catch (error) {
    console.error('Error testing HTTP endpoints:', error.response?.data || error.message);
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('Starting Aixtiv CLI function tests...');

  await testHttpEndpoints();
  await testDispatcherFunctions();
  await testMemoryFunctions();
  await testAgentTriggerFunctions();

  console.log('All tests completed');
}

// Run the tests
runTests().catch(console.error);
