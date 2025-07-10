/**
 * @fileoverview Firebase Cloud Function that triggers on new user creation in Firestore.
 * Validates auth claims via Gateway API, logs to FMS, and sends welcome email.
 *
 * @module authTrigger
 * @requires firebase-functions
 * @requires firebase-admin
 * @requires axios
 * @requires @sendgrid/mail
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const sgMail = require('@sendgrid/mail');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'api-for-warp-drive',
  });
}

// Initialize Firestore
const db = admin.firestore();

// Configure SendGrid with API key (should be stored in environment variables)
sgMail.setApiKey(functions.config().sendgrid?.apikey || process.env.SENDGRID_API_KEY);

// Gateway API endpoint for auth validation
const GATEWAY_API_URL =
  functions.config().gateway?.url ||
  'https://integration-gateway.aixtiv-symphony.com/validate-auth';

// SallyPort security configuration
const SALLYPORT_CONFIG = {
  requireValidation: true,
  timeoutMs: 5000,
  maxRetries: 3,
};

/**
 * Validates user authentication claims via Gateway API
 *
 * @async
 * @param {Object} user - Firebase user object
 * @param {string} authToken - Authentication token
 * @returns {Promise<Object>} Validation result
 * @throws {Error} If validation fails
 */
async function validateAuthClaims(user, authToken) {
  try {
    const response = await axios({
      method: 'post',
      url: GATEWAY_API_URL,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
        'X-Agent-ID': 'FUNCTION_AUTH_TRIGGER',
      },
      data: {
        userId: user.uid,
        email: user.email,
        claims: user.customClaims || {},
      },
      timeout: SALLYPORT_CONFIG.timeoutMs,
    });

    return response.data;
  } catch (error) {
    functions.logger.error('Auth validation failed', {
      userId: user.uid,
      error: error.message,
      statusCode: error.response?.status,
    });

    throw new Error(`SallyPort validation failed: ${error.message}`);
  }
}

/**
 * Logs user activity to the Flight Memory System (FMS)
 *
 * @async
 * @param {string} userId - User ID
 * @param {string} eventType - Type of event being logged
 * @param {Object} metadata - Additional metadata to log
 * @returns {Promise<void>}
 */
