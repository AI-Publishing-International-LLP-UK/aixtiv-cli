const { firestore, admin } = require('../../lib/firestore');
const { displayResult, parseOptions, withSpinner } = require('../../lib/utils');
const chalk = require('chalk');
const { table } = require('table');

/**
 * Sets an expiration period for a co-pilot relationship
 * This allows co-pilots to have a defined timeframe for their access
 *
 * Usage examples:
 * - aixtiv copilot:expiration --email principal@example.com --copilot lucy --period 30 --unit days
 * - aixtiv copilot:expiration --email principal@example.com --copilot grant@drgrant.live --period 2 --unit months
 */
module.exports = async function copilotExpiration(options) {
  const { email, copilot, period, unit = 'days', latest = false } = parseOptions(options);

  // Validate required parameters
  if (!email && !latest) {
    displayResult({
      success: false,
      message:
        'Principal email is required (--email) or use --latest to target most recent relationship',
    });
    return;
  }

  if (!copilot && !latest) {
    displayResult({
      success: false,
      message:
        'Co-pilot email or ID is required (--copilot) or use --latest to target most recent relationship',
    });
    return;
  }

  if (!period) {
    displayResult({
      success: false,
      message: 'Expiration period is required (--period)',
    });
    return;
  }

  // Validate period is a positive number
  const periodNum = parseInt(period, 10);
  if (isNaN(periodNum) || periodNum <= 0) {
    displayResult({
      success: false,
      message: 'Period must be a positive number',
    });
    return;
  }

  // Validate unit
  const validUnits = ['minutes', 'hours', 'days', 'weeks', 'months'];
  if (!validUnits.includes(unit)) {
    displayResult({
      success: false,
      message: `Invalid time unit. Valid options are: ${validUnits.join(', ')}`,
    });
    return;
  }

  // Calculate maximum allowed period based on unit (max 11 months)
  const maxPeriods = {
    minutes: 11 * 30 * 24 * 60, // 11 months in minutes
    hours: 11 * 30 * 24, // 11 months in hours
    days: 11 * 30, // 11 months in days
    weeks: 11 * 4, // 11 months in weeks (approx)
    months: 11, // 11 months
  };

  if (periodNum > maxPeriods[unit]) {
    displayResult({
      success: false,
      message: `Maximum allowed period is ${maxPeriods[unit]} ${unit} (11 months)`,
    });
    return;
  }

  try {
    // Get copilot relationship
    let relationshipId;
    let principalEmail;
    let copilotEmail;

    if (latest) {
      // Get the most recently created copilot relationship
      const relationships = await firestore
        .collection('copilotRelationships')
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      if (relationships.empty) {
        displayResult({
          success: false,
          message: 'No co-pilot relationships found',
        });
        return;
      }

      const latestRelationship = relationships.docs[0].data();
      principalEmail = latestRelationship.principal;
      copilotEmail = latestRelationship.copilot;
      relationshipId = relationships.docs[0].id;
    } else {
      // Format co-pilot email if just name was provided
      copilotEmail = copilot;
      if (!copilot.includes('@')) {
        copilotEmail = `${copilot}@dr${copilot}.live`;
      }

      principalEmail = email;
      relationshipId = `${principalEmail.replace(/[^\w-]/g, '')}-${copilotEmail.replace(/[^\w-]/g, '')}`;
    }

    // Check if relationship exists
    const relationshipRef = firestore.collection('copilotRelationships').doc(relationshipId);
    const doc = await relationshipRef.get();

    if (!doc.exists) {
      displayResult({
        success: false,
        message: 'Co-pilot relationship not found',
      });
      return;
    }

    // Calculate expiration date based on unit and period
    const now = new Date();
    const expirationDate = new Date(now);

    switch (unit) {
      case 'minutes':
        expirationDate.setMinutes(now.getMinutes() + periodNum);
        break;
      case 'hours':
        expirationDate.setHours(now.getHours() + periodNum);
        break;
      case 'days':
        expirationDate.setDate(now.getDate() + periodNum);
        break;
      case 'weeks':
        expirationDate.setDate(now.getDate() + periodNum * 7);
        break;
      case 'months':
        expirationDate.setMonth(now.getMonth() + periodNum);
        break;
    }

    // Calculate warning date (30 days before expiration)
    const warningDate = new Date(expirationDate);
    warningDate.setDate(warningDate.getDate() - 30);

    // Calculate review date (15 days before expiration)
    const reviewDate = new Date(expirationDate);
    reviewDate.setDate(reviewDate.getDate() - 15);

    // Update relationship with expiration info
    await withSpinner(
      `Setting expiration period of ${periodNum} ${unit} for co-pilot relationship`,
      async () => {
        await relationshipRef.update({
          expiresAt: admin.firestore.Timestamp.fromDate(expirationDate),
          warningAt: admin.firestore.Timestamp.fromDate(warningDate),
          reviewAt: admin.firestore.Timestamp.fromDate(reviewDate),
          expirationPeriod: {
            period: periodNum,
            unit,
          },
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    );

    // Format a nice table with the updated co-pilot relationship details
    const tableData = [
      ['Field', 'Value'],
      ['Principal', principalEmail],
      ['Co-pilot', copilotEmail],
      ['Expiration Period', `${periodNum} ${unit}`],
      ['Expiration Date', expirationDate.toLocaleString()],
      ['Warning Date (30 days prior)', warningDate.toLocaleString()],
      ['Review Date (15 days prior)', reviewDate.toLocaleString()],
    ];

    // Display success message with table
    console.log(chalk.green('\n✓ Success: Co-pilot expiration set successfully\n'));
    console.log(table(tableData));

    // Display advisory note
    console.log(
      chalk.yellow(
        '\nNote: The co-pilot will receive a notification when the warning date is reached.'
      )
    );
    console.log(
      chalk.yellow(
        '      The principal will be prompted to review the relationship when the review date is reached.'
      )
    );
  } catch (error) {
    displayResult({
      success: false,
      message: `Error: ${error.message}`,
    });
  }
};
