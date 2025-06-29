const { admin } = require('../../../lib/firestore');
const telemetry = require('../../../lib/telemetry');

/**
 * Telemetry Handler
 * Provides API endpoints for the React UI to record telemetry data
 */

// Record a telemetry interaction
const recordInteraction = async (req, res) => {
  try {
    const { type, details } = req.body;

    // Validate required parameters
    if (!type) {
      return res.status(400).json({
        success: false,
        message: 'Interaction type is required',
      });
    }

    // Record in telemetry library
    telemetry.recordRequest(type);

    // Store in Firestore for analysis
    await admin
      .firestore()
      .collection('telemetry')
      .add({
        type,
        details: details || {},
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        source: 'ui',
      });

    // Return success (but don't wait for response to avoid blocking UI)
    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    console.error('Error recording telemetry:', error);

    // Don't return error to client - telemetry should never break the application
    return res.status(200).json({
      success: true,
    });
  }
};

// Get telemetry metrics
const getMetrics = async (req, res) => {
  try {
    // Metrics types to collect
    const metricTypes = {
      message_processed: 'Messages Processed',
      task_updated: 'Tasks Updated',
      agent_configured: 'Agent Configurations',
      resource_access_granted: 'Resource Access Grants',
      voice_toggle: 'Voice Toggle Count',
    };

    // Collect metrics in parallel
    const metricPromises = Object.keys(metricTypes).map(async (type) => {
      // Count documents of this type
      const snapshot = await admin
        .firestore()
        .collection('telemetry')
        .where('type', '==', type)
        .count()
        .get();

      return {
        type,
        name: metricTypes[type],
        count: snapshot.data().count,
      };
    });

    // Get counts for each metric type
    const metrics = await Promise.all(metricPromises);

    // Calculate additional derived metrics
    const systemMetrics = {
      responseTimeAverage: 1.2, // Placeholder - would be calculated from actual data
      userSatisfactionScore: 4.7, // Placeholder - would be calculated from actual data
      taskCompletionRate: 83, // Placeholder - would be calculated from actual data
      interactionQualityScore: 92, // Placeholder - would be calculated from actual data
      memoryAccuracyScore: 95, // Placeholder - would be calculated from actual data
      goalAlignmentScore: 89, // Placeholder - would be calculated from actual data
      agentCollaborationScore: 78, // Placeholder - would be calculated from actual data
    };

    return res.status(200).json({
      success: true,
      metrics,
      systemMetrics,
    });
  } catch (error) {
    console.error('Error getting telemetry metrics:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error getting telemetry metrics',
    });
  }
};

module.exports = {
  recordInteraction,
  getMetrics,
};
