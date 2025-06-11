/**
 * S2DO (Scan-to-Do) Protocol
 * Handles governance and approval workflows with blockchain integration
 * Version: 2.0.0 - Enhanced with blockchain governance
 */

const admin = require('firebase-admin');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// Configuration with sensible defaults that can be overridden
const config = {
  // Blockchain configuration
  blockchain: {
    enabled: true,
    network: process.env.BLOCKCHAIN_NETWORK || 'development',
    contractAddress: process.env.S2DO_CONTRACT_ADDRESS,
    provider: process.env.BLOCKCHAIN_PROVIDER_URL || 'http://localhost:8545',
  },
  // Compliance configuration
  compliance: {
    enabled: true,
    regulatoryFrameworks: ['GDPR', 'HIPAA', 'SOC2', 'ISO27001'],
    strictMode: process.env.COMPLIANCE_STRICT_MODE === 'true',
    region: process.env.CLOUD_REGION || 'us-west1', // Default to us-west1 region
  },
  // Firebase configuration
  firebase: {
    collections: {
      workflows: 's2do_workflows',
      approvals: 's2do_approvals',
      auditTrail: 's2do_audit_trail',
      compliance: 's2do_compliance_records',
      certificates: 's2do_certificates',
    },
  },
};

// Initialize Firebase if not already initialized
let firestore;
try {
  if (!admin.apps.length) {
    // Try to use service account from environment or config folder
    let serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!serviceAccountPath) {
      const configPath = path.join(__dirname, '../../config/service-account-key.json');
      if (fs.existsSync(configPath)) {
        serviceAccountPath = configPath;
      }
    }

    if (serviceAccountPath) {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      // Fallback to application default credentials
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }
  }
  firestore = admin.firestore();
  console.log('S2DO: Firebase initialized successfully');
} catch (error) {
  console.error('S2DO: Firebase initialization error:', error);
  // Fallback to mock implementation if Firebase fails
  firestore = createMockFirestore();
}

/**
 * Creates a mock Firestore implementation for fallback
 * @returns {Object} Mock Firestore object
 */
function createMockFirestore() {
  console.warn('S2DO: Using mock Firestore implementation');
  const db = {
    _collections: {},
    collection: (name) => {
      if (!db._collections[name]) {
        db._collections[name] = {
          _docs: {},
          doc: (id) => {
            return {
              id,
              set: (data) => {
                db._collections[name]._docs[id] = { ...data };
                return Promise.resolve();
              },
              update: (data) => {
                db._collections[name]._docs[id] = { 
                  ...db._collections[name]._docs[id], 
                  ...data 
                };
                return Promise.resolve();
              },
              get: () => Promise.resolve({
                exists: !!db._collections[name]._docs[id],
                data: () => db._collections[name]._docs[id],
                id
              }),
            };
          },
          add: (data) => {
            const id = crypto.randomUUID();
            db._collections[name]._docs[id] = { ...data };
            return Promise.resolve({ id });
          },
          where: () => ({
            get: () => Promise.resolve({
              empty: true,
              docs: []
            })
          })
        };
      }
      return db._collections[name];
    }
  };
  return db;
}

/**
 * Simulates blockchain interaction for tracking workflow states
 * In a production environment, this would interface with actual blockchain contracts
 */
