/**
 * Dr. Claude S2DO Governance - Blockchain Verification
 * Verifies the blockchain integrity of S2DO governance workflows
 */

const chalk = require('chalk');
const { parseOptions, withSpinner, displayResult } = require('../../../lib/utils');
const { logAgentAction } = require('../../../lib/agent-tracking');
const s2do = require('../../../core-protocols/s2do');
const telemetry = require('../../../lib/telemetry');
const { debugDisplay } = require('../../../lib/debug-display');

/**
 * Verify blockchain integrity of an S2DO governance workflow
 * @param {object} options - Command options
 */
module.exports = async function verifyWorkflow(options) {
  // Record knowledge access for telemetry
  telemetry.recordKnowledgeAccess('blockchain');

  // Capture internal reasoning
  const internalThought = `Processing S2DO workflow blockchain verification with parameters: ${JSON.stringify(options)}`;

  const { workflow, detailed } = parseOptions(options);

  try {
    // Execute verification with spinner
    const result = await withSpinner(
      `Verifying blockchain integrity for workflow "${chalk.cyan(workflow)}"`,
      async () => {
        // Validate required parameters
        if (!workflow) {
          throw new Error('Workflow ID is required');
        }

        // Get the workflow with blockchain verification
        const verificationResult = await s2do.getWorkflow(workflow, {
          verifyBlockchain: true,
          includeAuditTrail: true,
          includeDetails: detailed === true,
        });

        // Log the verification
        await logAgentAction('s2do_workflow_verification', {
          workflow_id: workflow,
          verification_result: verificationResult.blockchainVerification?.verified || false,
        });

        return {
          status: 'verified',
          workflow_id: workflow,
          name: verificationResult.name,
          type: verificationResult.type,
          blockchain_verification: {
            verified: verificationResult.blockchainVerification?.verified || false,
            timestamp:
              verificationResult.blockchainVerification?.timestamp || new Date().toISOString(),
          },
          certificate_id: verificationResult.certificateId,
          audit_trail: verificationResult.auditTrail || [],
          details: detailed === true ? verificationResult : null,
        };
      }
    );

    // Display result
    displayResult({
      success: result.blockchain_verification.verified,
      message: result.blockchain_verification.verified
        ? `Workflow successfully verified on blockchain`
        : `Workflow blockchain verification failed`,
      details: result,
    });

    if (result.status === 'verified') {
      console.log(chalk.bold('\nVerification Details:'));
      console.log(`Workflow ID: ${chalk.cyan(result.workflow_id)}`);
      console.log(`Name: ${chalk.yellow(result.name)}`);
      console.log(`Type: ${chalk.blue(result.type)}`);
      console.log(
        `Blockchain Verified: ${result.blockchain_verification.verified ? chalk.green('Yes') : chalk.red('No')}`
      );
      console.log(
        `Verification Timestamp: ${chalk.yellow(result.blockchain_verification.timestamp)}`
      );

      if (result.certificate_id) {
        console.log(`Certificate ID: ${chalk.magenta(result.certificate_id)}`);
      }

      if (result.audit_trail && result.audit_trail.length > 0) {
        console.log(chalk.bold('\nAudit Trail:'));
        result.audit_trail.forEach((entry, index) => {
          console.log(
            `${index + 1}. ${chalk.cyan(entry.action)} by ${chalk.yellow(entry.userId)} at ${chalk.blue(entry.timestamp)}`
          );
        });
      }

      if (detailed && result.details) {
        console.log(chalk.bold('\nDetailed Workflow Information:'));
        console.log(`Status: ${chalk.yellow(result.details.status || 'Unknown')}`);
        console.log(`Created: ${chalk.blue(result.details.createdAt || 'Unknown')}`);
        console.log(`Last Updated: ${chalk.blue(result.details.updatedAt || 'Unknown')}`);

        if (result.details.steps && result.details.steps.length > 0) {
          console.log(chalk.bold('\nWorkflow Steps:'));
          result.details.steps.forEach((step, index) => {
            console.log(
              `${index + 1}. ${step.name} (${chalk.yellow(step.id)}): ${getStatusColor(step.status)}`
            );
          });
        }
      }

      console.log(chalk.bold('\nBlockchain Governance:'));
      console.log(
        `This workflow is ${result.blockchain_verification.verified ? chalk.green('verified') : chalk.red('not verified')} on the blockchain.`
      );
      console.log(`All workflow actions are permanently recorded and tamper-proof.`);
    }
  } catch (error) {
    console.error(chalk.red('\nWorkflow verification failed:'), error.message);

    // Display debug information
    debugDisplay({
      thought: internalThought,
      error: error.message,
      command: 'claude:governance:verify',
    });

    process.exit(1);
  }
};

/**
 * Returns colored text based on step status
 * @param {string} status - Step status
 * @returns {string} Colored status text
 */
function getStatusColor(status) {
  switch (status.toLowerCase()) {
    case 'approved':
      return chalk.green('Approved');
    case 'pending':
      return chalk.yellow('Pending');
    case 'rejected':
      return chalk.red('Rejected');
    default:
      return chalk.blue(status);
  }
}
