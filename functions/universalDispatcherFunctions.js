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

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const { dispatcher } = require('../src/functions/universalDispatcher');

/**
 * HTTP function to handle a dispatch request
 */
exports.handleDispatch = functions.https.onCall(async (data, context) => {
  // Verify authentication if required
  if (!context.auth && functions.config().dispatcher?.requireAuth === 'true') {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Authentication required to use this function'
    );
  }
  
  try {
    const { promptData, options = {} } = data;
    
    if (!promptData) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Prompt data is required'
      );
    }
    
    // Add user ID to options if authenticated
    if (context.auth) {
      options.userId = context.auth.uid;
    }
    
    // Add request timestamp
    options.requestTime = admin.firestore.FieldValue.serverTimestamp();
    
    // Process the dispatch
    const result = await dispatcher.dispatch(promptData, options);
    
    return result;
  } catch (error) {
    console.error('Error handling dispatch:', error);
    
    throw new functions.https.HttpsError(
      'internal',
      error.message || 'An unknown error occurred',
      error
    );
  }
});

/**
 * HTTP function to get the status of a dispatch
 */
exports.getDispatchStatus = functions.https.onCall(async (data, context) => {
  try {
    const { dispatchId } = data;
    
    if (!dispatchId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Dispatch ID is required'
      );
    }
    
    // Get the status from the dispatcher
    const status = await dispatcher.getDispatchStatus(dispatchId);
    
    // Check if the user has permission to access this dispatch
    if (
      status && 
      context.auth && 
      status.options && 
      status.options.userId && 
      status.options.userId !== context.auth.uid && 
      !context.auth.token.admin
    ) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'You do not have permission to access this dispatch'
      );
    }
    
    return status || { status: 'not_found' };
  } catch (error) {
    console.error('Error getting dispatch status:', error);
    
    throw new functions.https.HttpsError(
      'internal',
      error.message || 'An unknown error occurred',
      error
    );
  }
});

/**
 * HTTP function to cancel a dispatch
 */
exports.cancelDispatch = functions.https.onCall(async (data, context) => {
  try {
    const { dispatchId } = data;
    
    if (!dispatchId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Dispatch ID is required'
      );
    }
    
    // Get the status to check permissions
    const status = await dispatcher.getDispatchStatus(dispatchId);
    
    // Check if the user has permission to cancel this dispatch
    if (
      status && 
      context.auth && 
      status.options && 
      status.options.userId && 
      status.options.userId !== context.auth.uid && 
      !context.auth.token.admin
    ) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'You do not have permission to cancel this dispatch'
      );
    }
    
    // Cancel the dispatch
    const result = dispatcher.cancelDispatch(dispatchId);
    
    return { success: result };
  } catch (error) {
    console.error('Error cancelling dispatch:', error);
    
    throw new functions.https.HttpsError(
      'internal',
      error.message || 'An unknown error occurred',
      error
    );
  }
});

/**
 * Firestore trigger to handle new prompt runs
 */
exports.onPromptRunCreated = functions.firestore
  .document('prompt_runs/{runId}')
  .onCreate(async (snapshot, context) => {
    try {
      const runData = snapshot.data();
      const { status, prompt, options } = runData;
      
      // Only process pending items
      if (status !== 'pending') {
        console.log(`Skipping run ${context.params.runId} with status ${status}`);
        return null;
      }
      
      console.log(`Processing new prompt run: ${context.params.runId}`);
      
      // Process the dispatch
      const result = await dispatcher.dispatch(prompt, {
        dispatchId: context.params.runId,
        ...options
      });
      
      // Update the document with the result
      return snapshot.ref.update({
        status: result.success ? 'completed' : 'failed',
        result: result.result || null,
        error: result.error || null,
        completedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Error processing prompt run:', error);
      
      // Update the document with the error
      return snapshot.ref.update({
        status: 'failed',
        error: error.message || 'An unknown error occurred',
        completedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  });

/**
 * Firestore trigger to handle prompt run cancellations
 */
exports.onPromptRunUpdated = functions.firestore
  .document('prompt_runs/{runId}')
  .onUpdate(async (change, context) => {
    try {
      const before = change.before.data();
      const after = change.after.data();
      
      // Handle cancellation requests
      if (
        before.status === 'pending' && 
        after.status === 'cancellation_requested'
      ) {
        console.log(`Cancelling prompt run: ${context.params.runId}`);
        
        // Cancel the dispatch
        const result = dispatcher.cancelDispatch(context.params.runId);
        
        // Update the document with the cancellation result
        return change.after.ref.update({
          status: 'cancelled',
          cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
          cancellationResult: result
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
exports.cleanupStaleDispatches = functions.pubsub
  .schedule('every 30 minutes')
  .onRun(async (context) => {
    try {
      console.log('Running stale dispatch cleanup');
      
      // Get stale runs from Firestore
      const staleTime = new Date();
      staleTime.setHours(staleTime.getHours() - 2); // 2 hours old
      
      const staleRuns = await db.collection('prompt_runs')
        .where('status', '==', 'pending')
        .where('createdAt', '<', staleTime)
        .limit(100)
        .get();
      
      console.log(`Found ${staleRuns.size} stale dispatches`);
      
      // Cancel each stale run
      const batch = db.batch();
      
      staleRuns.forEach(doc => {
        // Cancel in the dispatcher
        dispatcher.cancelDispatch(doc.id);
        
        // Mark as timed out in Firestore
        batch.update(doc.ref, {
          status: 'timeout',
          error: 'Dispatch timed out after 2 hours',
          completedAt: admin.firestore.FieldValue.serverTimestamp()
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
exports.routeToAgent = functions.https.onCall(async (data, context) => {
  try {
    const { prompt, agentId, options = {} } = data;
    
    if (!prompt || !agentId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Prompt and agent ID are required'
      );
    }
    
    // Add user ID to options if authenticated
    if (context.auth) {
      options.userId = context.auth.uid;
    }
    
    // Create a dispatch for the agent
    const result = await dispatcher.dispatch({
      type: 'agent_request',
      content: prompt,
      agentId,
      metadata: options.metadata || {}
    }, options);
    
    return result;
  } catch (error) {
    console.error('Error routing to agent:', error);
    
    throw new functions.https.HttpsError(
      'internal',
      error.message || 'An unknown error occurred',
      error
    );
  }
});