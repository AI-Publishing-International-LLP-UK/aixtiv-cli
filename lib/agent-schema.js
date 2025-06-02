/**
 * Unified Agent Schema for Aixtiv CLI
 * 
 * This schema represents a consolidated approach to agent management, unifying
 * RIX, QRIX, co-pilots, and other agent types under a single, extensible schema.
 * 
 * Key features:
 * - Squadron-based designation (S01-S06)
 * - Unified numbering scheme across all agent types
 * - Core schema with extensible capabilities
 * - Support for agent evolution without re-registration
 */

const { firestore, admin } = require('./firestore');

// Squadron definitions with capabilities
const SQUADRONS = {
  'S01': {
    name: 'Command Squadron',
    description: 'Strategic oversight and mission coordination',
    capabilities: ['command', 'strategic-planning', 'oversight']
  },
  'S02': {
    name: 'Science Squadron',
    description: 'Research, analysis, and knowledge systems',
    capabilities: ['research', 'analysis', 'knowledge-systems']
  },
  'S03': {
    name: 'Engineering Squadron',
    description: 'Development, deployment, and technical implementation',
    capabilities: ['development', 'deployment', 'implementation']
  },
  'S04': {
    name: 'Operations Squadron',
    description: 'Day-to-day execution and operational management',
    capabilities: ['operations', 'management', 'execution']
  },
  'S05': {
    name: 'Intelligence Squadron',
    description: 'Data intelligence, insights, and strategic recommendations',
    capabilities: ['intelligence', 'insights', 'recommendations']
  },
  'S06': {
    name: 'Support Squadron',
    description: 'Assistance, collaboration, and specialized support',
    capabilities: ['support', 'collaboration', 'assistance']
  }
};

// Agent types with capabilities
const AGENT_TYPES = {
  'BASE': {
    name: 'Base Agent',
    description: 'Standard capability agent',
    capabilities: ['basic-interaction', 'task-execution']
  },
  'RIX': {
    name: 'RIX Agent',
    description: 'Enhanced reasoning and intelligence agent',
    capabilities: ['advanced-reasoning', 'complex-decision-making', 'autonomous-operation']
  },
  'QRIX': {
    name: 'Quantum RIX Agent',
    description: 'Composite agent with quantum reasoning capabilities',
    capabilities: ['cross-domain-integration', 'multi-agent-orchestration', 'quantum-reasoning']
  },
  'COPILOT': {
    name: 'Co-Pilot Agent',
    description: 'Collaborative assistant with human partnership focus',
    capabilities: ['human-collaboration', 'assistance', 'augmentation']
  }
};

/**
 * Creates a new agent in the unified agent system
 * 
 * @param {Object} agentData Agent data
 * @param {string} agentData.name Display name of the agent
 * @param {string} agentData.squadron Squadron designation (S01-S06)
 * @param {number} agentData.number Agent number within squadron
 * @param {string} agentData.type Agent type (BASE, RIX, QRIX, COPILOT)
 * @param {string} agentData.description Brief description of the agent
 * @param {Array<string>} agentData.roles Roles the agent can perform
 * @param {Array<string>} agentData.actions Actions the agent can take
 * @param {Array<string>} agentData.lifecycles Lifecycle stages the agent manages
 * @param {Array<string>} agentData.sectors Business sectors the agent specializes in
 * @param {string} agentData.humanCollaborator Email of associated human collaborator (if any)
 * @param {Object} agentData.customAttributes Any additional custom attributes
 * @returns {Promise<Object>} Created agent with ID
 */
