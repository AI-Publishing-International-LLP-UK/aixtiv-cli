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
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    // Try application default credentials
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
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
    await firestore
      .collection('agentAuthorizations')
      .doc(authId)
      .set({
        principal,
        resourceId: resource,
        agentId: agent,
        accessType,
        authorized: true,
        specialAccess: accessType === 'full',
        overrideRules: accessType === 'full',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    // Update SalleyPort configuration
    const configRef = firestore.collection('config').doc('salleyport');
    const configDoc = await configRef.get();

    if (!configDoc.exists) {
      // Create config document if it doesn't exist
      await configRef.set({
        delegatesList: [principal],
        agentResources: {
          [agent]: [resource],
        },
      });
    } else {
      // Update existing config document
      await configRef.update({
        delegatesList: admin.firestore.FieldValue.arrayUnion(principal),
        [`agentResources.${agent}`]: admin.firestore.FieldValue.arrayUnion(resource),
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
          [agent]: accessType,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // Update existing resource document
      await resourceRef.update({
        authorizedAgents: admin.firestore.FieldValue.arrayUnion(agent),
        authorizedPrincipals: admin.firestore.FieldValue.arrayUnion(principal),
        [`accessTypes.${agent}`]: accessType,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return {
      success: true,
      message: `Access granted for agent ${agent} to resource ${resource}`,
      details: {
        principal,
        agent,
        resource,
        accessType,
      },
    };
  } catch (error) {
    console.error('Error granting agent access:', error);
    return {
      success: false,
      message: 'Error granting agent access',
      error: error.message,
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
      [`agentResources.${agent}`]: admin.firestore.FieldValue.arrayRemove(resource),
    });

    // Check if agent has any remaining resources
    const configDoc = await configRef.get();
    const agentResources = configDoc.data()?.agentResources?.[agent] || [];

    if (agentResources.length === 0) {
      // If agent has no more resources, remove principal from delegates list
      await configRef.update({
        delegatesList: admin.firestore.FieldValue.arrayRemove(principal),
      });
    }

    // Update resource document
    const resourceRef = firestore.collection('resources').doc(resource);
    await resourceRef.update({
      authorizedAgents: admin.firestore.FieldValue.arrayRemove(agent),
      [`accessTypes.${agent}`]: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Check if resource has any remaining agents
    const resourceDoc = await resourceRef.get();
    const authorizedAgents = resourceDoc.data()?.authorizedAgents || [];

    if (authorizedAgents.length === 0) {
      // If resource has no more agents, remove principal
      await resourceRef.update({
        authorizedPrincipals: admin.firestore.FieldValue.arrayRemove(principal),
      });
    }

    return {
      success: true,
      message: `Access revoked for agent ${agent} to resource ${resource}`,
      details: {
        principal,
        agent,
        resource,
      },
    };
  } catch (error) {
    console.error('Error revoking agent access:', error);
    return {
      success: false,
      message: 'Error revoking agent access',
      error: error.message,
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

      // Apply email filter if provided
      if (email && !data.authorizedPrincipals?.includes(email)) {
        continue;
      }

      // Get detailed authorization records
      const authQuery = firestore
        .collection('agentAuthorizations')
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
    console.error('Error scanning resources:', error);
    return {
      success: false,
      message: 'Error scanning resources',
      error: error.message,
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
          status: 'not_configured',
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
        resources: agentResources,
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
          status: 'not_configured',
        };
      }

      const configData = configDoc.data();
      const isDelegated = configData?.delegatesList?.includes(email);

      return {
        success: true,
        message: `Authentication verification for ${email}`,
        status: isDelegated ? 'authorized' : 'unauthorized',
        isDelegated,
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
          status: 'not_configured',
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
        resources: agentResources,
      };
    }

    // If no specific parameters provided, return general system status
    const configRef = firestore.collection('config').doc('salleyport');
    const configDoc = await configRef.get();

    if (!configDoc.exists) {
      return {
        success: false,
        message: 'No SalleyPort configuration found',
        status: 'not_configured',
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
      agents: agentKeys,
    };
  } catch (error) {
    console.error('Error verifying authentication:', error);
    return {
      success: false,
      message: 'Error verifying authentication',
      error: error.message,
    };
  }
}

/**
 * Links a co-pilot to a principal, establishing a trusted relationship
 * @param {string} principal - Principal email
 * @param {string} copilot - Co-pilot email
 * @param {string} level - Trust level (standard, enhanced, executive)
 * @returns {Promise<object>} Operation result
 */
async function linkCopilot(principal, copilot, level = 'standard') {
  try {
    // Create unique relationship ID
    const relationshipId = `${principal.replace(/[^\w-]/g, '')}-${copilot.replace(/[^\w-]/g, '')}`;

    // Check if relationship already exists
    const relationshipRef = firestore.collection('copilotRelationships').doc(relationshipId);
    const doc = await relationshipRef.get();

    if (doc.exists) {
      // Update existing relationship if level is higher
      const data = doc.data();
      const currentLevel = data.level;

      const levelPriority = { standard: 1, enhanced: 2, executive: 3 };
      if (levelPriority[level] <= levelPriority[currentLevel]) {
        return {
          success: true,
          message: `Co-pilot already linked with level ${currentLevel}`,
          active: data.active,
          createdAt: data.createdAt.toDate(),
          expiresAt: data.expiresAt?.toDate(),
        };
      }

      // Upgrade the relationship level
      await relationshipRef.update({
        level,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        message: `Co-pilot level upgraded from ${currentLevel} to ${level}`,
        active: data.active,
        createdAt: data.createdAt.toDate(),
        expiresAt: data.expiresAt?.toDate(),
      };
    }

    // Create new relationship
    await relationshipRef.set({
      principal,
      copilot,
      level,
      active: level === 'standard', // Executive and enhanced require verification
      verified: false,
      culturalEmpathyVerified: false,
      linkedinVerified: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: null, // No expiration by default
      culturalEmpathyCode: level === 'executive' ? generateCulturalEmpathyCode() : null,
    });

    // Update principal document
    const principalRef = firestore.collection('principals').doc(principal.replace(/[^\w-]/g, ''));
    const principalDoc = await principalRef.get();

    if (!principalDoc.exists) {
      await principalRef.set({
        email: principal,
        copilots: [copilot],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      await principalRef.update({
        copilots: admin.firestore.FieldValue.arrayUnion(copilot),
      });
    }

    return {
      success: true,
      message: `Co-pilot linked with level ${level}`,
      active: level === 'standard',
      createdAt: new Date(),
      culturalEmpathyCode: level === 'executive' ? '' : null, // Don't return actual code in response
    };
  } catch (error) {
    console.error('Error linking co-pilot:', error);
    return {
      success: false,
      message: 'Error linking co-pilot',
      error: error.message,
    };
  }
}

/**
 * Generates a cultural empathy code for executive level co-pilots
 * @returns {string} Cultural empathy code
 */
function generateCulturalEmpathyCode() {
  // Generate a 6-character alphanumeric code
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';

  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return code;
}

/**
 * Unlinks a co-pilot from a principal
 * @param {string} principal - Principal email
 * @param {string} copilot - Co-pilot email
 * @returns {Promise<object>} Operation result
 */
async function unlinkCopilot(principal, copilot) {
  try {
    // Create unique relationship ID
    const relationshipId = `${principal.replace(/[^\w-]/g, '')}-${copilot.replace(/[^\w-]/g, '')}`;

    // Check if relationship exists
    const relationshipRef = firestore.collection('copilotRelationships').doc(relationshipId);
    const doc = await relationshipRef.get();

    if (!doc.exists) {
      return {
        success: false,
        message: 'Co-pilot relationship not found',
      };
    }

    // Delete relationship
    await relationshipRef.delete();

    // Update principal document
    const principalRef = firestore.collection('principals').doc(principal.replace(/[^\w-]/g, ''));
    await principalRef.update({
      copilots: admin.firestore.FieldValue.arrayRemove(copilot),
    });

    // Find and revoke all resource access granted to this co-pilot
    const accessQuery = firestore
      .collection('resourceAccess')
      .where('principal', '==', principal)
      .where('copilot', '==', copilot);

    const accessSnapshot = await accessQuery.get();
    let activeSessions = 0;

    // Batch delete all access records
    const batch = firestore.batch();
    accessSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
      activeSessions++;
    });

    await batch.commit();

    return {
      success: true,
      message: `Co-pilot unlinked successfully`,
      activeSessions,
    };
  } catch (error) {
    console.error('Error unlinking co-pilot:', error);
    return {
      success: false,
      message: 'Error unlinking co-pilot',
      error: error.message,
    };
  }
}

/**
 * Lists all co-pilots linked to a principal or all co-pilot relationships
 * @param {string} principal - Optional principal email to filter by
 * @param {string} status - Filter by status (active, pending, all)
 * @returns {Promise<Array>} List of co-pilot relationships
 */
async function listCopilots(principal = null, status = 'active') {
  try {
    let query = firestore.collection('copilotRelationships');

    // Apply principal filter if provided
    if (principal) {
      query = query.where('principal', '==', principal);
    }

    // Apply status filter if not 'all'
    if (status !== 'all') {
      const isActive = status === 'active';
      query = query.where('active', '==', isActive);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      return [];
    }

    // Process relationships
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        principal: data.principal,
        copilot: data.copilot,
        level: data.level,
        active: data.active,
        verified: data.verified,
        createdAt: data.createdAt?.toDate() || null,
        expiresAt: data.expiresAt?.toDate() || null,
      };
    });
  } catch (error) {
    console.error('Error listing co-pilots:', error);
    throw error;
  }
}

/**
 * Verifies a co-pilot's identity and cultural empathy for higher-level access
 * @param {string} copilot - Co-pilot email
 * @param {string} principal - Principal email
 * @param {string} culturalEmpathyCode - Cultural empathy code for verification
 * @returns {Promise<object>} Verification result
 */
async function verifyCopilot(copilot, principal, culturalEmpathyCode) {
  try {
    // Create unique relationship ID
    const relationshipId = `${principal.replace(/[^\w-]/g, '')}-${copilot.replace(/[^\w-]/g, '')}`;

    // Check if relationship exists
    const relationshipRef = firestore.collection('copilotRelationships').doc(relationshipId);
    const doc = await relationshipRef.get();

    if (!doc.exists) {
      return {
        success: false,
        message: 'Co-pilot relationship not found',
      };
    }

    const data = doc.data();

    // Verify cultural empathy code for executive level
    if (data.level === 'executive' && data.culturalEmpathyCode !== culturalEmpathyCode) {
      return {
        success: false,
        message: 'Invalid cultural empathy code',
      };
    }

    // Simulate LinkedIn verification
    const linkedinVerified = Math.random() > 0.1; // 90% success rate

    if (!linkedinVerified) {
      return {
        success: false,
        message: 'LinkedIn profile verification failed',
      };
    }

    // Update relationship with verification info
    await relationshipRef.update({
      active: true,
      verified: true,
      culturalEmpathyVerified: true,
      linkedinVerified: true,
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Get resource count for this co-pilot
    const resourceQuery = firestore
      .collection('resources')
      .where('authorizedPrincipals', 'array-contains', principal);

    const resourceSnapshot = await resourceQuery.get();

    return {
      success: true,
      message: 'Co-pilot verified successfully',
      newLevel: data.level,
      resourceCount: resourceSnapshot.size,
    };
  } catch (error) {
    console.error('Error verifying co-pilot:', error);
    return {
      success: false,
      message: 'Error verifying co-pilot',
      error: error.message,
    };
  }
}

/**
 * Grants a co-pilot access to a resource on behalf of a principal
 * @param {string} principal - Principal email
 * @param {string} copilot - Co-pilot email
 * @param {string} resource - Resource ID
 * @param {string} accessType - Type of access (readonly, delegated, full)
 * @returns {Promise<object>} Operation result
 */
async function grantCopilotAccess(principal, copilot, resource, accessType = 'readonly') {
  try {
    // Check if co-pilot relationship exists and is active
    const relationshipId = `${principal.replace(/[^\w-]/g, '')}-${copilot.replace(/[^\w-]/g, '')}`;
    const relationshipRef = firestore.collection('copilotRelationships').doc(relationshipId);
    const relationshipDoc = await relationshipRef.get();

    if (!relationshipDoc.exists) {
      return {
        success: false,
        message: 'Co-pilot relationship not found',
      };
    }

    const relationshipData = relationshipDoc.data();
    if (!relationshipData.active) {
      return {
        success: false,
        message: 'Co-pilot relationship is not active',
      };
    }

    // Check if principal has access to the resource
    const resourceRef = firestore.collection('resources').doc(resource);
    const resourceDoc = await resourceRef.get();

    if (!resourceDoc.exists || !resourceDoc.data().authorizedPrincipals?.includes(principal)) {
      return {
        success: false,
        message: 'Principal does not have access to this resource',
      };
    }

    // Create access record
    const accessId = `${copilot.replace(/[^\w-]/g, '')}-${resource.replace(/[^\w-]/g, '')}`;
    const accessRef = firestore.collection('resourceAccess').doc(accessId);

    await accessRef.set({
      principal,
      copilot,
      resourceId: resource,
      accessType,
      delegated: true,
      grantor: principal,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: null,
    });

    // Update resource document to add co-pilot
    await resourceRef.update({
      authorizedCopilots: admin.firestore.FieldValue.arrayUnion(copilot),
      [`copilotAccessTypes.${copilot}`]: accessType,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      message: `${accessType} access granted to co-pilot for resource ${resource}`,
      createdAt: new Date(),
    };
  } catch (error) {
    console.error('Error granting co-pilot access:', error);
    return {
      success: false,
      message: 'Error granting co-pilot access',
      error: error.message,
    };
  }
}

/**
 * Applies the fix for PR access
 * @returns {Promise<object>} Operation result
 */
async function applyPRFix() {
  // Special case: PR Fix
  // Grant agent 001 access to PR resource pr-2bd91160bf21ba21
  return await grantAgentAccess('pr@coaching2100.com', '001', 'pr-2bd91160bf21ba21', 'full');
}

/**
 * Cleans up the PR fix
 * @returns {Promise<object>} Operation result
 */
async function cleanupPRFix() {
  // Special case: PR Fix Cleanup
  // Revoke agent 001 access to PR resource pr-2bd91160bf21ba21
  return await revokeAgentAccess('pr@coaching2100.com', '001', 'pr-2bd91160bf21ba21');
}

module.exports = {
  firestore,
  admin,
  // Agent functions
  grantAgentAccess,
  revokeAgentAccess,
  scanResources,
  verifyAuthentication,

  // Co-pilot functions
  linkCopilot,
  unlinkCopilot,
  listCopilots,
  verifyCopilot,
  grantCopilotAccess,

  // Special case functions
  applyPRFix,
  cleanupPRFix,
};