async function logToFMS(userId, eventType, metadata = {}) {
  try {
    const timestamp = admin.firestore.FieldValue.serverTimestamp();

    await db.collection('agentActions').add({
      user_id: userId,
      action_type: eventType,
      timestamp: timestamp,
      metadata: metadata,
      agent_id: 'FUNCTION_AUTH_TRIGGER',
      source: 'authTrigger',
      status: 'completed',
    });

    functions.logger.info('FMS log created', {
      userId,
      eventType,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    functions.logger.error('FMS logging failed', {
      userId,
      eventType,
      error: error.message,
    });
    // Continue execution even if logging fails
  }
}

/**
 * Sends welcome email to newly created user
 *
 * @async
 * @param {Object} user - User object
 * @returns {Promise<void>}
 */
async function sendWelcomeEmail(user) {
  const msg = {
    to: user.email,
    from: functions.config().email?.sender || 'welcome@aixtiv-symphony.com',
    subject: 'Welcome to Aixtiv Symphony',
    templateId: functions.config().email?.welcomeTemplateId || 'd-xyz123456789',
    dynamicTemplateData: {
      first_name: user.displayName?.split(' ')[0] || 'User',
      user_id: user.uid,
      login_url: 'https://app.aixtiv-symphony.com/login',
    },
  };

  try {
    await sgMail.send(msg);
    functions.logger.info('Welcome email sent', { email: user.email });
  } catch (error) {
    functions.logger.error('Failed to send welcome email', {
      email: user.email,
      error: error.message,
    });
    // Continue execution even if email fails
  }
}

/**
 * Creates a user session record in Firestore
 *
 * @async
 * @param {string} userId - User ID
 * @param {Object} userData - User data
 * @returns {Promise<string>} Session ID
 */
async function createUserSession(userId, userData) {
  const sessionData = {
    userId: userId,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    userAgent: userData.userAgent || 'Unknown',
    ip: userData.ip || 'Unknown',
    status: 'active',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const sessionRef = await db.collection('sessions').add(sessionData);
  functions.logger.info('User session created', { userId, sessionId: sessionRef.id });

  return sessionRef.id;
}

/**
 * Main Firebase Function triggered on user creation
 */
exports.onUserCreated = functions
  .region('us-west1')
  .auth.user()
  .onCreate(async (user, context) => {
    functions.logger.info('New user created', { uid: user.uid, email: user.email });

    try {
      // Extract token from context if available
      const authToken = context.auth?.token || '';

      // Step 1: Validate auth claims via Gateway API
      let validationResult;
      try {
        validationResult = await validateAuthClaims(user, authToken);
        functions.logger.info('Auth validation successful', { userId: user.uid });
      } catch (validationError) {
        // Log validation failure but continue with limited processing
        functions.logger.warn('Proceeding with limited processing due to validation failure');
      }

      // Step 2: Log user creation to FMS
      await logToFMS(user.uid, 'user_created', {
        email: user.email,
        creationTime: user.metadata.creationTime,
        validationStatus: validationResult ? 'success' : 'failed',
      });

      // Step 3: Create a pilot record for user tracking
      try {
        await db
          .collection('pilots')
          .doc(user.uid)
          .set({
            email: user.email,
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            status: 'active',
            type: 'human',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastActivity: admin.firestore.FieldValue.serverTimestamp(),
          });
        functions.logger.info('Pilot record created', { userId: user.uid });
      } catch (pilotError) {
        functions.logger.error('Failed to create pilot record', {
          userId: user.uid,
          error: pilotError.message,
        });
      }

      // Step 4: Create a user session
      const sessionId = await createUserSession(user.uid, {
        userAgent: context.rawRequest?.headers['user-agent'] || 'Unknown',
        ip: context.rawRequest?.ip || 'Unknown',
      });

      // Step 5: Send welcome email
      if (user.email) {
        await sendWelcomeEmail(user);
      }

      // Log successful completion to FMS
      await logToFMS(user.uid, 'user_onboarding_completed', {
        email: user.email,
        sessionId: sessionId,
        completedAt: new Date().toISOString(),
      });

      return { success: true, userId: user.uid };
    } catch (error) {
      functions.logger.error('User creation processing failed', {
        userId: user.uid,
        error: error.message,
        stack: error.stack,
      });

      // Log error to FMS
      await logToFMS(user.uid, 'user_creation_error', {
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      return { success: false, error: error.message };
    }
  });

/**
 * HTTP Function to manually trigger user onboarding process
 * Useful for testing or reprocessing existing users
 */
exports.processExistingUser = functions.region('us-west1').https.onCall(async (data, context) => {
  // Check if the request is authorized
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Authentication required to process existing users'
    );
  }

  // Check if the user has admin privileges
  const isAdmin = context.auth.token.admin === true;
  if (!isAdmin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Admin privileges required to process existing users'
    );
  }

  const userId = data.userId;
  if (!userId) {
    throw new functions.https.HttpsError('invalid-argument', 'User ID is required');
  }

  try {
    // Get user from Auth
    const user = await admin.auth().getUser(userId);

    // Process user through the same pipeline as new users
    await logToFMS(userId, 'user_reprocessing', {
      triggeredBy: context.auth.uid,
      timestamp: new Date().toISOString(),
    });

    // Create pilot record if not exists
    const pilotRef = db.collection('pilots').doc(userId);
    const pilotDoc = await pilotRef.get();

    if (!pilotDoc.exists) {
      await pilotRef.set({
        email: user.email,
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        status: 'active',
        type: 'human',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastActivity: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Send welcome email if requested
    if (data.sendEmail === true && user.email) {
      await sendWelcomeEmail(user);
    }

    return {
      success: true,
      message: 'User successfully processed',
      userId: userId,
    };
  } catch (error) {
    functions.logger.error('Manual user processing failed', {
      userId,
      error: error.message,
    });

    throw new functions.https.HttpsError('internal', `Processing failed: ${error.message}`);
  }
});