async function createAgent(agentData) {
  try {
    // Validate required fields
    if (!agentData.name) throw new Error('Agent name is required');
    if (!agentData.squadron) throw new Error('Squadron designation is required');
    if (!agentData.number) throw new Error('Agent number is required');
    
    // Validate squadron
    if (!SQUADRONS[agentData.squadron]) {
      throw new Error(`Invalid squadron. Must be one of: ${Object.keys(SQUADRONS).join(', ')}`);
    }

    // Default to BASE agent type if not specified
    const agentType = agentData.type || 'BASE';
    if (!AGENT_TYPES[agentType]) {
      throw new Error(`Invalid agent type. Must be one of: ${Object.keys(AGENT_TYPES).join(', ')}`);
    }

    // Create agent ID using squadron and number format
    const formattedNumber = String(agentData.number).padStart(2, '0');
    const agentId = `${agentData.squadron}-${formattedNumber}`;

    // Check if agent already exists
    const agentRef = firestore.collection('unifiedAgents').doc(agentId);
    const agentDoc = await agentRef.get();

    if (agentDoc.exists) {
      throw new Error(`Agent with ID ${agentId} already exists`);
    }

    // Compile agent capabilities based on squadron and type
    const squadronCapabilities = SQUADRONS[agentData.squadron].capabilities || [];
    const typeCapabilities = AGENT_TYPES[agentType].capabilities || [];
    const customCapabilities = agentData.capabilities || [];
    
    const allCapabilities = [
      ...squadronCapabilities,
      ...typeCapabilities,
      ...customCapabilities
    ];

    // Construct agent document
    const agentDocument = {
      id: agentId,
      name: agentData.name,
      squadron: agentData.squadron,
      number: agentData.number,
      type: agentType,
      description: agentData.description || '',
      
      // Core information
      roles: agentData.roles || [],
      actions: agentData.actions || [],
      lifecycles: agentData.lifecycles || [],
      sectors: agentData.sectors || [],
      
      // Capabilities and specialties
      capabilities: [...new Set(allCapabilities)], // Remove duplicates
      specialties: agentData.specialties || [],
      
      // Collaboration information
      humanCollaborator: agentData.humanCollaborator || null,
      collaborators: agentData.collaborators || [],
      
      // Status and metadata
      status: 'active',
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      designationDate: agentData.designationDate || admin.firestore.FieldValue.serverTimestamp(),
      
      // Recognition
      awards: agentData.awards || [],
      achievements: agentData.achievements || [],
      
      // Extended storage for type-specific attributes
      attributes: {
        ...agentData.customAttributes || {},
        
        // Legacy compatibility fields
        legacy: {
          type: agentType,
          isRIX: agentType === 'RIX',
          isQRIX: agentType === 'QRIX',
          isCopilot: agentType === 'COPILOT'
        }
      }
    };

    // Add co-pilot specific fields if applicable
    if (agentType === 'COPILOT') {
      agentDocument.attributes.copilot = {
        level: agentData.level || 'standard',
        verified: agentData.verified || false,
        culturalEmpathyVerified: agentData.culturalEmpathyVerified || false,
        culturalEmpathyCode: agentData.culturalEmpathyCode || null,
        expiresAt: agentData.expiresAt || null
      };
    }

    // Add QRIX specific fields if applicable
    if (agentType === 'QRIX') {
      agentDocument.attributes.qrix = {
        components: agentData.components || [],
        activationStatus: agentData.activationStatus || 'standby',
        lastActivation: agentData.lastActivation || null,
        coreNodes: agentData.coreNodes || []
      };
    }

    // Create the agent in Firestore
    await agentRef.set(agentDocument);

    // If agent has a human collaborator, create/update the relationship
    if (agentData.humanCollaborator) {
      const collaboratorId = agentData.humanCollaborator.replace(/[^\w-]/g, '');
      const collaboratorRef = firestore.collection('humanCollaborators').doc(collaboratorId);
      
      const collaboratorDoc = await collaboratorRef.get();
      if (!collaboratorDoc.exists) {
        // Create new collaborator record
        await collaboratorRef.set({
          email: agentData.humanCollaborator,
          agents: [agentId],
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        // Update existing collaborator record
        await collaboratorRef.update({
          agents: admin.firestore.FieldValue.arrayUnion(agentId),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }

    return {
      success: true,
      message: `Agent ${agentId} created successfully`,
      agent: {
        id: agentId,
        ...agentDocument,
        createdAt: new Date(),
        updatedAt: new Date(),
        designationDate: agentData.designationDate || new Date()
      }
    };
  } catch (error) {
    console.error('Error creating agent:', error);
    return {
      success: false,
      message: 'Error creating agent',
      error: error.message
    };
  }
}

/**
 * Gets an agent by ID
 * 
 * @param {string} agentId The agent ID
 * @returns {Promise<Object>} The agent document
 */
async function getAgent(agentId) {
  try {
    const agentRef = firestore.collection('unifiedAgents').doc(agentId);
    const agentDoc = await agentRef.get();

    if (!agentDoc.exists) {
      return {
        success: false,
        message: `Agent ${agentId} not found`
      };
    }

    return {
      success: true,
      agent: agentDoc.data()
    };
  } catch (error) {
    console.error('Error getting agent:', error);
    return {
      success: false,
      message: 'Error getting agent',
      error: error.message
    };
  }
}

/**
 * Lists agents with optional filters
 * 
 * @param {Object} filters Filter criteria
 * @param {string} filters.squadron Filter by squadron
 * @param {string} filters.type Filter by agent type
 * @param {string} filters.humanCollaborator Filter by human collaborator
 * @param {boolean} filters.active Filter by active status
 * @param {Array<string>} filters.capabilities Filter by capabilities
 * @returns {Promise<Array<Object>>} List of matching agents
 */
async function listAgents(filters = {}) {
  try {
    let query = firestore.collection('unifiedAgents');

    // Apply filters
    if (filters.squadron) {
      query = query.where('squadron', '==', filters.squadron);
    }
    
    if (filters.type) {
      query = query.where('type', '==', filters.type);
    }
    
    if (filters.humanCollaborator) {
      query = query.where('humanCollaborator', '==', filters.humanCollaborator);
    }
    
    if (filters.active !== undefined) {
      query = query.where('active', '==', filters.active);
    }

    // Execute query
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      return [];
    }

    // Process results
    let agents = snapshot.docs.map(doc => doc.data());
    
    // Filter by capabilities if specified
    if (filters.capabilities && filters.capabilities.length > 0) {
      agents = agents.filter(agent => {
        return filters.capabilities.every(cap => agent.capabilities.includes(cap));
      });
    }

    return agents;
  } catch (error) {
    console.error('Error listing agents:', error);
    throw error;
  }
}

/**
 * Updates an existing agent
 * 
 * @param {string} agentId The agent ID to update
 * @param {Object} updates The updates to apply
 * @returns {Promise<Object>} Update result
 */
async function updateAgent(agentId, updates) {
  try {
    const agentRef = firestore.collection('unifiedAgents').doc(agentId);
    const agentDoc = await agentRef.get();

    if (!agentDoc.exists) {
      return {
        success: false,
        message: `Agent ${agentId} not found`
      };
    }

    // Disallow changing core identifiers
    const disallowedUpdates = ['id', 'squadron', 'number', 'createdAt'];
    const hasDisallowedUpdates = disallowedUpdates.some(field => updates[field] !== undefined);

    if (hasDisallowedUpdates) {
      return {
        success: false,
        message: `Cannot update core identifiers: ${disallowedUpdates.join(', ')}`
      };
    }

    // Prepare updates
    const updateData = {
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Apply updates
    await agentRef.update(updateData);

    // Update human collaborator relationship if it changed
    if (updates.humanCollaborator !== undefined) {
      const oldCollaborator = agentDoc.data().humanCollaborator;
      
      // Remove from old collaborator
      if (oldCollaborator) {
        const oldCollaboratorId = oldCollaborator.replace(/[^\w-]/g, '');
        const oldCollaboratorRef = firestore.collection('humanCollaborators').doc(oldCollaboratorId);
        await oldCollaboratorRef.update({
          agents: admin.firestore.FieldValue.arrayRemove(agentId),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      
      // Add to new collaborator
      if (updates.humanCollaborator) {
        const newCollaboratorId = updates.humanCollaborator.replace(/[^\w-]/g, '');
        const newCollaboratorRef = firestore.collection('humanCollaborators').doc(newCollaboratorId);
        const newCollaboratorDoc = await newCollaboratorRef.get();
        
        if (!newCollaboratorDoc.exists) {
          await newCollaboratorRef.set({
            email: updates.humanCollaborator,
            agents: [agentId],
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
        } else {
          await newCollaboratorRef.update({
            agents: admin.firestore.FieldValue.arrayUnion(agentId),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }
    }

    return {
      success: true,
      message: `Agent ${agentId} updated successfully`
    };
  } catch (error) {
    console.error('Error updating agent:', error);
    return {
      success: false,
      message: 'Error updating agent',
      error: error.message
    };
  }
}

/**
 * Extends an agent with new capabilities or specialties
 * This is used for agent evolution (e.g., upgrading to QRIX)
 * 
 * @param {string} agentId The agent ID to extend
 * @param {Object} extension The extension data
 * @param {string} extension.newType New agent type (optional)
 * @param {Array<string>} extension.capabilities Additional capabilities
 * @param {Array<string>} extension.specialties Additional specialties
 * @param {Object} extension.attributes Additional attributes
 * @returns {Promise<Object>} Extension result
 */
async function extendAgent(agentId, extension) {
  try {
    const agentRef = firestore.collection('unifiedAgents').doc(agentId);
    const agentDoc = await agentRef.get();

    if (!agentDoc.exists) {
      return {
        success: false,
        message: `Agent ${agentId} not found`
      };
    }

    const agent = agentDoc.data();
    const updates = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Handle type upgrade
    if (extension.newType && AGENT_TYPES[extension.newType]) {
      updates.type = extension.newType;
      
      // Add type-specific capabilities
      const typeCapabilities = AGENT_TYPES[extension.newType].capabilities || [];
      
      // Update legacy compatibility fields
      updates['attributes.legacy.type'] = extension.newType;
      updates['attributes.legacy.isRIX'] = extension.newType === 'RIX';
      updates['attributes.legacy.isQRIX'] = extension.newType === 'QRIX';
      updates['attributes.legacy.isCopilot'] = extension.newType === 'COPILOT';
      
      // Add type-specific attribute sections if upgrading
      if (extension.newType === 'QRIX' && !agent.attributes.qrix) {
        updates['attributes.qrix'] = {
          components: extension.components || [],
          activationStatus: 'standby',
          lastActivation: null,
          coreNodes: extension.coreNodes || []
        };
      } else if (extension.newType === 'COPILOT' && !agent.attributes.copilot) {
        updates['attributes.copilot'] = {
          level: extension.level || 'standard',
          verified: extension.verified || false,
          culturalEmpathyVerified: extension.culturalEmpathyVerified || false,
          culturalEmpathyCode: extension.culturalEmpathyCode || null,
          expiresAt: extension.expiresAt || null
        };
      }
      
      // For non-array fields we can update directly
      updates.capabilities = [...new Set([
        ...agent.capabilities,
        ...typeCapabilities,
        ...(extension.capabilities || [])
      ])];
    } else if (extension.capabilities) {
      // Just add the new capabilities if not changing type
      updates.capabilities = [...new Set([
        ...agent.capabilities,
        ...(extension.capabilities || [])
      ])];
    }
    
    // Add specialties
    if (extension.specialties) {
      updates.specialties = [...new Set([
        ...agent.specialties,
        ...extension.specialties
      ])];
    }
    
    // Add custom attributes
    if (extension.attributes) {
      Object.entries(extension.attributes).forEach(([key, value]) => {
        updates[`attributes.${key}`] = value;
      });
    }

    // Apply updates
    await agentRef.update(updates);

    return {
      success: true,
      message: `Agent ${agentId} extended successfully`,
      details: {
        newType: extension.newType || agent.type,
        addedCapabilities: extension.capabilities || [],
        addedSpecialties: extension.specialties || []
      }
    };
  } catch (error) {
    console.error('Error extending agent:', error);
    return {
      success: false,
      message: 'Error extending agent',
      error: error.message
    };
  }
}

/**
 * Migrates existing agents, co-pilots, and QRIX to the unified schema
 * 
 * @returns {Promise<Object>} Migration results
 */
async function migrateAgents() {
  try {
    const results = {
      migrated: {
        agents: 0,
        copilots: 0,
        qrix: 0
      },
      errors: [],
      details: []
    };

    // Step 1: Get existing agent authorizations
    const agentAuthsSnapshot = await firestore.collection('agentAuthorizations').get();
    const agentIds = new Set();
    
    // Collect unique agent IDs
    agentAuthsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.agentId) {
        agentIds.add(data.agentId);
      }
    });
    
    // Migrate regular agents
    for (const agentId of agentIds) {
      try {
        // Generate squadron and number
        // Default format: legacy agents go to S04 (Operations Squadron)
        const squadron = 'S04';
        const number = parseInt(agentId.replace(/\D/g, '')) || agentIds.size + results.migrated.agents + 1;
        
        // Create unified agent
        const agentData = {
          name: `Agent ${agentId}`,
          squadron: squadron,
          number: number,
          type: 'BASE',
          description: `Migrated from legacy agent ${agentId}`,
          attributes: {
            legacy: {
              originalId: agentId
            }
          }
        };
        
        const result = await createAgent(agentData);
        if (result.success) {
          results.migrated.agents++;
          results.details.push({
            type: 'agent',
            originalId: agentId,
            newId: result.agent.id,
            success: true
          });
        } else {
          results.errors.push({
            type: 'agent',
            originalId: agentId,
            error: result.message
          });
        }
      } catch (error) {
        results.errors.push({
          type: 'agent',
          originalId: agentId,
          error: error.message
        });
      }
    }
    
    // Step 2: Migrate co-pilots
    const copilotRelationshipsSnapshot = await firestore.collection('copilotRelationships').get();
    const copilotEmails = new Set();
    
    // Collect unique co-pilot emails
    copilotRelationshipsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.copilot) {
        copilotEmails.add(data.copilot);
      }
    });
    
    // Migrate co-pilots
    for (const copilotEmail of copilotEmails) {
      try {
        // Find all relationships for this co-pilot
        const relationships = [];
        copilotRelationshipsSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.copilot === copilotEmail) {
            relationships.push(data);
          }
        });
        
        // Use the first relationship for basic details
        const primaryRelationship = relationships[0] || {};
        
        // Generate name from email
        let name = copilotEmail;
        if (copilotEmail.includes('@')) {
          name = copilotEmail.split('@')[0];
          // Convert first letter to uppercase
          name = name.charAt(0).toUpperCase() + name.slice(1);
          
          // If it's a dr name format, enhance it
          if (copilotEmail.includes('@dr')) {
            const drName = copilotEmail.split('@dr')[1]?.split('.')[0];
            if (drName) {
              name = `Dr. ${drName.charAt(0).toUpperCase() + drName.slice(1)}`;
            }
          }
        }
        
        // Generate squadron and number
        // Default format: co-pilots go to S06 (Support Squadron)
        const squadron = 'S06';
        const number = results.migrated.copilots + 1;
        
        // Create unified agent
        const agentData = {
          name: name,
          squadron: squadron,
          number: number,
          type: 'COPILOT',
          description: `Migrated from legacy co-pilot ${copilotEmail}`,
          humanCollaborator: primaryRelationship.principal,
          level: primaryRelationship.level || 'standard',
          verified: primaryRelationship.verified || false,
          culturalEmpathyVerified: primaryRelationship.culturalEmpathyVerified || false,
          culturalEmpathyCode: primaryRelationship.culturalEmpathyCode || null,
          expiresAt: primaryRelationship.expiresAt || null,
          attributes: {
            legacy: {
              originalEmail: copilotEmail,
              relationships: relationships.map(r => ({
                principal: r.principal,
                level: r.level,
                active: r.active,
                verified: r.verified
              }))
            }
          }
        };
        
        const result = await createAgent(agentData);
        if (result.success) {
          results.migrated.copilots++;
          results.details.push({
            type: 'copilot',
            originalEmail: copilotEmail,
            newId: result.agent.id,
            success: true
          });
        } else {
          results.errors.push({
            type: 'copilot',
            originalEmail: copilotEmail,
            error: result.message
          });
        }
      } catch (error) {
        results.errors.push({
          type: 'copilot',
          originalEmail: copilotEmail,
          error: error.message
        });
      }
    }
    
    // Migration results
    return {
      success: true,
      message: `Migration completed with ${results.errors.length} errors`,
      results: results
    };
  } catch (error) {
    console.error('Error migrating agents:', error);
    return {
      success: false,
      message: 'Error migrating agents',
      error: error.message
    };
  }
}

module.exports = {
  // Schema constants
  SQUADRONS,
  AGENT_TYPES,
  
  // Core agent operations
  createAgent,
  getAgent,
  listAgents,
  updateAgent,
  extendAgent,
  
  // Migration utility
  migrateAgents
};

