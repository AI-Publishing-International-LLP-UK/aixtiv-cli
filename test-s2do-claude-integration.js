/**
 * S2DO + Dr. Claude Integration Test Script
 * This script demonstrates the integration between S2DO blockchain governance and Dr. Claude orchestration
 */

const chalk = require('chalk');
const { spawnSync } = require('child_process');

console.log(chalk.cyan('---------------------------------------------------'));
console.log(chalk.bold('S2DO + Dr. Claude Integration Test'));
console.log(chalk.cyan('---------------------------------------------------'));
console.log('');

// Test workflow name and details
const workflowName = `TestIntegration-${Date.now()}`;
const workflowSteps = 'Initialize,Configure,Validate,Approve,Deploy';

// Step 1: Create a governance workflow
console.log(chalk.bold('1. Creating S2DO governance workflow with blockchain verification...'));
const createResult = spawnSync('node', [
  'bin/aixtiv.js',
  'claude:governance:s2do',
  '-w', workflowName,
  '-d', 'Test integration between S2DO and Dr. Claude',
  '-t', 'approval',
  '-s', workflowSteps,
  '--verify'
], { stdio: 'inherit' });

if (createResult.status !== 0) {
  console.error(chalk.red('Workflow creation failed. Exiting test.'));
  process.exit(1);
}

// Extract workflow ID from output (in a real scenario, you would store this in a variable)
// For this test, we'll just use a placeholder and ask the user to input the actual ID
console.log('');
console.log(chalk.yellow('Please enter the workflow ID from the output above:'));
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

readline.question('Workflow ID: ', (workflowId) => {
  // Step 2: Approve the first workflow step
  console.log('');
  console.log(chalk.bold('2. Approving first workflow step with blockchain verification...'));
  const approveResult = spawnSync('node', [
    'bin/aixtiv.js',
    'claude:governance:approve',
    '-w', workflowId,
    '-s', 'step-1',
    '--comments', 'Approved via integration test',
    '--verify'
  ], { stdio: 'inherit' });
  
  if (approveResult.status !== 0) {
    console.error(chalk.red('Step approval failed. Exiting test.'));
    process.exit(1);
  }

  // Step 3: Verify the blockchain integrity of the workflow
  console.log('');
  console.log(chalk.bold('3. Verifying blockchain integrity of the workflow...'));
  const verifyResult = spawnSync('node', [
    'bin/aixtiv.js',
    'claude:governance:verify',
    '-w', workflowId,
    '--detailed'
  ], { stdio: 'inherit' });
  
  if (verifyResult.status !== 0) {
    console.error(chalk.red('Verification failed. Exiting test.'));
    process.exit(1);
  }

  console.log('');
  console.log(chalk.cyan('---------------------------------------------------'));
  console.log(chalk.bold.green('S2DO + Dr. Claude Integration Test Completed Successfully'));
  console.log(chalk.cyan('---------------------------------------------------'));
  
  readline.close();
});