const blockchainInterface = {
  /**
   * Records a transaction on the blockchain
   * @param {string} type - Transaction type
   * @param {Object} data - Transaction data
   * @returns {Promise<Object>} Transaction result
   */
  async recordTransaction(type, data) {
    try {
      if (!config.blockchain.enabled) {
        return { success: false, message: 'Blockchain integration disabled' };
      }

      // Generate transaction hash using crypto - simulates blockchain tx hash
      const hash = crypto.createHash('sha256')
        .update(JSON.stringify({ type, data, timestamp: Date.now() }))
        .digest('hex');

      console.log(`S2DO: Blockchain transaction recorded: ${hash}`);
      
      // In a real implementation, this would call a blockchain node/contract
      return { 
        success: true, 
        transactionHash: hash,
        blockNumber: Math.floor(Math.random() * 1000000),
        timestamp: new Date().toISOString(),
        networkId: config.blockchain.network
      };
    } catch (error) {
      console.error('S2DO: Blockchain transaction error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Verifies a transaction on the blockchain
   * @param {string} transactionHash - Hash of the transaction to verify
   * @returns {Promise<Object>} Verification result
   */
  async verifyTransaction(transactionHash) {
    try {
      if (!config.blockchain.enabled) {
        return { success: false, message: 'Blockchain integration disabled' };
      }

      // Simulate verification delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // In a real implementation, this would query the blockchain
      return {
        success: true,
        verified: true,
        confirmations: Math.floor(Math.random() * 20),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('S2DO: Blockchain verification error:', error);
      return { success: false, error: error.message };
    }
  }
};

/**
 * Compliance checker for regulatory frameworks
 */
const complianceChecker = {
  /**
   * Checks if a workflow meets compliance requirements
   * @param {Object} workflow - Workflow to check
   * @param {Array<string>} frameworks - Regulatory frameworks to check against
   * @returns {Promise<Object>} Compliance check result
   */
  async checkCompliance(workflow, frameworks = config.compliance.regulatoryFrameworks) {
    try {
      if (!config.compliance.enabled) {
        return { success: true, compliant: true, message: 'Compliance checking disabled' };
      }

      const complianceResults = {};
      let overallCompliant = true;
      
      // Check each framework (in a real system, this would have detailed rules)
      for (const framework of frameworks) {
        // Simulate framework-specific checks
        const compliant = Math.random() > 0.1; // 90% pass rate for simulation
        complianceResults[framework] = {
          compliant,
          timestamp: new Date().toISOString(),
          details: compliant 
            ? `${framework} compliance verified` 
            : `${framework} compliance issues detected`
        };
        
        if (!compliant && config.compliance.strictMode) {
          overallCompliant = false;
        }
      }
      
      return {
        success: true,
        compliant: overallCompliant,
        results: complianceResults,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('S2DO: Compliance check error:', error);
      return { success: false, error: error.message };
    }
  },
  
  /**
   * Records compliance verification for audit purposes
   * @param {string} workflowId - ID of the workflow
   * @param {Object} complianceResult - Result of compliance check
   * @returns {Promise<Object>} Record result
   */
  async recordComplianceVerification(workflowId, complianceResult) {
    try {
      const record = {
        workflowId,
        timestamp: new Date().toISOString(),
        compliant: complianceResult.compliant,
        frameworks: Object.keys(complianceResult.results || {}),
        details: complianceResult.results,
        region: config.compliance.region || 'us-west1' // Ensure region is never undefined
      };
      
      // Store in Firestore
      await firestore.collection(config.firebase.collections.compliance).add(record);
      
      // If blockchain enabled, also record hash of compliance verification
      if (config.blockchain.enabled) {
        const blockchainRecord = await blockchainInterface.recordTransaction(
          'compliance_verification',
          { workflowId, complianceHash: hashObject(record) }
        );
        
        if (blockchainRecord.success) {
          // Update Firestore record with blockchain reference
          await firestore.collection(config.firebase.collections.compliance)
            .where('workflowId', '==', workflowId)
            .get()
            .then(snapshot => {
              if (!snapshot.empty) {
                snapshot.docs[0].ref.update({ 
                  blockchainReference: blockchainRecord.transactionHash 
                });
              }
            });
        }
      }
      
      return { success: true, record };
    } catch (error) {
      console.error('S2DO: Compliance record error:', error);
      return { success: false, error: error.message };
    }
  }
};

/**
 * Audit trail system for tracking all actions
 */
const auditTrail = {
  /**
   * Records an action in the audit trail
   * @param {string} action - Action performed
   * @param {Object} context - Context of the action
   * @param {string} performedBy - Entity that performed the action
   * @returns {Promise<Object>} Audit record result
   */
  async recordAction(action, context, performedBy) {
    try {
      const auditRecord = {
        action,
        context,
        performedBy,
        timestamp: new Date().toISOString(),
        ipAddress: context.ipAddress || 'unknown',
        systemId: context.systemId || 'system',
        region: config.compliance.region || 'us-west1' // Ensure region is never undefined
      };
      
      // Store in Firestore
      const docRef = await firestore.collection(config.firebase.collections.auditTrail).add(auditRecord);
      
      // If blockchain enabled, record hash of audit trail entry
      if (config.blockchain.enabled) {
        const blockchainRecord = await blockchainInterface.recordTransaction(
          'audit_trail',
          { 
            auditId: docRef.id, 
            auditHash: hashObject(auditRecord),
            action,
            timestamp: auditRecord.timestamp
          }
        );
        
        if (blockchainRecord.success) {
          // Update Firestore record with blockchain reference
          await docRef.update({ blockchainReference: blockchainRecord.transactionHash });
        }
      }
      
      return { 
        success: true, 
        auditId: docRef.id,
        timestamp: auditRecord.timestamp
      };
    } catch (error) {
      console.error('S2DO: Audit trail record error:', error);
      return { success: false, error: error.message };
    }
  },
  
  /**
   * Retrieves audit trail for a specific entity
   * @param {string} entityId - ID of the entity
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Audit records
   */
  async getAuditTrail(entityId, options = {}) {
    try {
      // In a real implementation, this would have pagination and filtering
      const snapshot = await firestore.collection(config.firebase.collections.auditTrail)
        .where('context.entityId', '==', entityId)
        .get();
      
      if (snapshot.empty) {
        return [];
      }
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('S2DO: Audit trail retrieval error:', error);
      throw error;
    }
  }
};

/**
 * Certification system for workflow and agent governance
 */
const certificationSystem = {
  /**
   * Issues a certificate for a workflow or agent
   * @param {string} entityId - ID of the entity being certified
   * @param {string} entityType - Type of entity (workflow, agent)
   * @param {string} certificationLevel - Level of certification
   * @param {Object} metadata - Additional certification metadata
   * @returns {Promise<Object>} Certification result
   */
  async issueCertificate(entityId, entityType, certificationLevel, metadata = {}) {
    try {
      const certificateId = `cert-${crypto.randomUUID()}`;
      const certificate = {
        certificateId,
        entityId,
        entityType,
        certificationLevel,
        issueDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days validity
        metadata,
        status: 'active',
        issuer: 'S2DO Governance System',
        region: config.compliance.region || 'us-west1' // Ensure region is never undefined
      };
      
      // Store in Firestore
      await firestore.collection(config.firebase.collections.certificates)
        .doc(certificateId)
        .set(certificate);
      
      // If blockchain enabled, create immutable record of certification
      if (config.blockchain.enabled) {
        const blockchainRecord = await blockchainInterface.recordTransaction(
          'certification',
          { 
            certificateId, 
            entityId,
            entityType,
            certificationLevel,
            certificationHash: hashObject(certificate)
          }
        );
        
        if (blockchainRecord.success) {
          // Update certificate with blockchain reference
          await firestore.collection(config.firebase.collections.certificates)
            .doc(certificateId)
            .update({ 
              blockchainReference: blockchainRecord.transactionHash,
              blockchainVerifiable: true
            });
        }
      }
      
      return {
        success: true,
        certificateId,
        entityId,
        entityType,
        issueDate: certificate.issueDate,
        expiryDate: certificate.expiryDate
      };
    } catch (error) {
      console.error('S2DO: Certificate issuance error:', error);
      return { success: false, error: error.message };
    }
  },
  
  /**
   * Verifies a certificate's validity
   * @param {string} certificateId - ID of the certificate to verify
   * @returns {Promise<Object>} Verification result
   */
  async verifyCertificate(certificateId) {
    try {
      const certificateDoc = await firestore.collection(config.firebase.collections.certificates)
        .doc(certificateId)
        .get();
      
      if (!certificateDoc.exists) {
        return { success: false, valid: false, message: 'Certificate not found' };
      }
      
      const certificate = certificateDoc.data();
      
      // Check if certificate is active and not expired
      const now = new Date();
      const expired = new Date(certificate.expiryDate) < now;
      const valid = certificate.status === 'active' && !expired;
      
      // If blockchain enabled and certificate has blockchain reference, verify on chain
      let blockchainVerified = false;
      if (config.blockchain.enabled && certificate.blockchainReference) {
        const blockchainVerification = await blockchainInterface.verifyTransaction(
          certificate.blockchainReference
        );
        blockchainVerified = blockchainVerification.success && blockchainVerification.verified;
      }
      
      return {
        success: true,
        valid,
        blockchainVerified: config.blockchain.enabled ? blockchainVerified : null,
        certificate: {
          id: certificateId,
          entityId: certificate.entityId,
          entityType: certificate.entityType,
          certificationLevel: certificate.certificationLevel,
          issueDate: certificate.issueDate,
          expiryDate: certificate.expiryDate,
          status: certificate.status
        }
      };
    } catch (error) {
      console.error('S2DO: Certificate verification error:', error);
      return { success: false, error: error.message };
    }
  }
};

/**
 * Creates a new workflow with blockchain governance
 * @param {string} name - Name of the workflow
 * @param {string} type - Type of workflow
 * @param {Object} options - Additional workflow options
 * @returns {Promise<Object>} Created workflow
 */
async function createWorkflow(name, type, options = {}) {
  try {
    console.log(`S2DO: Creating workflow: ${name} of type ${type}`);
    
    // Generate workflow ID
    const workflowId = `wf-${crypto.randomUUID()}`;
    
    // Prepare workflow object
    const workflow = {
      id: workflowId,
      name,
      type,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: options.createdBy || 'system',
      owner: options.owner || options.createdBy || 'system',
      steps: options.steps || [],
      approvals: options.approvals || [],
      metadata: options.metadata || {},
      priority: options.priority || 'normal',
      deadline: options.deadline || null,
      compliance: {},
      region: config.compliance.region || 'us-west1' // Ensure region is never undefined
    };
    
    // Check compliance if enabled
    if (config.compliance.enabled) {
      const complianceResult = await complianceChecker.checkCompliance(
        workflow, 
        options.regulatoryFrameworks
      );
      
      workflow.compliance = {
        checked: true,
        compliant: complianceResult.compliant,
        timestamp: complianceResult.timestamp,
        details: complianceResult.results
      };
      
      // Record compliance verification
      await complianceChecker.recordComplianceVerification(workflowId, complianceResult);
      
      // If strict compliance mode and not compliant, reject workflow creation
      if (config.compliance.strictMode && !complianceResult.compliant) {
        return {
          success: false,
          message: 'Workflow creation rejected due to compliance issues',
          complianceResult
        };
      }
    }
    
    // Store workflow in Firestore
    await firestore.collection(config.firebase.collections.workflows)
      .doc(workflowId)
      .set(workflow);
    
    // Record in audit trail
    await auditTrail.recordAction(
      'workflow_created',
      {
        entityId: workflowId,
        entityType: 'workflow',
        workflowName: name,
        workflowType: type
      },
      options.createdBy || 'system'
    );
    
    // If blockchain enabled, register workflow on chain
    if (config.blockchain.enabled) {
      const blockchainRecord = await blockchainInterface.recordTransaction(
        'workflow_creation',
        {
          workflowId,
          name,
          type,
          createdBy: options.createdBy || 'system',
          workflowHash: hashObject(workflow)
        }
      );
      
      if (blockchainRecord.success) {
        // Update workflow with blockchain reference
        await firestore.collection(config.firebase.collections.workflows)
          .doc(workflowId)
          .update({
            blockchainReference: blockchainRecord.transactionHash,
            blockchainVerifiable: true
          });
        
        workflow.blockchainReference = blockchainRecord.transactionHash;
        workflow.blockchainVerifiable = true;
      }
    }
    
    // Issue governance certificate if requested
    if (options.certificate) {
      const certificationResult = await certificationSystem.issueCertificate(
        workflowId,
        'workflow',
        options.certificateLevel || 'standard',
        {
          workflowName: name,
          workflowType: type,
          ...options.certificateMetadata
        }
      );
      
      if (certificationResult.success) {
        workflow.certificateId = certificationResult.certificateId;
      }
    }
    
    return { success: true, workflow };
  } catch (error) {
    console.error('S2DO: Workflow creation error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Approves a workflow step with blockchain verification
 * @param {string} workflowId - ID of the workflow
 * @param {string} stepId - ID of the step to approve
 * @param {string} approver - Entity approving the step
 * @param {Object} options - Additional approval options
 * @returns {Promise<Object>} Approval result
 */
async function approveWorkflowStep(workflowId, stepId, approver, options = {}) {
  try {
    // Get workflow from Firestore
    const workflowDoc = await firestore.collection(config.firebase.collections.workflows)
      .doc(workflowId)
      .get();
    
    if (!workflowDoc.exists) {
      return { success: false, message: 'Workflow not found' };
    }
    
    const workflow = workflowDoc.data();
    
    // Ensure workflow.steps exists to prevent TypeError
    if (!workflow.steps) {
      console.log('S2DO: Warning - workflow.steps is undefined, initializing as empty array');
      workflow.steps = [];
    }
    
    // Find the step to approve
    const stepIndex = workflow.steps.findIndex(step => step.id === stepId);
    if (stepIndex === -1) {
      return { success: false, message: 'Step not found in workflow' };
    }
    
    // Create approval record
    const approvalId = `appr-${crypto.randomUUID()}`;
    const approval = {
      id: approvalId,
      workflowId,
      stepId,
      approver,
      timestamp: new Date().toISOString(),
      comments: options.comments || '',
      evidence: options.evidence || [],
      metadata: options.metadata || {},
      region: config.compliance.region || 'us-west1' // Ensure region is never undefined
    };
    
    // Store approval in Firestore
    await firestore.collection(config.firebase.collections.approvals)
      .doc(approvalId)
      .set(approval);
    
    // Update workflow step
    workflow.steps[stepIndex].approved = true;
    workflow.steps[stepIndex].approvedBy = approver;
    workflow.steps[stepIndex].approvedAt = approval.timestamp;
    workflow.steps[stepIndex].approvalId = approvalId;
    
    // Record in audit trail
    await auditTrail.recordAction(
      'workflow_step_approved',
      {
        entityId: workflowId,
        entityType: 'workflow',
        stepId,
        approvalId
      },
      approver
    );
    
    // If blockchain enabled, record approval on chain
    if (config.blockchain.enabled) {
      const blockchainRecord = await blockchainInterface.recordTransaction(
        'workflow_approval',
        {
          approvalId,
          workflowId,
          stepId,
          approver,
          timestamp: approval.timestamp,
          approvalHash: hashObject(approval)
        }
      );
      
      if (blockchainRecord.success) {
        // Update approval with blockchain reference
        await firestore.collection(config.firebase.collections.approvals)
          .doc(approvalId)
          .update({
            blockchainReference: blockchainRecord.transactionHash,
            blockchainVerifiable: true
          });
        
        approval.blockchainReference = blockchainRecord.transactionHash;
        approval.blockchainVerifiable = true;
      }
    }
    
    // Update workflow in Firestore
    await firestore.collection(config.firebase.collections.workflows)
      .doc(workflowId)
      .update({
        steps: workflow.steps,
        updatedAt: new Date().toISOString()
      });
    
    return {
      success: true,
      approval,
      message: `Step ${stepId} approved successfully by ${approver}`
    };
  } catch (error) {
    console.error('S2DO: Workflow approval error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Retrieves a workflow with its blockchain verification status
 * @param {string} workflowId - ID of the workflow to retrieve
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Workflow with verification info
 */
async function getWorkflow(workflowId, options = {}) {
  try {
    // Get workflow from Firestore
    const workflowDoc = await firestore.collection(config.firebase.collections.workflows)
      .doc(workflowId)
      .get();
    
    if (!workflowDoc.exists) {
      return { success: false, message: 'Workflow not found' };
    }
    
    const workflow = workflowDoc.data();
    
    // If blockchain verification requested and workflow has blockchain reference
    if (options.verifyOnChain && workflow.blockchainReference) {
      const blockchainVerification = await blockchainInterface.verifyTransaction(
        workflow.blockchainReference
      );
      
      workflow.blockchainVerification = {
        verified: blockchainVerification.success && blockchainVerification.verified,
        timestamp: new Date().toISOString(),
        details: blockchainVerification
      };
    }
    
    // If certificate verification requested and workflow has certificate
    if (options.verifyCertificate && workflow.certificateId) {
      const certificateVerification = await certificationSystem.verifyCertificate(
        workflow.certificateId
      );
      
      workflow.certificateVerification = {
        verified: certificateVerification.success && certificateVerification.valid,
        timestamp: new Date().toISOString(),
        details: certificateVerification
      };
    }
    
    // Get audit trail if requested
    if (options.includeAuditTrail) {
      workflow.auditTrail = await auditTrail.getAuditTrail(workflowId);
    }
    
    return { success: true, workflow };
  } catch (error) {
    console.error('S2DO: Workflow retrieval error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Creates a hash of an object for blockchain verification
 * @param {Object} obj - Object to hash
 * @returns {string} Hash of the object
 */
function hashObject(obj) {
  return crypto.createHash('sha256')
    .update(JSON.stringify(obj))
    .digest('hex');
}

/**
 * Configures the S2DO protocol
 * @param {Object} newConfig - Configuration to apply
 * @returns {Object} Updated configuration
 */
function configure(newConfig) {
  // Make a deep copy for nested objects to avoid reference issues
  if (newConfig.compliance) {
    config.compliance = { ...config.compliance, ...newConfig.compliance };
    // Ensure region always has a value
    config.compliance.region = config.compliance.region || 'us-west1';
  }
  
  // For other top-level properties
  Object.keys(newConfig).forEach(key => {
    if (key !== 'compliance') {
      config[key] = newConfig[key];
    }
  });
  
  return { ...config };
}

module.exports = { 
  createWorkflow,
  approveWorkflowStep,
  getWorkflow,
  configure,
  certificationSystem,
  auditTrail,
  complianceChecker,
  blockchainInterface,
  config
};
