const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase
let serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

// Try to find service account in config folder if not provided via env
if (!serviceAccountPath) {
  const configPath = path.join(__dirname, '../config/service-account-key.json');
  if (fs.existsSync(configPath)) {
    serviceAccountPath = configPath;
  }
}

// Initialize Firebase Admin
if (!admin.apps.length) {
  if (serviceAccountPath) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else {
    // Try application default credentials
    admin.initializeApp({
      credential: admin.credential.applicationDefault()
    });
  }
}

// Get Firestore instance
const firestore = admin.firestore();

/**
 * Grant agent access to a resource
 * @param {string} principal - Principal email
 * @param {string} agent - Agent ID
 * @param {string} resource - Resource ID
 * @param {string} accessType - Type of access (full, readonly, delegated) 
 * @returns {Promise<object>} Operation result
 */
async function grantAgentAccess(principal, agent, resource, accessType = 'full') {
  try {
    // Create unique auth record ID
    const authId = `${agent}-${resource.replace(/[^\w-]/g, '')}`;
    
    // Create authorization document
    await firestore.collection('agentAuthorizations').doc(authId).set({
      principal,
      resourceId: resource,
      agentId: agent,
      accessType,
      authorized: true,
      specialAccess: accessType === 'full',
      overrideRules: accessType === 'full',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Update SalleyPort configuration
    const configRef = firestore.collection('config').doc('salleyport');
    const configDoc = await configRef.get();
    
    if (!configDoc.exists) {
      // Create config document if it doesn't exist
      await configRef.set({
        delegatesList: [principal],
        agentResources: {
          [agent]: [resource]
        }
      });
    } else {
      // Update existing config document
      await configRef.update({
        delegatesList: admin.firestore.FieldValue.arrayUnion(principal),
        [`agentResources.${agent}`]: admin.firestore.FieldValue.arrayUnion(resource)
      });
    }
    
    // Update resource document
    const resourceRef = firestore.collection('resources').doc(resource);
    const resourceDoc = await resourceRef.get();
    
    if (!resourceDoc.exists) {
      // Create resource document if it doesn't exist
      await resourceRef.set({
        resourceId: resource,
        name: `Resource ${resource}`,
        description: `Resource ${resource} for ${principal}`,
        authorizedAgents: [agent],
        authorizedPrincipals: [principal],
        accessTypes: {
          [agent]: accessType
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      // Update existing resource document
      await resourceRef.update({
        authorizedAgents: admin.firestore.FieldValue.arrayUnion(agent),
        authorizedPrincipals: admin.firestore.FieldValue.arrayUnion(principal),
        [`accessTypes.${agent}`]: accessType,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    return { 
      success: true, 
      message: `Access granted for agent ${agent} to resource ${resource}`,
      details: {
        principal,
        agent,
        resource,
        accessType
      }
    };
  } catch (error) {
    console.error('Error granting agent access:', error);
    return {
      success: false,
      message: 'Error granting agent access',
      error: error.message
    };
  }
}

/**
 * Revoke agent access to a resource
 * @param {string} principal - Principal email
 * @param {string} agent - Agent ID
 * @param {string} resource - Resource ID
 * @returns {Promise<object>} Operation result
 */
async function revokeAgentAccess(principal, agent, resource) {
  try {
    // Create unique auth record ID
    const authId = `${agent}-${resource.replace(/[^\w-]/g, '')}`;
    
    // Remove authorization document
    await firestore.collection('agentAuthorizations').doc(authId).delete();
    
    // Update SalleyPort configuration
    const configRef = firestore.collection('config').doc('salleyport');
    await configRef.update({
      [`agentResources.${agent}`]: admin.firestore.FieldValue.arrayRemove(resource)
    });
    
    // Check if agent has any remaining resources
    const configDoc = await configRef.get();
    const agentResources = configDoc.data()?.agentResources?.[agent] || [];
    
    if (agentResources.length === 0) {
      // If agent has no more resources, remove principal from delegates list
      await configRef.update({
        delegatesList: admin.firestore.FieldValue.arrayRemove(principal)
      });
    }
    
    // Update resource document
    const resourceRef = firestore.collection('resources').doc(resource);
    await resourceRef.update({
      authorizedAgents: admin.firestore.FieldValue.arrayRemove(agent),
      [`accessTypes.${agent}`]: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Check if resource has any remaining agents
    const resourceDoc = await resourceRef.get();
    const authorizedAgents = resourceDoc.data()?.authorizedAgents || [];
    
    if (authorizedAgents.length === 0) {
      // If resource has no more agents, remove principal
      await resourceRef.update({
        authorizedPrincipals: admin.firestore.FieldValue.arrayRemove(principal)
      });
    }
    
    return { 
      success: true, 
      message: `Access revoked for agent ${agent} to resource ${resource}`,
      details: {
        principal,
        agent,
        resource
      }
    };
  } catch (error) {
    console.error('Error revoking agent access:', error);
    return {
      success: false,
      message: 'Error revoking agent access',
      error: error.message
    };
  }
}

/**
 * Scan resources for access patterns
 * @param {object} filters - Optional filters
 * @returns {Promise<object>} Scan results
 */
async function scanResources(filters = {}) {
  try {
    const { resource, agent, email } = filters;
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
        resources: []
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
      
      // Apply email filter if provided
      if (email && !data.authorizedPrincipals?.includes(email)) {
        continue;
      }
      
      // Get detailed authorization records
      const authQuery = firestore.collection('agentAuthorizations')
        .where('resourceId', '==', data.resourceId);
      
      const authSnapshot = await authQuery.get();
      const authorizations = authSnapshot.docs.map(doc => doc.data());
      
      resources.push({
        resourceId: data.resourceId,
        name: data.name,
        description: data.description,
        authorizedAgents: data.authorizedAgents || [],
        authorizedPrincipals: data.authorizedPrincipals || [],
        accessTypes: data.accessTypes || {},
        authorizations,
        createdAt: data.createdAt?.toDate() || null,
        updatedAt: data.updatedAt?.toDate() || null
      });
    }
    
    return { 
      success: true, 
      message: `Found ${resources.length} resources`,
      resources
    };
  } catch (error) {
    console.error('Error scanning resources:', error);
    return {
      success: false,
      message: 'Error scanning resources',
      error: error.message
    };
  }
}

/**
 * Verify authentication status
 * @param {object} params - Verification parameters
 * @returns {Promise<object>} Verification result
 */
async function verifyAuthentication(params = {}) {
  try {
    const { email, agent } = params;
    
    // If both email and agent provided, check specific relationship
    if (email && agent) {
      const configRef = firestore.collection('config').doc('salleyport');
      const configDoc = await configRef.get();
      
      if (!configDoc.exists) {
        return {
          success: false,
          message: 'No SalleyPort configuration found',
          status: 'not_configured'
        };
      }
      
      const configData = configDoc.data();
      const isDelegated = configData?.delegatesList?.includes(email);
      const agentResources = configData?.agentResources?.[agent] || [];
      
      return {
        success: true,
        message: `Authentication verification for ${email} with agent ${agent}`,
        status: isDelegated ? 'authorized' : 'unauthorized',
        isDelegated,
        resourceCount: agentResources.length,
        resources: agentResources
      };
    }
    
    // If only email provided, check delegation status
    if (email) {
      const configRef = firestore.collection('config').doc('salleyport');
      const configDoc = await configRef.get();
      
      if (!configDoc.exists) {
        return {
          success: false,
          message: 'No SalleyPort configuration found',
          status: 'not_configured'
        };
      }
      
      const configData = configDoc.data();
      const isDelegated = configData?.delegatesList?.includes(email);
      
      return {
        success: true,
        message: `Authentication verification for ${email}`,
        status: isDelegated ? 'authorized' : 'unauthorized',
        isDelegated
      };
    }
    
    // If only agent provided, check agent resources
    if (agent) {
      const configRef = firestore.collection('config').doc('salleyport');
      const configDoc = await configRef.get();
      
      if (!configDoc.exists) {
        return {
          success: false,
          message: 'No SalleyPort configuration found',
          status: 'not_configured'
        };
      }
      
      const configData = configDoc.data();
      const agentResources = configData?.agentResources?.[agent] || [];
      
      return {
        success: true,
        message: `Authentication verification for agent ${agent}`,
        status: agentResources.length > 0 ? 'authorized' : 'unauthorized',
        isAuthorized: agentResources.length > 0,
        resourceCount: agentResources.length,
        resources: agentResources
      };
    }
    
    // If no specific parameters provided, return general system status
    const configRef = firestore.collection('config').doc('salleyport');
    const configDoc = await configRef.get();
    
    if (!configDoc.exists) {
      return {
        success: false,
        message: 'No SalleyPort configuration found',
        status: 'not_configured'
      };
    }
    
    const configData = configDoc.data();
    const delegateCount = configData?.delegatesList?.length || 0;
    const agentKeys = Object.keys(configData?.agentResources || {});
    
    return {
      success: true,
      message: 'SalleyPort system status',
      status: 'configured',
      delegateCount,
      agentCount: agentKeys.length,
      agents: agentKeys
    };
  } catch (error) {
    console.error('Error verifying authentication:', error);
    return {
      success: false,
      message: 'Error verifying authentication',
      error: error.message
    };
  }
}

module.exports = {
  firestore,
  admin,
  grantAgentAccess,
  revokeAgentAccess,
  scanResources,
  verifyAuthentication
};