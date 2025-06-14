/**
 * Universal Dispatcher Firebase Cloud Functions
 *
 * This module provides Firebase Cloud Functions that expose the Universal Dispatcher
 * functionality to clients via HTTP endpoints and Firestore triggers.
 *
 * @module universalDispatcherFunctions
 * @author Aixtiv Symphony Team
 * @copyright 2025 AI Publishing International LLP
 * @version 1.0.0
 */

const { onCall } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
const { HttpsError } = require('firebase-functions/https');

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const { dispatcher } = require('../src/functions/universalDispatcher');

/**
 * HTTP function to handle a dispatch request
 */
exports.handleDispatch = onCall({
  region: 'us-west1',
  memory: '512MiB'
}, async (request) => {
  const { data, auth } = request;
  
  // Verify authentication if required
  if (!auth && process.env.DISPATCHER_REQUIRE_AUTH === 'true') {
    throw new HttpsError(
      'unauthenticated',
      'Authentication required to use this function'
    );
  }

  try {
    const { promptData, options = {} } = data;

    if (!promptData) {
      throw new HttpsError('invalid-argument', 'Prompt data is required');
    }

    // Add user ID to options if authenticated
    if (auth) {
      options.userId = auth.uid;
    }

    // Add request timestamp
    options.requestTime = admin.firestore.FieldValue.serverTimestamp();

    // Process the dispatch
    const result = await dispatcher.dispatch(promptData, options);

    return result;
  } catch (error) {
    console.error('Error handling dispatch:', error);

    throw new HttpsError(
      'internal',
      error.message || 'An unknown error occurred',
      error
    );
  }
});

/**
 * HTTP function to get the status of a dispatch
 */
exports.getDispatchStatus = onCall({
  region: 'us-west1',
  memory: '256MiB'
}, async (request) => {
  const { data, auth } = request;
  
  try {
    const { dispatchId } = data;

    if (!dispatchId) {
      throw new HttpsError('invalid-argument', 'Dispatch ID is required');
    }

    // Get the status from the dispatcher
    const status = await dispatcher.getDispatchStatus(dispatchId);

    // Check if the user has permission to access this dispatch
    if (
      status &&
      auth &&
      status.options &&
      status.options.userId &&
      status.options.userId !== auth.uid &&
      !auth.token.admin
    ) {
      throw new HttpsError(
        'permission-denied',
        'You do not have permission to access this dispatch'
      );
    }

    return status || { status: 'not_found' };
  } catch (error) {
    console.error('Error getting dispatch status:', error);

    throw new HttpsError(
      'internal',
      error.message || 'An unknown error occurred',
      error
    );
  }
});

/**
 * HTTP function to cancel a dispatch
 */
exports.cancelDispatch = onCall({
  region: 'us-west1',
  memory: '256MiB'
}, async (request) => {
  const { data, auth } = request;
  
  try {
    const { dispatchId } = data;

    if (!dispatchId) {
      throw new HttpsError('invalid-argument', 'Dispatch ID is required');
    }

    // Get the status to check permissions
    const status = await dispatcher.getDispatchStatus(dispatchId);

    // Check if the user has permission to cancel this dispatch
    if (
      status &&
      auth &&
      status.options &&
      status.options.userId &&
      status.options.userId !== auth.uid &&
      !auth.token.admin
    ) {
      throw new HttpsError(
        'permission-denied',
        'You do not have permission to cancel this dispatch'
      );
    }

    // Cancel the dispatch
    const result = dispatcher.cancelDispatch(dispatchId);

    return { success: result };
  } catch (error) {
    console.error('Error cancelling dispatch:', error);

    throw new HttpsError(
      'internal',
      error.message || 'An unknown error occurred',
      error
    );
  }
});

/**
 * Firestore trigger to handle new prompt runs
 */
exports.onPromptRunCreated = onDocumentCreated({
  document: 'prompt_runs/{runId}',
  region: 'us-west1',
  memory: '512MiB'
}, async (event) => {
  try {
    const snapshot = event.data;
    const runData = snapshot.data();
    const { status, prompt, options } = runData;
    const runId = event.params.runId;

    // Only process pending items
    if (status !== 'pending') {
      console.log(`Skipping run ${runId} with status ${status}`);
      return null;
    }

    console.log(`Processing new prompt run: ${runId}`);

    // Process the dispatch
    const result = await dispatcher.dispatch(prompt, {
      dispatchId: runId,
      ...options,
    });

    // Update the document with the result
    return snapshot.ref.update({
      status: result.success ? 'completed' : 'failed',
      result: result.result || null,
      error: result.error || null,
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('Error processing prompt run:', error);

    // Update the document with the error
    return event.data.ref.update({
      status: 'failed',
      error: error.message || 'An unknown error occurred',
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
});

/**
 * Firestore trigger to handle prompt run cancellations
 */
exports.onPromptRunUpdated = onDocumentUpdated({
  document: 'prompt_runs/{runId}',
  region: 'us-west1',
  memory: '256MiB'
}, async (event) => {
  try {
    const change = event.data;
    const before = change.before.data();
    const after = change.after.data();
    const runId = event.params.runId;

    // Handle cancellation requests
    if (before.status === 'pending' && after.status === 'cancellation_requested') {
      console.log(`Cancelling prompt run: ${runId}`);

      // Cancel the dispatch
      const result = dispatcher.cancelDispatch(runId);

      // Update the document with the cancellation result
      return change.after.ref.update({
        status: 'cancelled',
        cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
        cancellationResult: result,
      });
    }

    return null;
  } catch (error) {
    console.error('Error processing prompt run update:', error);
    return null;
  }
});

/**
 * Scheduled function to clean up stale dispatches
 */
exports.cleanupStaleDispatches = onSchedule({
  schedule: 'every 30 minutes',
  region: 'us-west1',
  memory: '256MiB'
}, async (event) => {
  try {
    console.log('Running stale dispatch cleanup');

    // Get stale runs from Firestore
    const staleTime = new Date();
    staleTime.setHours(staleTime.getHours() - 2); // 2 hours old

    const staleRuns = await db
      .collection('prompt_runs')
      .where('status', '==', 'pending')
      .where('createdAt', '<', staleTime)
      .limit(100)
      .get();

    console.log(`Found ${staleRuns.size} stale dispatches`);

    // Cancel each stale run
    const batch = db.batch();

    staleRuns.forEach((doc) => {
      // Cancel in the dispatcher
      dispatcher.cancelDispatch(doc.id);

      // Mark as timed out in Firestore
      batch.update(doc.ref, {
        status: 'timeout',
        error: 'Dispatch timed out after 2 hours',
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();

    return { processed: staleRuns.size };
  } catch (error) {
    console.error('Error cleaning up stale dispatches:', error);
    return { error: error.message };
  }
});

/**
 * HTTP function to handle agent routing requests
 */
exports.routeToAgent = onCall({
  region: 'us-west1',
  memory: '512MiB'
}, async (request) => {
  const { data, auth } = request;
  
  try {
    const { prompt, agentId, options = {} } = data;

    if (!prompt || !agentId) {
      throw new HttpsError('invalid-argument', 'Prompt and agent ID are required');
    }

    // Add user ID to options if authenticated
    if (auth) {
      options.userId = auth.uid;
    }

    // Create a dispatch for the agent
    const result = await dispatcher.dispatch(
      {
        type: 'agent_request',
        content: prompt,
        agentId,
        metadata: options.metadata || {},
      },
      options
    );

    return result;
  } catch (error) {
    console.error('Error routing to agent:', error);

    throw new HttpsError(
      'internal',
      error.message || 'An unknown error occurred',
      error
    );
  }
});
