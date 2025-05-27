/**
 * Dr. Claude S2DO Governance - Workflow Step Approval
 * Allows Dr. Claude to approve steps in S2DO governance workflows with blockchain verification
 */

const chalk = require('chalk');
const { parseOptions, withSpinner, displayResult } = require('../../../lib/utils');
const { firestore } = require('../../../lib/firestore');
const { logAgentAction } = require('../../../lib/agent-tracking');
const s2do = require('../../../core-protocols/s2do');
const telemetry = require('../../../lib/telemetry');
const { debugDisplay } = require('../../../lib/debug-display');

/**
 * Approve a step in an S2DO governance workflow with blockchain verification
 * @param {object} options - Command options
 */
module.exports = async function approveWorkflowStep(options) {
  // Record knowledge access for telemetry
  telemetry.recordKnowledgeAccess('blockchain');
  
  // Capture internal reasoning
  const internalThought = `Processing S2DO workflow step approval with parameters: ${JSON.stringify(options)}`;

  const { 
    workflow,
    step, 
    comments,
    evidence,
    approver,
    verify
  } = parseOptions(options);

  try {
    // Execute step approval with spinner
    const result = await withSpinner(
      `Approving step "${chalk.cyan(step)}" in workflow "${chalk.cyan(workflow)}" with blockchain verification`,
      async () => {
        // Validate required parameters
        if (!workflow) {
          throw new Error('Workflow ID is required');
        }
        if (!step) {
          throw new Error('Step ID is required');
        }
        
        // Create the approval with blockchain verification
        const approvalResult = await s2do.approveWorkflowStep(workflow, step, {
          approverId: approver || 'dr-claude',
          comments: comments || `Approved by ${approver || 'Dr. Claude'} via agent orchestration`,
          evidence: evidence ? evidence.split(',').map(e => e.trim()) : [],
          metadata: {
            orchestratedBy: 'dr-claude',
            approvedAt: new Date().toISOString(),
          },
          blockchainVerification: true
        });

        // Log the step approval
        await logAgentAction('s2do_workflow_step_approved', {
          workflow_id: workflow,
          step_id: step,
          approver: approver || 'dr-claude',
          blockchain_verified: true
        });

        // If verify is true, get the workflow to verify blockchain integrity
        let verificationResult = null;
        if (verify) {
          verificationResult = await s2do.getWorkflow(workflow, { verifyBlockchain: true });
        }

        return {
          status: 'approved',
          workflow_id: workflow,
          step_id: step,
          approval_id: approvalResult.id,
          approver: approver || 'dr-claude',
          blockchain_verified: true,
          blockchain_reference: approvalResult.blockchainReference || null,
          verification: verificationResult ? {
            verified: verificationResult.blockchainVerification?.verified || false,
            timestamp: verificationResult.blockchainVerification?.timestamp || null,
            audit_trail: verificationResult.auditTrail?.length || 0
          } : null
        };
      }
    );

    // Display result
    displayResult({
      success: result.status === 'approved',
      message: `Workflow step ${result.status === 'approved' ? 'successfully approved' : 'approval failed'} with blockchain verification`,
      details: result,
    });

    if (result.status === 'approved') {
      console.log(chalk.bold('\nApproval Details:'));
      console.log(`Approval ID: ${chalk.cyan(result.approval_id)}`);
      console.log(`Workflow ID: ${chalk.yellow(workflow)}`);
      console.log(`Step ID: ${chalk.blue(step)}`);
      console.log(`Approver: ${chalk.magenta(approver || 'dr-claude')}`);
      console.log(`Blockchain Verified: ${chalk.green('Yes')}`);
      console.log(`Blockchain Reference: ${chalk.magenta(result.blockchain_reference || 'Pending')}`);
      
      if (result.verification) {
        console.log(chalk.bold('\nBlockchain Verification:'));
        console.log(`Verified: ${result.verification.verified ? chalk.green('Yes') : chalk.red('No')}`);
        console.log(`Timestamp: ${chalk.yellow(result.verification.timestamp || 'N/A')}`);
        console.log(`Audit Trail Entries: ${chalk.cyan(result.verification.audit_trail || 0)}`);
      }

      console.log(chalk.bold('\nNext Steps:'));
      console.log(`Use ${chalk.yellow(`aixtiv claude:governance:verify -w ${workflow}`)} to verify the complete workflow integrity.`);
      console.log(`Dr. Claude will continue orchestrating the workflow through the Flight Memory System.`);
    }
  } catch (error) {
    console.error(chalk.red('\nWorkflow step approval failed:'), error.message);
    
    // Display debug information
    debugDisplay({
      thought: internalThought,
      error: error.message,
      command: 'claude:governance:approve'
    });

    process.exit(1);
  }
};
