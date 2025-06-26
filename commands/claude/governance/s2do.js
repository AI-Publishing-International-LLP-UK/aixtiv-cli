/**
 * Dr. Claude S2DO Governance Integration
 * Integrates Dr. Claude agent orchestration with S2DO blockchain governance
 */

const chalk = require('chalk');
const { parseOptions, withSpinner, displayResult } = require('../../../lib/utils');
const { firestore } = require('../../../lib/firestore');
const { logAgentAction } = require('../../../lib/agent-tracking');
const s2do = require('../../../core-protocols/s2do');
const telemetry = require('../../../lib/telemetry');
const { debugDisplay } = require('../../../lib/debug-display');

// Initialize S2DO protocol with blockchain governance
s2do.configure({
  blockchain: {
    enabled: true,
    network: process.env.BLOCKCHAIN_NETWORK || 'development',
    provider: process.env.BLOCKCHAIN_PROVIDER_URL || 'http://localhost:8545',
  },
  compliance: {
    enabled: true,
    strictMode: process.env.COMPLIANCE_STRICT_MODE === 'true',
    region: process.env.CLOUD_REGION || 'us-west1',
  },
});

/**
 * Create a governance workflow with blockchain verification
 * @param {object} options - Command options
 */
module.exports = async function governanceWorkflow(options) {
  // Record knowledge access for telemetry
  telemetry.recordKnowledgeAccess('blockchain');

  // Capture internal reasoning
  const internalThought = `Processing S2DO governance workflow with parameters: ${JSON.stringify(options)}`;

  const { workflow, description, type, steps, priority, project, agent, verify } =
    parseOptions(options);

  try {
    // Execute workflow creation with spinner
    const result = await withSpinner(
      `Creating S2DO governance workflow "${chalk.cyan(workflow || 'Unnamed')}" with blockchain verification`,
      async () => {
        // Validate workflow name
        if (!workflow) {
          throw new Error('Workflow name is required');
        }

        // Create workflow steps array if provided as comma-separated string
        let workflowSteps = [];
        if (steps) {
          workflowSteps = steps.split(',').map((step, index) => ({
            id: `step-${index + 1}`,
            name: step.trim(),
            description: `${step.trim()} for ${workflow}`,
            status: 'pending',
            assignedTo: agent || null,
          }));
        }

        // Create the workflow with blockchain verification
        const createdWorkflow = await s2do.createWorkflow({
          name: workflow,
          description: description || `Governance workflow for ${workflow}`,
          type: type || 'approval',
          steps: workflowSteps,
          priority: priority || 'medium',
          metadata: {
            projectId: project || null,
            orchestratedBy: 'dr-claude',
            createdAt: new Date().toISOString(),
          },
          blockchainVerification: true,
        });

        // Log the workflow creation
        await logAgentAction('s2do_workflow_created', {
          workflow_id: createdWorkflow.id,
          workflow_name: workflow,
          blockchain_verified: true,
          project_id: project || null,
          agent: agent || 'dr-claude',
        });

        // If we're integrating with a Dr. Claude project, update the project
        if (project && firestore) {
          const projectRef = firestore.collection('projects').doc(project);
          const projectDoc = await projectRef.get();

          if (projectDoc.exists) {
            // Update the project with governance workflow ID
            await projectRef.update({
              governance: {
                workflowId: createdWorkflow.id,
                type: type || 'approval',
                blockchainVerified: true,
                createdAt: new Date().toISOString(),
                status: 'active',
              },
              updated_at: new Date().toISOString(),
            });
          }
        }

        // If verify is true, get the workflow to verify blockchain integrity
        let verificationResult = null;
        if (verify) {
          verificationResult = await s2do.getWorkflow(createdWorkflow.id, {
            verifyBlockchain: true,
          });
        }

        return {
          status: 'created',
          workflow_id: createdWorkflow.id,
          name: workflow,
          type: type || 'approval',
          steps: workflowSteps.length,
          blockchain_verified: true,
          blockchain_reference: createdWorkflow.blockchainReference || null,
          certificate_id: createdWorkflow.certificateId || null,
          project_id: project || null,
          verification: verificationResult
            ? {
                verified: verificationResult.blockchainVerification?.verified || false,
                timestamp: verificationResult.blockchainVerification?.timestamp || null,
              }
            : null,
        };
      }
    );

    // Display result
    displayResult({
      success: result.status === 'created',
      message: `Workflow ${result.status === 'created' ? 'successfully created' : 'creation failed'} with blockchain verification`,
      details: result,
    });

    if (result.status === 'created') {
      console.log(chalk.bold('\nWorkflow Details:'));
      console.log(`Workflow ID: ${chalk.cyan(result.workflow_id)}`);
      console.log(`Name: ${chalk.yellow(workflow)}`);
      console.log(`Type: ${chalk.blue(type || 'approval')}`);
      console.log(`Blockchain Verified: ${chalk.green('Yes')}`);
      console.log(
        `Blockchain Reference: ${chalk.magenta(result.blockchain_reference || 'Pending')}`
      );

      if (result.certificate_id) {
        console.log(`Certificate ID: ${chalk.cyan(result.certificate_id)}`);
      }

      if (result.project_id) {
        console.log(`Integrated with Project: ${chalk.yellow(result.project_id)}`);
      }

      console.log(chalk.bold('\nNext Steps:'));
      console.log(
        `Use ${chalk.yellow(`aixtiv claude:governance:approve -w ${result.workflow_id} -s step-1`)} to approve the first workflow step.`
      );
      console.log(
        `Use ${chalk.yellow(`aixtiv claude:governance:verify -w ${result.workflow_id}`)} to verify blockchain integrity.`
      );

      if (agent) {
        console.log(
          `Dr. Claude will coordinate with ${chalk.magenta(agent)} for workflow execution.`
        );
      } else {
        console.log(
          `Dr. Claude will orchestrate the workflow execution through the Flight Memory System.`
        );
      }
    }
  } catch (error) {
    console.error(chalk.red('\nWorkflow creation failed:'), error.message);

    // Display debug information
    debugDisplay({
      thought: internalThought,
      error: error.message,
      command: 'claude:governance:s2do',
    });

    process.exit(1);
  }
};
