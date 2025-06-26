/**
 * Memory System Firebase Cloud Functions
 *
 * This module provides Firebase Cloud Functions for managing the session memory
 * system, memory retrieval, and memory analytics within the Aixtiv CLI
 * Owner-Subscriber V1-V2 Immersive System.
 *
 * @module memoryFunctions
 * @author Aixtiv Symphony Team
 * @copyright 2025 AI Publishing International LLP
 * @version 1.0.0
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * HTTP function to add a memory entry
 */
exports.addMemory = onCall(
  {
    region: 'us-west1',
    memory: '256MiB',
  },
  async (request) => {
    const { data, auth } = request;

    // Verify authentication
    if (!auth) {
      throw new HttpsError('unauthenticated', 'Authentication required to add memories');
    }

    try {
      const { content, sessionId, copilotId, type, importance, category, metadata = {} } = data;

      if (!content || !sessionId || !copilotId || !type) {
        throw new HttpsError(
          'invalid-argument',
          'Required fields missing: content, sessionId, copilotId, and type are required'
        );
      }

      // Create the memory entry
      const memoryId = uuidv4();
      const timestamp = admin.firestore.FieldValue.serverTimestamp();

      const memoryEntry = {
        id: memoryId,
        sessionId,
        userId: auth.uid,
        copilotId,
        timestamp,
        type,
        content,
        importance: importance || 5, // Default importance
        category: category || 'general',
        metadata,
        createdAt: timestamp,
      };

      // Store in Firestore
      await db.collection('chat_history').doc(memoryId).set(memoryEntry);

      // Update memory counters for analytics
      const counterRef = db.collection('memory_metrics').doc(auth.uid);
      await counterRef.set(
        {
          total_memories: admin.firestore.FieldValue.increment(1),
          [`${type}_count`]: admin.firestore.FieldValue.increment(1),
          [`copilot_${copilotId}`]: admin.firestore.FieldValue.increment(1),
          last_updated: timestamp,
        },
        { merge: true }
      );

      return { success: true, memoryId };
    } catch (error) {
      console.error('Error adding memory:', error);

      throw new HttpsError('internal', error.message || 'An unknown error occurred', error);
    }
  }
);

/**
 * HTTP function to query memories
 */
exports.queryMemories = onCall(
  {
    region: 'us-west1',
    memory: '256MiB',
  },
  async (request) => {
    const { data, auth } = request;

    // Verify authentication
    if (!auth) {
      throw new HttpsError('unauthenticated', 'Authentication required to query memories');
    }

    try {
      const {
        sessionId,
        copilotId,
        type,
        category,
        fromDate,
        toDate,
        minImportance,
        limit = 50,
        orderBy = 'timestamp',
        orderDirection = 'desc',
      } = data;

      // Start building the query
      let query = db.collection('chat_history').where('userId', '==', auth.uid);

      // Apply filters
      if (sessionId) {
        query = query.where('sessionId', '==', sessionId);
      }

      if (copilotId) {
        query = query.where('copilotId', '==', copilotId);
      }

      if (type) {
        query = query.where('type', '==', type);
      }

      if (category) {
        query = query.where('category', '==', category);
      }

      if (minImportance) {
        query = query.where('importance', '>=', minImportance);
      }

      // Apply date filters if provided
      if (fromDate) {
        const fromTimestamp = new Date(fromDate);
        query = query.where('timestamp', '>=', fromTimestamp);
      }

      if (toDate) {
        const toTimestamp = new Date(toDate);
        query = query.where('timestamp', '<=', toTimestamp);
      }

      // Apply ordering and limit
      query = query.orderBy(orderBy, orderDirection).limit(limit);

      // Execute the query
      const snapshot = await query.get();

      // Extract results
      const memories = [];
      snapshot.forEach((doc) => {
        memories.push(doc.data());
      });

      return { memories };
    } catch (error) {
      console.error('Error querying memories:', error);

      throw new HttpsError('internal', error.message || 'An unknown error occurred', error);
    }
  }
);

/**
 * HTTP function to get memory statistics
 */
