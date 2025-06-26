/**
 * Unified resource access management module
 *
 * This module implements resource access control for the unified agent system,
 * providing a single interface for all agent types.
 */

const admin = require('firebase-admin');
const { firestore } = require('./firestore');
const { getAgent } = require('./agent-schema');

/**
 * Grants access to a resource for any agent type
 *
 * @param {string} principal - Principal email
 * @param {string} agentId - Agent ID in the unified system
 * @param {string} resourceId - Resource ID
 * @param {string} accessType - Type of access (readonly, delegated, full)
 * @returns {Promise<object>} Operation result
 */
async function grantUnifiedAgentAccess(principal, agentId, resourceId, accessType = 'readonly') {
  try {
    // Get agent details
    const agentResult = await getAgent(agentId);
    if (!agentResult.success) {
      return {
        success: false,
        message: agentResult.message,
      };
    }

    const agent = agentResult.agent;

    // Create unique auth record ID
    const authId = `${agentId}-${resourceId.replace(/[^\w-]/g, '')}`;

    // Create authorization document
    await firestore
      .collection('unifiedAuthorizations')
      .doc(authId)
      .set({
        principal,
        resourceId,
        agentId,
        agentType: agent.type,
        accessType,
        authorized: true,
        specialAccess: accessType === 'full',
        overrideRules: accessType === 'full',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    // Update resource document
    const resourceRef = firestore.collection('resources').doc(resourceId);
    const resourceDoc = await resourceRef.get();

    if (!resourceDoc.exists) {
      // Create resource document if it doesn't exist
      await resourceRef.set({
        resourceId,
        name: `Resource ${resourceId}`,
        description: `Resource ${resourceId} for ${principal}`,
        authorizedAgents: [agentId],
        authorizedPrincipals: [principal],
        accessTypes: {
          [agentId]: accessType,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // Update existing resource document
      await resourceRef.update({
        authorizedAgents: admin.firestore.FieldValue.arrayUnion(agentId),
        authorizedPrincipals: admin.firestore.FieldValue.arrayUnion(principal),
        [`accessTypes.${agentId}`]: accessType,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Update principal document
    const principalRef = firestore.collection('principals').doc(principal.replace(/[^\w-]/g, ''));
    const principalDoc = await principalRef.get();

    if (!principalDoc.exists) {
      // Create principal document if it doesn't exist
      await principalRef.set({
        email: principal,
        authorizedResources: [resourceId],
        authorizedAgents: [agentId],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // Update existing principal document
      await principalRef.update({
        authorizedResources: admin.firestore.FieldValue.arrayUnion(resourceId),
        authorizedAgents: admin.firestore.FieldValue.arrayUnion(agentId),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return {
      success: true,
      message: `Access granted for agent ${agentId} to resource ${resourceId}`,
      details: {
        principal,
        agent: agentId,
        agentType: agent.type,
        resource: resourceId,
        accessType,
      },
    };
  } catch (error) {
    console.error('Error granting unified agent access:', error);
    return {
      success: false,
      message: 'Error granting agent access',
      error: error.message,
    };
  }
}

/**
 * Revokes access to a resource for any agent type
 *
 * @param {string} principal - Principal email
 * @param {string} agentId - Agent ID in the unified system
 * @param {string} resourceId - Resource ID
 * @returns {Promise<object>} Operation result
 */
async function revokeUnifiedAgentAccess(principal, agentId, resourceId) {
  try {
    // Create unique auth record ID
    const authId = `${agentId}-${resourceId.replace(/[^\w-]/g, '')}`;

    // Check if authorization exists
    const authRef = firestore.collection('unifiedAuthorizations').doc(authId);
    const authDoc = await authRef.get();

    if (!authDoc.exists) {
      return {
        success: false,
        message: `No authorization found for agent ${agentId} to resource ${resourceId}`,
      };
    }

    // Delete authorization document
    await authRef.delete();

    // Update resource document
    const resourceRef = firestore.collection('resources').doc(resourceId);
    const resourceDoc = await resourceRef.get();

    if (resourceDoc.exists) {
      await resourceRef.update({
        authorizedAgents: admin.firestore.FieldValue.arrayRemove(agentId),
        [`accessTypes.${agentId}`]: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Check if resource has any remaining agents
      const updatedResourceDoc = await resourceRef.get();
      const resourceData = updatedResourceDoc.data();

      if (!resourceData.authorizedAgents || resourceData.authorizedAgents.length === 0) {
        // If no agents left, remove principal from authorized principals
        await resourceRef.update({
          authorizedPrincipals: admin.firestore.FieldValue.arrayRemove(principal),
        });
      }
    }

    // Update principal document
    const principalRef = firestore.collection('principals').doc(principal.replace(/[^\w-]/g, ''));
    const principalDoc = await principalRef.get();

    if (principalDoc.exists) {
      // Remove this resource from principal's authorized resources
      const principalData = principalDoc.data();

      // Check if this was the only agent with access to this resource
      const authQuery = firestore
        .collection('unifiedAuthorizations')
        .where('resourceId', '==', resourceId)
        .where('principal', '==', principal);

      const authSnapshot = await authQuery.get();

      if (authSnapshot.empty) {
        // If no other agents have access to this resource, remove it from principal's resources
        await principalRef.update({
          authorizedResources: admin.firestore.FieldValue.arrayRemove(resourceId),
        });
      }

      // Check if principal has any other authorizations for this agent
      const agentAuthQuery = firestore
        .collection('unifiedAuthorizations')
        .where('agentId', '==', agentId)
        .where('principal', '==', principal);

      const agentAuthSnapshot = await agentAuthQuery.get();

      if (agentAuthSnapshot.empty) {
        // If no other resources for this agent, remove it from principal's agents
        await principalRef.update({
          authorizedAgents: admin.firestore.FieldValue.arrayRemove(agentId),
        });
      }
    }

    return {
      success: true,
      message: `Access revoked for agent ${agentId} to resource ${resourceId}`,
      details: {
        principal,
        agent: agentId,
        resource: resourceId,
      },
    };
  } catch (error) {
    console.error('Error revoking unified agent access:', error);
    return {
      success: false,
      message: 'Error revoking agent access',
      error: error.message,
    };
  }
}

/**
 * Scans resources for access patterns in the unified system
 *
 * @param {object} filters - Optional filters
 * @returns {Promise<object>} Scan results
 */
async function scanUnifiedResources(filters = {}) {
  try {
    const { resource, agent, principal } = filters;
    let query = firestore.collection('resources');

    // Apply resource filter if provided
    if (resource) {
      query = query.where('resourceId', '==', resource);
    }

    // Get all resources that match the filter
    const resourcesSnapshot = await query.get();

    if (resourcesSnapshot.empty) {
      return {
        success: true,
        message: 'No resources found',
        resources: [],
      };
    }

    // Process resources
    const resources = [];

    for (const doc of resourcesSnapshot.docs) {
      const data = doc.data();

      // Apply agent filter if provided
      if (agent && !data.authorizedAgents?.includes(agent)) {
        continue;
      }

      // Apply principal filter if provided
      if (principal && !data.authorizedPrincipals?.includes(principal)) {
        continue;
      }

      // Get detailed authorization records
      const authQuery = firestore
        .collection('unifiedAuthorizations')
        .where('resourceId', '==', data.resourceId);

      const authSnapshot = await authQuery.get();
      const authorizations = authSnapshot.docs.map((doc) => doc.data());

      resources.push({
        resourceId: data.resourceId,
        name: data.name,
        description: data.description,
        authorizedAgents: data.authorizedAgents || [],
        authorizedPrincipals: data.authorizedPrincipals || [],
        accessTypes: data.accessTypes || {},
        authorizations,
        createdAt: data.createdAt?.toDate() || null,
        updatedAt: data.updatedAt?.toDate() || null,
      });
    }

    return {
      success: true,
      message: `Found ${resources.length} resources`,
      resources,
    };
  } catch (error) {
    console.error('Error scanning unified resources:', error);
    return {
      success: false,
      message: 'Error scanning resources',
      error: error.message,
    };
  }
}

module.exports = {
  grantUnifiedAgentAccess,
  revokeUnifiedAgentAccess,
  scanUnifiedResources,
};
