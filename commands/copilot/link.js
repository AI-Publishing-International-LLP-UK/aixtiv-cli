const { linkCopilot, getCopilotStatus } = require('../../lib/firestore');
const { displayResult, parseOptions, withSpinner } = require('../../lib/utils');
const chalk = require('chalk');
const { table } = require('table');
const telemetry = require('../../lib/telemetry');

/**
 * Links a co-pilot to a principal, establishing a trusted relationship between them
 * This allows co-pilots to act on behalf of principals for specific resources
 *
 * Supports pilot domains like:
 * - lucy@drlucy.live
 * - grant@drgrant.live
 * - lee@professorlee.live
 */
module.exports = async function copilotLink(options) {
  // Record knowledge access for telemetry
  telemetry.recordKnowledgeAccess('copilot');
  const { email, copilot, level = 'standard' } = parseOptions(options);

  // Validate required parameters
  if (!email) {
    displayResult('Error: Principal email is required (--email)', 'error');
    return;
  }

  if (!copilot) {
    displayResult('Error: Co-pilot email or ID is required (--copilot)', 'error');
    return;
  }

  // Validate co-pilot level
  const validLevels = ['standard', 'enhanced', 'executive'];
  if (!validLevels.includes(level)) {
    displayResult(
      `Error: Invalid co-pilot level. Valid options are: ${validLevels.join(', ')}`,
      'error'
    );
    return;
  }

  // Format co-pilot email if just name was provided
  let copilotEmail = copilot;
  if (!copilot.includes('@')) {
    copilotEmail = `${copilot}@dr${copilot}.live`;
  }

  // Validate the pilot domain pattern
  const pilotDomainPattern = /^[a-zA-Z0-9._%+-]+@(?:dr[a-zA-Z0-9]+|professor[a-zA-Z0-9]+)\.live$/;
  if (!pilotDomainPattern.test(copilotEmail)) {
    console.log(
      chalk.yellow(`Warning: ${copilotEmail} does not match ASOOS pilot domain pattern.`)
    );
    console.log(chalk.yellow('Expected format: name@drname.live or name@professorname.live'));
    // We'll still proceed, but with a warning
  }

  try {
    // Attempt to link the co-pilot
    const result = await withSpinner(`Linking co-pilot ${copilotEmail} to principal ${email}`, () =>
      linkCopilot(email, copilotEmail, level)
    );

    if (result && result.success) {
      // Format a nice table with the co-pilot relationship details
      const tableData = [
        ['Field', 'Value'],
        ['Principal', email],
        ['Co-pilot', copilotEmail],
        ['Trust Level', level],
        ['Status', result.active ? 'Active' : 'Pending'],
        ['Created At', new Date(result.createdAt).toLocaleString()],
        ['Expiration', result.expiresAt ? new Date(result.expiresAt).toLocaleString() : 'Never'],
        ['Cultural Empathy Code', result.culturalEmpathyCode || 'Not Required'],
      ];

      // Display success message with table
      console.log(chalk.green('\n✓ Success: Co-pilot linked successfully\n'));
      console.log(table(tableData));

      // Display any guidance for post-linking steps
      if (level === 'executive') {
        console.log(
          chalk.yellow('\nNote: Executive co-pilots require Cultural Empathy Code verification.')
        );
        console.log('Please ask the co-pilot to run:');
        console.log(`  aixtiv copilot:verify --email ${copilotEmail} --principal ${email}`);
      }
    } else {
      displayResult(`Error: ${result?.message || 'Failed to link co-pilot'}`, 'error');
    }
  } catch (error) {
    displayResult(`Error: ${error.message}`, 'error');
  }
};