exports.getMemoryStats = onCall(
  {
    region: 'us-west1',
    memory: '256MiB',
  },
  async (request) => {
    const { data, auth } = request;

    // Verify authentication
    if (!auth) {
      throw new HttpsError('unauthenticated', 'Authentication required to get memory statistics');
    }

    try {
      // Get basic memory stats from counters
      const counterRef = db.collection('memory_metrics').doc(auth.uid);
      const counterDoc = await counterRef.get();

      let basicStats = {};

      if (counterDoc.exists) {
        basicStats = counterDoc.data();
      } else {
        basicStats = {
          total_memories: 0,
          user_input_count: 0,
          copilot_response_count: 0,
          system_event_count: 0,
          memory_recall_count: 0,
        };
      }

      // Get active session count
      const activeSessions = await db
        .collection('sessions')
        .where('userId', '==', auth.uid)
        .where('status', '==', 'active')
        .count()
        .get();

      // Get recent memory activity
      const recentActivity = await db
        .collection('chat_history')
        .where('userId', '==', auth.uid)
        .orderBy('timestamp', 'desc')
        .limit(5)
        .get();

      const recentMemories = [];
      recentActivity.forEach((doc) => {
        const data = doc.data();
        recentMemories.push({
          id: data.id,
          type: data.type,
          copilotId: data.copilotId,
          timestamp: data.timestamp,
          sessionId: data.sessionId,
          importance: data.importance,
        });
      });

      // Get copilot engagement stats
      const copilotStats = {};
      const copilotQuery = await db
        .collection('chat_history')
        .where('userId', '==', auth.uid)
        .orderBy('timestamp', 'desc')
        .limit(1000) // Analyze last 1000 memories
        .get();

      copilotQuery.forEach((doc) => {
        const data = doc.data();
        const copilotId = data.copilotId;

        if (!copilotStats[copilotId]) {
          copilotStats[copilotId] = {
            interaction_count: 0,
            last_interaction: null,
          };
        }

        copilotStats[copilotId].interaction_count++;

        if (
          !copilotStats[copilotId].last_interaction ||
          data.timestamp > copilotStats[copilotId].last_interaction
        ) {
          copilotStats[copilotId].last_interaction = data.timestamp;
        }
      });

      return {
        basic: basicStats,
        active_sessions: activeSessions.data().count,
        recent_memories: recentMemories,
        copilot_engagement: copilotStats,
      };
    } catch (error) {
      console.error('Error getting memory statistics:', error);

      throw new HttpsError('internal', error.message || 'An unknown error occurred', error);
    }
  }
);

/**
 * HTTP function to clear session memories
 */
