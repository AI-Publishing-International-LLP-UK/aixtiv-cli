const { verifyCopilot } = require('../../lib/firestore');
const { displayResult, parseOptions, withSpinner } = require('../../lib/utils');
const chalk = require('chalk');
const inquirer = require('inquirer');

/**
 * Verifies a co-pilot's identity and cultural empathy 
 * for higher-level access to resources
 */
module.exports = async function copilotVerify(options) {
  const { email, principal, code } = parseOptions(options);
  
  // Validate required parameters
  if (!email) {
    displayResult('Error: Co-pilot email is required (--email)', 'error');
    return;
  }
  
  if (!principal) {
    displayResult('Error: Principal email is required (--principal)', 'error');
    return;
  }
  
  try {
    // If code is not provided, prompt for it
    let culturalEmpathyCode = code;
    if (!culturalEmpathyCode) {
      const answers = await inquirer.prompt([
        {
          type: 'password',
          name: 'code',
          message: 'Enter Cultural Empathy Code:',
          mask: '*'
        }
      ]);
      culturalEmpathyCode = answers.code;
    }
    
    if (!culturalEmpathyCode) {
      displayResult('Error: Cultural Empathy Code is required', 'error');
      return;
    }
    
    // Dr. Match LinkedIn verification simulation
    console.log(chalk.blue('\n🔍 Performing Dr. Match LinkedIn Verification...'));
    
    // Attempt to verify the co-pilot
    const result = await withSpinner(
      `Verifying co-pilot ${email} with principal ${principal}`,
      () => verifyCopilot(email, principal, culturalEmpathyCode)
    );
    
    if (result && result.success) {
      console.log(chalk.green('\n✓ Success: Co-pilot verification complete\n'));
      console.log(chalk.blue('Verification Details:'));
      console.log(`Cultural Empathy: ${chalk.green('Verified')}`);
      console.log(`LinkedIn Profile: ${chalk.green('Matched')}`);
      console.log(`Trust Level: ${chalk.green(result.newLevel || 'Executive')}`);
      
      // Show access capabilities
      console.log(chalk.blue('\nYou now have access to:'));
      console.log('- Resource management on behalf of the principal');
      console.log('- Agent delegation capabilities');
      console.log('- Advanced Symphony system features');
      console.log('- Vision Lake operations');
      
      if (result.resourceCount > 0) {
        console.log(chalk.blue(`\nYou now have access to ${result.resourceCount} resources.`));
        console.log('Run the following to see them:');
        console.log(`  aixtiv resource:scan --email ${email} --delegated`);
      }
    } else {
      const errorMessage = result?.message || 'Failed to verify co-pilot';
      
      // Special messages for specific error cases
      if (errorMessage.includes('code')) {
        displayResult('Error: Cultural Empathy Code is incorrect', 'error');
        console.log(chalk.yellow('Please contact your principal to obtain the correct code.'));
      } else if (errorMessage.includes('LinkedIn')) {
        displayResult('Error: LinkedIn profile verification failed', 'error');
        console.log(chalk.yellow('Please ensure your LinkedIn profile matches your professional identity.'));
      } else {
        displayResult(`Error: ${errorMessage}`, 'error');
      }
    }
  } catch (error) {
    displayResult(`Error: ${error.message}`, 'error');
  }
};