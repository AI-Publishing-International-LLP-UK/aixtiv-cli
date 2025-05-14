const { admin } = require('../../../lib/firestore');
const { logAgentAction } = require('../../../lib/agent-tracking');
const telemetry = require('../../../lib/telemetry');

/**
 * Agent Handler
 * Provides API endpoints for the React UI to interact with agents
 */

// Get available agents for a user
const getAgents = async (req, res) => {
  try {
    const { userId } = req.query;
    
    // Validate required parameters
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    
    // Record in telemetry
    telemetry.recordRequest('agent:list');
    
    // Get agents from Firestore
    const agentsRef = admin.firestore().collection('agents');
    const agentsSnapshot = await agentsRef.get();
    
    // Process agents
    const agents = [];
    agentsSnapshot.forEach(doc => {
      const agent = doc.data();
      
      // Add agent to the list
      agents.push({
        id: doc.id,
        name: agent.displayName || agent.name || `Agent ${doc.id}`,
        role: agent.role || 'Assistant',
        description: agent.description || '',
        defaultEmotion: agent.defaultEmotion || '😊',
        squad: agent.squad || null,
        squadron: agent.squadron || null,
        status: agent.status || 'active',
        specializations: agent.specializations || []
      });
    });
    
    // Filter agents based on user authorization
    // This would normally check if the user has access to each agent
    // For demo purposes, we'll return all agents
    
    return res.status(200).json({
      success: true,
      agents
    });
  } catch (error) {
    console.error('Error getting agents:', error);
    telemetry.recordError('agent:list', error);
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error getting agents'
    });
  }
};

// Get details for a specific agent
const getAgentDetails = async (req, res) => {
  try {
    const { agentId } = req.params;
    
    // Validate required parameters
    if (!agentId) {
      return res.status(400).json({
        success: false,
        message: 'Agent ID is required'
      });
    }
    
    // Record in telemetry
    telemetry.recordRequest('agent:details');
    
    // Get agent from Firestore
    const agentRef = admin.firestore().collection('agents').doc(agentId);
    const agentDoc = await agentRef.get();
    
    if (!agentDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }
    
    // Get agent data
    const agentData = agentDoc.data();
    
    // Format agent for response
    const agent = {
      id: agentId,
      name: agentData.displayName || agentData.name || `Agent ${agentId}`,
      role: agentData.role || 'Assistant',
      description: agentData.description || '',
      defaultEmotion: agentData.defaultEmotion || '😊',
      squad: agentData.squad || null,
      squadron: agentData.squadron || null,
      status: agentData.status || 'active',
      specializations: agentData.specializations || [],
      avatarUrl: agentData.avatarUrl || null
    };
    
    return res.status(200).json({
      success: true,
      agent
    });
  } catch (error) {
    console.error('Error getting agent details:', error);
    telemetry.recordError('agent:details', error);
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error getting agent details'
    });
  }
};

// Configure agent settings
const configureAgent = async (req, res) => {
  try {
    const { agentId } = req.params;
    const { config } = req.body;
    
    // Validate required parameters
    if (!agentId || !config) {
      return res.status(400).json({
        success: false,
        message: 'Agent ID and configuration are required'
      });
    }
    
    // Record in telemetry
    telemetry.recordRequest('agent:configure');
    
    // Get agent from Firestore
    const agentRef = admin.firestore().collection('agents').doc(agentId);
    const agentDoc = await agentRef.get();
    
    if (!agentDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }
    
    // Update agent configuration in user preferences
    // For this demo, we'll store in a separate collection to avoid modifying the agent itself
    const preferencesRef = admin.firestore().collection('userAgentPreferences').doc(`${config.userId}_${agentId}`);
    
    await preferencesRef.set({
      userId: config.userId,
      agentId,
      voiceEnabled: config.voiceEnabled,
      voiceModel: config.voiceModel,
      language: config.language,
      personality: config.personality,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    // Log agent action
    await logAgentAction('agent_configured', {
      principal: config.userId,
      agent_id: agentId,
      configuration: config
    });
    
    return res.status(200).json({
      success: true,
      message: 'Agent configuration updated'
    });
  } catch (error) {
    console.error('Error configuring agent:', error);
    telemetry.recordError('agent:configure', error);
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error configuring agent'
    });
  }
};

// Activate an agent
const activateAgent = async (req, res) => {
  try {
    const { agentId, userId } = req.body;
    
    // Validate required parameters
    if (!agentId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Agent ID and user ID are required'
      });
    }
    
    // Record in telemetry
    telemetry.recordRequest('agent:activate');
    
    // Get agent from Firestore
    const agentRef = admin.firestore().collection('agents').doc(agentId);
    const agentDoc = await agentRef.get();
    
    if (!agentDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }
    
    // Log agent action
    await logAgentAction('agent_activated', {
      principal: userId,
      agent_id: agentId
    });
    
    return res.status(200).json({
      success: true,
      message: 'Agent activated successfully'
    });
  } catch (error) {
    console.error('Error activating agent:', error);
    telemetry.recordError('agent:activate', error);
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error activating agent'
    });
  }
};

// Get agent activity for a user
const getAgentActivity = async (req, res) => {
  try {
    const { userId, agentId, limit } = req.query;
    
    // Validate required parameters
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    
    // Record in telemetry
    telemetry.recordRequest('agent:activity');
    
    // Create query for agent activity
    let query = admin.firestore().collection('agentActions')
      .where('principal', '==', userId)
      .orderBy('timestamp', 'desc');
    
    // Filter by agent if provided
    if (agentId) {
      query = query.where('agent_id', '==', agentId);
    }
    
    // Apply limit if provided
    if (limit) {
      query = query.limit(parseInt(limit, 10));
    } else {
      query = query.limit(50); // Default limit
    }
    
    // Execute query
    const activitySnapshot = await query.get();
    
    // Process activity
    const activities = [];
    activitySnapshot.forEach(doc => {
      const action = doc.data();
      activities.push({
        id: doc.id,
        action: action.action,
        agentId: action.agent_id,
        principal: action.principal,
        details: action.details || {},
        timestamp: action.timestamp?.toDate() || null
      });
    });
    
    return res.status(200).json({
      success: true,
      activities
    });
  } catch (error) {
    console.error('Error getting agent activity:', error);
    telemetry.recordError('agent:activity', error);
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error getting agent activity'
    });
  }
};

module.exports = {
  getAgents,
  getAgentDetails,
  configureAgent,
  activateAgent,
  getAgentActivity
};