exports.clearSessionMemories = onCall(
  {
    region: 'us-west1',
    memory: '256MiB',
  },
  async (request) => {
    const { data, auth } = request;

    // Verify authentication
    if (!auth) {
      throw new HttpsError('unauthenticated', 'Authentication required to clear session memories');
    }

    try {
      const { sessionId } = data;

      if (!sessionId) {
        throw new HttpsError('invalid-argument', 'Session ID is required');
      }

      // Verify session ownership
      const sessionDoc = await db.collection('sessions').doc(sessionId).get();

      if (!sessionDoc.exists) {
        throw new HttpsError('not-found', 'Session not found');
      }

      const sessionData = sessionDoc.data();

      if (sessionData.userId !== auth.uid && !auth.token.admin) {
        throw new HttpsError(
          'permission-denied',
          'You do not have permission to clear this session'
        );
      }

      // Get all memories for this session
      const memoryQuery = await db
        .collection('chat_history')
        .where('sessionId', '==', sessionId)
        .get();

      if (memoryQuery.empty) {
        return { success: true, count: 0 };
      }

      // Delete memories in batches
      const batch = db.batch();
      let count = 0;

      memoryQuery.forEach((doc) => {
        batch.delete(doc.ref);
        count++;
      });

      await batch.commit();

      // Update session status
      await db.collection('sessions').doc(sessionId).update({
        memoriesCleared: true,
        memoryClearTime: admin.firestore.FieldValue.serverTimestamp(),
        memoryClearCount: count,
      });

      // Update memory counters
      const counterRef = db.collection('memory_metrics').doc(auth.uid);
      await counterRef.set(
        {
          total_memories: admin.firestore.FieldValue.increment(-count),
          sessions_cleared: admin.firestore.FieldValue.increment(1),
          last_clear: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return { success: true, count };
    } catch (error) {
      console.error('Error clearing session memories:', error);

      throw new HttpsError('internal', error.message || 'An unknown error occurred', error);
    }
  }
);

/**
 * Firestore trigger to handle memory importance analysis
 */
exports.analyzeMemoryImportance = onDocumentCreated(
  {
    document: 'chat_history/{memoryId}',
    region: 'us-west1',
    memory: '256MiB',
  },
  async (event) => {
    try {
      // In v2, we need to check if data exists first
      if (!event.data) {
        console.log('No data associated with the event');
        return null;
      }

      const memoryData = event.data.data();

      // Skip if importance is already set to a non-default value
      if (memoryData.importance !== 5) {
        return null;
      }

      // Simple importance analysis based on content and metadata
      let importanceScore = 5; // Default score

      // Content-based factors
      const content = memoryData.content.toLowerCase();

      // Check for importance indicators in content
      const importantKeywords = [
        'important',
        'critical',
        'essential',
        'remember',
        'key',
        'significant',
      ];
      for (const keyword of importantKeywords) {
        if (content.includes(keyword)) {
          importanceScore += 1;
        }
      }

      // Check for personal data indicators
      const personalDataKeywords = ['phone', 'address', 'email', 'password', 'personal', 'private'];
      for (const keyword of personalDataKeywords) {
        if (content.includes(keyword)) {
          importanceScore += 2;
        }
      }

      // Metadata-based factors
      if (memoryData.metadata) {
        // Higher importance for user inputs
        if (memoryData.type === 'user_input') {
          importanceScore += 1;
        }

        // Higher importance for specific categories
        if (memoryData.category === 'preference' || memoryData.category === 'personal') {
          importanceScore += 1;
        }

        // Sentiment-based importance
        if (
          memoryData.metadata.sentiment === 'strongly_positive' ||
          memoryData.metadata.sentiment === 'strongly_negative'
        ) {
          importanceScore += 1;
        }
      }

      // Cap the score at 10
      importanceScore = Math.min(10, importanceScore);

      // Update the memory with the analyzed importance
      return event.data.ref.update({
        importance: importanceScore,
        importanceAnalyzed: true,
      });
    } catch (error) {
      console.error('Error analyzing memory importance:', error);
      return null;
    }
  }
);

/**
 * Scheduled function to archive old memories
 */
exports.archiveOldMemories = onSchedule(
  {
    schedule: 'every 24 hours',
    region: 'us-west1',
    memory: '256MiB',
  },
  async (context) => {
    try {
      console.log('Running memory archiving job');

      // Get user preferences for memory retention
      const userPrefs = await db
        .collection('user_profiles')
        .where('preferences.memoryRetention', '!=', 'permanent')
        .get();

      let totalArchived = 0;

      // Process each user's memories according to their preferences
      for (const userDoc of userPrefs.docs) {
        const userData = userDoc.data();
        const userId = userDoc.id;
        const retentionPolicy = userData.preferences?.memoryRetention || 'medium';

        // Determine cutoff date based on retention policy
        const now = new Date();
        let cutoffDate;

        switch (retentionPolicy) {
          case 'short':
            // 30 days retention
            cutoffDate = new Date(now.setDate(now.getDate() - 30));
            break;
          case 'medium':
            // 90 days retention
            cutoffDate = new Date(now.setDate(now.getDate() - 90));
            break;
          case 'long':
            // 365 days retention
            cutoffDate = new Date(now.setDate(now.getDate() - 365));
            break;
          default:
            // Skip users with 'permanent' retention
            continue;
        }

        // Get memories to archive
        const memoriesToArchive = await db
          .collection('chat_history')
          .where('userId', '==', userId)
          .where('timestamp', '<', cutoffDate)
          .where('importance', '<', 8) // Don't archive important memories
          .limit(500) // Process in batches
          .get();

        if (memoriesToArchive.empty) {
          continue;
        }

        console.log(`Archiving ${memoriesToArchive.size} memories for user ${userId}`);

        // Create batch operations
        const batch = db.batch();

        memoriesToArchive.forEach((doc) => {
          const memoryData = doc.data();

          // Add to archive collection
          const archiveRef = db.collection('archived_memories').doc(doc.id);
          batch.set(archiveRef, {
            ...memoryData,
            archivedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Delete from active collection
          batch.delete(doc.ref);

          totalArchived++;
        });

        await batch.commit();

        // Update user's memory metrics
        await db
          .collection('memory_metrics')
          .doc(userId)
          .update({
            total_memories: admin.firestore.FieldValue.increment(-memoriesToArchive.size),
            archived_memories: admin.firestore.FieldValue.increment(memoriesToArchive.size),
            last_archive: admin.firestore.FieldValue.serverTimestamp(),
          });
      }

      console.log(`Archived ${totalArchived} memories total`);

      return { archived: totalArchived };
    } catch (error) {
      console.error('Error archiving old memories:', error);
      return { error: error.message };
    }
  }
);
