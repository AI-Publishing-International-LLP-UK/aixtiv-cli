const { scanResources, grantAgentAccess, revokeAgentAccess } = require('../../../lib/firestore');
const { admin } = require('../../../lib/firestore');
const { logAgentAction } = require('../../../lib/agent-tracking');
const telemetry = require('../../../lib/telemetry');

/**
 * Resource Handler
 * Provides API endpoints for the React UI to interact with resources and permissions
 */

// Get all resources for a user
const getResources = async (req, res) => {
  try {
    const { userId, agentId, email } = req.query;

    // Record in telemetry
    telemetry.recordRequest('resource:scan');

    // Create filters
    const filters = {};
    if (email) filters.email = email;
    if (agentId) filters.agent = agentId;
    if (userId) filters.email = userId; // Override with userId if provided

    // Scan resources with filters
    const result = await scanResources(filters);

    if (result.success) {
      // Process resources for client-side consumption
      const processedResources = result.resources.map((resource) => ({
        id: resource.resourceId,
        name: resource.name || `Resource ${resource.resourceId}`,
        description: resource.description || '',
        authorizedAgents: resource.authorizedAgents || [],
        authorizedPrincipals: resource.authorizedPrincipals || [],
        accessTypes: resource.accessTypes || {},
        createdAt: resource.createdAt,
        updatedAt: resource.updatedAt,
      }));

      return res.status(200).json({
        success: true,
        resources: processedResources,
        count: processedResources.length,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message || 'Failed to scan resources',
      });
    }
  } catch (error) {
    console.error('Error scanning resources:', error);
    telemetry.recordError('resource:scan', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error scanning resources',
    });
  }
};

// Get a specific resource
const getResource = async (req, res) => {
  try {
    const { resourceId } = req.params;

    // Validate required parameters
    if (!resourceId) {
      return res.status(400).json({
        success: false,
        message: 'Resource ID is required',
      });
    }

    // Record in telemetry
    telemetry.recordRequest('resource:get');

    // Get resource from Firestore
    const resourceRef = admin.firestore().collection('resources').doc(resourceId);
    const resourceDoc = await resourceRef.get();

    if (!resourceDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
      });
    }

    // Get resource data
    const resourceData = resourceDoc.data();

    // Get detailed access information
    const authQuery = admin
      .firestore()
      .collection('agentAuthorizations')
      .where('resourceId', '==', resourceId);

    const authSnapshot = await authQuery.get();
    const authorizations = [];

    authSnapshot.forEach((doc) => {
      authorizations.push(doc.data());
    });

    // Format resource for response
    const resource = {
      id: resourceData.resourceId,
      name: resourceData.name || `Resource ${resourceData.resourceId}`,
      description: resourceData.description || '',
      authorizedAgents: resourceData.authorizedAgents || [],
      authorizedPrincipals: resourceData.authorizedPrincipals || [],
      accessTypes: resourceData.accessTypes || {},
      authorizations,
      createdAt: resourceData.createdAt?.toDate() || null,
      updatedAt: resourceData.updatedAt?.toDate() || null,
    };

    return res.status(200).json({
      success: true,
      resource,
    });
  } catch (error) {
    console.error('Error getting resource:', error);
    telemetry.recordError('resource:get', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error getting resource',
    });
  }
};

// Grant agent access to a resource
const grantAccess = async (req, res) => {
  try {
    const { email, agent, resource, type } = req.body;

    // Validate required parameters
    if (!email || !agent || !resource) {
      return res.status(400).json({
        success: false,
        message: 'Email, agent ID, and resource ID are required',
      });
    }

    // Record in telemetry
    telemetry.recordRequest('resource:grant');

    // Grant access using firestore utility
    const result = await grantAgentAccess(email, agent, resource, type || 'full');

    if (result.success) {
      // Log agent action for tracking
      await logAgentAction('resource_access_granted', {
        principal: email,
        agent_id: agent,
        resource_id: resource,
        access_type: type || 'full',
      });

      return res.status(200).json(result);
    } else {
      return res.status(400).json({
        success: false,
        message: result.message || 'Failed to grant access',
      });
    }
  } catch (error) {
    console.error('Error granting access:', error);
    telemetry.recordError('resource:grant', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error granting access',
    });
  }
};

// Revoke agent access to a resource
const revokeAccess = async (req, res) => {
  try {
    const { email, agent, resource } = req.body;

    // Validate required parameters
    if (!email || !agent || !resource) {
      return res.status(400).json({
        success: false,
        message: 'Email, agent ID, and resource ID are required',
      });
    }

    // Record in telemetry
    telemetry.recordRequest('resource:revoke');

    // Revoke access using firestore utility
    const result = await revokeAgentAccess(email, agent, resource);

    if (result.success) {
      // Log agent action for tracking
      await logAgentAction('resource_access_revoked', {
        principal: email,
        agent_id: agent,
        resource_id: resource,
      });

      return res.status(200).json(result);
    } else {
      return res.status(400).json({
        success: false,
        message: result.message || 'Failed to revoke access',
      });
    }
  } catch (error) {
    console.error('Error revoking access:', error);
    telemetry.recordError('resource:revoke', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error revoking access',
    });
  }
};

// Create a new resource
const createResource = async (req, res) => {
  try {
    const { name, description, principal } = req.body;

    // Validate required parameters
    if (!name || !principal) {
      return res.status(400).json({
        success: false,
        message: 'Resource name and principal email are required',
      });
    }

    // Record in telemetry
    telemetry.recordRequest('resource:create');

    // Generate a unique resource ID
    const resourceId = `resource-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Create resource in Firestore
    const resourceRef = admin.firestore().collection('resources').doc(resourceId);

    await resourceRef.set({
      resourceId,
      name,
      description: description || `Resource for ${principal}`,
      authorizedAgents: [],
      authorizedPrincipals: [principal],
      accessTypes: {},
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Log agent action for tracking
    await logAgentAction('resource_created', {
      principal,
      resource_id: resourceId,
      resource_name: name,
    });

    return res.status(201).json({
      success: true,
      message: 'Resource created successfully',
      resourceId,
    });
  } catch (error) {
    console.error('Error creating resource:', error);
    telemetry.recordError('resource:create', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error creating resource',
    });
  }
};

module.exports = {
  getResources,
  getResource,
  grantAccess,
  revokeAccess,
  createResource,
};
