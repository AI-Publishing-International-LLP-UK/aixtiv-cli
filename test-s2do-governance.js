/**
 * S2DO Protocol Blockchain Governance Test Script
 * This script demonstrates the blockchain governance features of the S2DO protocol
 */

// Import the enhanced S2DO protocol
const s2do = require('./core-protocols/s2do');

// Configure S2DO for testing
s2do.configure({
  blockchain: {
    enabled: true,
    network: 'development',
    provider: 'http://localhost:8545',
  },
  compliance: {
    enabled: true,
    strictMode: false,
  }
});

async function runS2DOTest() {
  console.log('---------------------------------------------------');
  console.log('S2DO Blockchain Governance Test');
  console.log('---------------------------------------------------');
  
  try {
    // Step 1: Create a new workflow with blockchain tracking
    console.log('\n1. Creating workflow with blockchain tracking...');
    const workflowResult = await s2do.createWorkflow(
      'Test Governance Workflow',
      'approval',
      {
        createdBy: 'test-user',
        certificate: true,
        certificateLevel: 'executive',
        steps: [
          {
            id: 'step-1',
            name: 'Review Document',
            assignedTo: 'reviewer-1',
            approved: false
          },
          {
            id: 'step-2',
            name: 'Validate Compliance',
            assignedTo: 'compliance-officer',
            approved: false
          }
        ],
        metadata: {
          importance: 'high',
          department: 'IT',
          project: 'ASOOS Governance'
        },
        regulatoryFrameworks: ['GDPR', 'SOC2']
      }
    );
    
    if (!workflowResult.success) {
      throw new Error(`Workflow creation failed: ${workflowResult.message || workflowResult.error}`);
    }
    
    console.log('Workflow created successfully:');
    console.log(`- ID: ${workflowResult.workflow.id}`);
    console.log(`- Name: ${workflowResult.workflow.name}`);
    console.log(`- Type: ${workflowResult.workflow.type}`);
    console.log(`- Certificate ID: ${workflowResult.workflow.certificateId || 'None'}`);
    console.log(`- Blockchain Verifiable: ${workflowResult.workflow.blockchainVerifiable || false}`);
    console.log(`- Blockchain Reference: ${workflowResult.workflow.blockchainReference || 'None'}`);
    
    if (workflowResult.workflow.compliance) {
      console.log('- Compliance Status:');
      console.log(`  - Compliant: ${workflowResult.workflow.compliance.compliant}`);
      console.log(`  - Checked: ${workflowResult.workflow.compliance.checked}`);
    }
    
    const workflowId = workflowResult.workflow.id;
    
    // Step 2: Approve a workflow step with blockchain tracking
    console.log('\n2. Approving workflow step with blockchain tracking...');
    const approvalResult = await s2do.approveWorkflowStep(
      workflowId,
      'step-1',
      'reviewer-1',
      {
        comments: 'Document reviewed and approved',
        evidence: ['document-review-checklist.pdf'],
        metadata: {
          reviewTime: '2 hours',
          reviewComplexity: 'medium'
        }
      }
    );
    
    if (!approvalResult.success) {
      throw new Error(`Step approval failed: ${approvalResult.message || approvalResult.error}`);
    }
    
    console.log('Step approved successfully:');
    console.log(`- Approval ID: ${approvalResult.approval.id}`);
    console.log(`- Workflow ID: ${approvalResult.approval.workflowId}`);
    console.log(`- Step ID: ${approvalResult.approval.stepId}`);
    console.log(`- Approver: ${approvalResult.approval.approver}`);
    console.log(`- Blockchain Verifiable: ${approvalResult.approval.blockchainVerifiable || false}`);
    console.log(`- Blockchain Reference: ${approvalResult.approval.blockchainReference || 'None'}`);
    
    // Step 3: Retrieve workflow with blockchain verification
    console.log('\n3. Retrieving workflow with blockchain verification...');
    const getWorkflowResult = await s2do.getWorkflow(
      workflowId,
      {
        verifyOnChain: true,
        verifyCertificate: true,
        includeAuditTrail: true
      }
    );
    
    if (!getWorkflowResult.success) {
      throw new Error(`Workflow retrieval failed: ${getWorkflowResult.message || getWorkflowResult.error}`);
    }
    
    console.log('Workflow retrieved successfully:');
    console.log(`- ID: ${getWorkflowResult.workflow.id}`);
    console.log(`- Name: ${getWorkflowResult.workflow.name}`);
    console.log(`- Type: ${getWorkflowResult.workflow.type}`);
    
    if (getWorkflowResult.workflow.blockchainVerification) {
      console.log('- Blockchain Verification:');
      console.log(`  - Verified: ${getWorkflowResult.workflow.blockchainVerification.verified}`);
      console.log(`  - Timestamp: ${getWorkflowResult.workflow.blockchainVerification.timestamp}`);
    }
    
    if (getWorkflowResult.workflow.certificateVerification) {
      console.log('- Certificate Verification:');
      console.log(`  - Verified: ${getWorkflowResult.workflow.certificateVerification.verified}`);
      console.log(`  - Timestamp: ${getWorkflowResult.workflow.certificateVerification.timestamp}`);
    }
    
    if (getWorkflowResult.workflow.auditTrail) {
      console.log(`- Audit Trail: ${getWorkflowResult.workflow.auditTrail.length} records`);
      getWorkflowResult.workflow.auditTrail.forEach((record, index) => {
        console.log(`  ${index + 1}. ${record.action} by ${record.performedBy} at ${record.timestamp}`);
      });
    }
    
    console.log('\n---------------------------------------------------');
    console.log('S2DO Blockchain Governance Test Completed Successfully');
    console.log('---------------------------------------------------');
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
runS2DOTest();
