/**
 * Dr. Match UX Check Command
 *
 * This module provides commands for visual UX review and assessment tools
 * integrated with Dr. Match agent capabilities. Implements Phase II "Visual Check"
 * overlay tool for reviewing UX before go-live.
 *
 * (c) 2025 Copyright AI Publishing International LLP All Rights Reserved.
 * Developed with assistance from the Pilots of Vision Lake.
 */

const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');
const boxen = require('boxen');
const fs = require('fs');
const path = require('path');
const { parseOptions, withSpinner } = require('../../lib/utils');
const videoSystem = require('../../src/services/video-system');
const uxPreview = require('../../src/services/video-system/ux-preview');

/**
 * UX Check command handler
 * @param {object} options - Command line options
 */
module.exports = async function uxCheckCommand(options) {
  const {
    action,
    url,
    screenshot,
    userId,
    deviceType,
    screenType,
    session,
    review,
    before,
    after
  } = parseOptions(options);

  // Validate input
  if (!action) {
    showHelp();
    return;
  }

  try {
    // Initialize UX Preview system
    await uxPreview.initialize(videoSystem);

    switch (action) {
      case 'create-session':
        await createSession(userId, deviceType, screenType, options);
        break;

      case 'check-screenshot':
        await checkScreenshot(session, screenshot, options);
        break;

      case 'check-live':
        await checkLiveUrl(session, url, options);
        break;

      case 'review-status':
        await checkReviewStatus(review);
        break;

      case 'get-issues':
        await getReviewIssues(review);
        break;

      case 'compare':
        await compareReviews(before, after);
        break;

      default:
        console.log(chalk.red(`Unknown action: ${action}`));
        showHelp();
        break;
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
  }
};

/**
 * Create a new UX review session
 * @param {string} userId - User ID
 * @param {string} deviceType - Device type
 * @param {string} screenType - Screen type
 * @param {object} options - Additional options
 */
async function createSession(userId, deviceType, screenType, options) {
  if (!userId) {
    console.log(chalk.yellow('Missing required parameter:'));
    console.log('  --userId     User ID');
    return;
  }

  const spinner = ora('Creating UX preview session...').start();

  try {
    const session = await uxPreview.createPreviewSession({
      userId,
      agentId: options.agentId || 'dr-match',
      deviceType: deviceType || 'desktop',
      screenType: screenType || 'dashboard',
      resolution: options.resolution,
      showGridOverlay: options.showGrid !== 'false',
      showAccessibilityMarkers: options.showAccessibility !== 'false',
      showTapTargets: options.showTapTargets !== 'false',
      recordUserInteractions: options.recordInteractions !== 'false'
    });

    spinner.succeed('UX preview session created successfully');

    console.log('\nSession Details:');
    console.log(
      boxen(
        `${chalk.green('Session ID:')} ${session.id}\n` +
        `${chalk.green('User ID:')} ${session.userId}\n` +
        `${chalk.green('Agent ID:')} ${session.agentId}\n` +
        `${chalk.green('Device Type:')} ${session.deviceType}\n` +
        `${chalk.green('Screen Type:')} ${session.screenType}\n` +
        `${chalk.green('Status:')} ${session.status}`,
        { padding: 1, borderColor: 'cyan', margin: 1 }
      )
    );

    console.log(chalk.blue('\nUse this Session ID for subsequent UX review operations:'));
    console.log(`  ${chalk.cyan(session.id)}`);
  } catch (error) {
    spinner.fail('Failed to create UX preview session');
    throw error;
  }
}

/**
 * Check screenshot for UX issues
 * @param {string} sessionId - Session ID
 * @param {string} screenshotPath - Path to screenshot
 * @param {object} options - Additional options
 */
async function checkScreenshot(sessionId, screenshotPath, options) {
  if (!sessionId || !screenshotPath) {
    console.log(chalk.yellow('Missing required parameters:'));
    console.log('  --session    Session ID');
    console.log('  --screenshot Path to screenshot file');
    return;
  }

  const spinner = ora('Processing screenshot for UX review...').start();

  try {
    // Check if file exists
    if (!fs.existsSync(screenshotPath)) {
      spinner.fail('Screenshot file not found');
      throw new Error(`File not found: ${screenshotPath}`);
    }

    // Read screenshot file
    const screenshotData = fs.readFileSync(screenshotPath);

    // Upload screenshot to Firebase Storage
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp();
    }

    const storage = admin.storage();
    const bucket = storage.bucket();
    const fileName = `ux-previews/${sessionId}/${path.basename(screenshotPath)}`;
    const file = bucket.file(fileName);
    
    await file.save(screenshotData, {
      metadata: {
        contentType: 'image/png'
      }
    });

    // Get signed URL
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    });

    spinner.text = 'Screenshot uploaded, generating UX review...';

    // Generate review
    const review = await uxPreview.generateScreenReview(sessionId, signedUrl, {
      name: options.name || `Review of ${path.basename(screenshotPath)}`,
      description: options.description || 'Automated UX review of screenshot',
      reviewType: options.reviewType || 'standard',
      showGrid: options.showGrid !== 'false',
      showAccessibility: options.showAccessibility !== 'false',
      showTapTargets: options.showTapTargets !== 'false'
    });

    spinner.succeed('UX review generation started successfully');

    console.log('\nReview Details:');
    console.log(
      boxen(
        `${chalk.green('Review ID:')} ${review.reviewId}\n` +
        `${chalk.green('Job ID:')} ${review.jobId}\n` +
        `${chalk.green('Status:')} ${review.status}\n` +
        `${chalk.green('Estimated Completion:')} ${review.estimatedCompletionTime || 'Unknown'}`,
        { padding: 1, borderColor: 'cyan', margin: 1 }
      )
    );

    console.log(chalk.blue('\nCheck review status with:'));
    console.log(`  aixtiv claude ux-check --action review-status --review ${review.reviewId}`);
  } catch (error) {
    spinner.fail('Failed to process screenshot');
    throw error;
  }
}

/**
 * Check live URL for UX issues
 * @param {string} sessionId - Session ID
 * @param {string} url - URL to check
 * @param {object} options - Additional options
 */
async function checkLiveUrl(sessionId, url, options) {
  if (!sessionId || !url) {
    console.log(chalk.yellow('Missing required parameters:'));
    console.log('  --session    Session ID');
    console.log('  --url        URL to check');
    return;
  }

  const spinner = ora('Starting live UX preview...').start();

  try {
    const preview = await uxPreview.startLivePreview(sessionId, url, {
      deviceType: options.deviceType,
      showGrid: options.showGrid !== 'false',
      showAccessibility: options.showAccessibility !== 'false',
      showTapTargets: options.showTapTargets !== 'false'
    });

    spinner.succeed('Live UX preview started successfully');

    console.log('\nPreview Details:');
    console.log(
      boxen(
        `${chalk.green('Preview ID:')} ${preview.previewId}\n` +
        `${chalk.green('Session ID:')} ${preview.sessionId}\n` +
        `${chalk.green('URL:')} ${preview.url}\n` +
        `${chalk.green('Status:')} ${preview.status}`,
        { padding: 1, borderColor: 'cyan', margin: 1 }
      )
    );

    console.log('\nScreenshot taken with UX overlay:');
    console.log(boxen(preview.screenshotUrl, { padding: 1, borderColor: 'green', margin: 1 }));

    // Generate review from the screenshot
    spinner.start('Generating UX review from screenshot...');
    
    const review = await uxPreview.generateScreenReview(sessionId, preview.screenshotUrl, {
      name: options.name || `Live review of ${url}`,
      description: options.description || 'Automated UX review of live URL',
      reviewType: options.reviewType || 'standard',
      showGrid: options.showGrid !== 'false',
      showAccessibility: options.showAccessibility !== 'false',
      showTapTargets: options.showTapTargets !== 'false'
    });

    spinner.succeed('UX review generation started successfully');

    console.log('\nReview Details:');
    console.log(
      boxen(
        `${chalk.green('Review ID:')} ${review.reviewId}\n` +
        `${chalk.green('Job ID:')} ${review.jobId}\n` +
        `${chalk.green('Status:')} ${review.status}`,
        { padding: 1, borderColor: 'cyan', margin: 1 }
      )
    );

    console.log(chalk.blue('\nCheck review status with:'));
    console.log(`  aixtiv claude ux-check --action review-status --review ${review.reviewId}`);
  } catch (error) {
    spinner.fail('Failed to start live preview');
    throw error;
  }
}

/**
 * Check status of a UX review
 * @param {string} reviewId - Review ID
 */
async function checkReviewStatus(reviewId) {
  if (!reviewId) {
    console.log(chalk.yellow('Missing required parameter:'));
    console.log('  --review     Review ID');
    return;
  }

  const spinner = ora('Checking UX review status...').start();

  try {
    const status = await uxPreview.checkReviewStatus(reviewId);
    
    spinner.succeed('UX review status retrieved successfully');

    console.log('\nReview Status:');
    console.log(
      boxen(
        `${chalk.green('Review ID:')} ${reviewId}\n` +
        `${chalk.green('Status:')} ${status.status}\n` +
        `${chalk.green('Progress:')} ${status.progress !== undefined ? `${status.progress}%` : 'Unknown'}`,
        { padding: 1, borderColor: 'cyan', margin: 1 }
      )
    );

    if (status.status === 'completed') {
      console.log('\nUX Review Result:');
      
      if (status.scores) {
        console.log(
          boxen(
            `${chalk.green('Accessibility Score:')} ${status.scores.accessibility || 'N/A'}\n` +
            `${chalk.green('Usability Score:')} ${status.scores.usability || 'N/A'}\n` +
            `${chalk.green('Visual Design Score:')} ${status.scores.visualDesign || 'N/A'}\n` +
            `${chalk.green('Overall Score:')} ${status.scores.overall || 'N/A'}`,
            { padding: 1, borderColor: 'green', margin: 1 }
          )
        );
      }

      if (status.overlayImageUrl) {
        console.log('\nOverlay Image URL:');
        console.log(boxen(status.overlayImageUrl, { padding: 1, borderColor: 'blue', margin: 1 }));
      }

      console.log(chalk.blue('\nGet detailed review issues with:'));
      console.log(`  aixtiv claude ux-check --action get-issues --review ${reviewId}`);
    } else {
      console.log(chalk.blue('\nCheck status again later:'));
      console.log(`  aixtiv claude ux-check --action review-status --review ${reviewId}`);
    }
  } catch (error) {
    spinner.fail('Failed to check UX review status');
    throw error;
  }
}

/**
 * Get UX review issues
 * @param {string} reviewId - Review ID
 */
async function getReviewIssues(reviewId) {
  if (!reviewId) {
    console.log(chalk.yellow('Missing required parameter:'));
    console.log('  --review     Review ID');
    return;
  }

  const spinner = ora('Retrieving UX review issues...').start();

  try {
    const issues = await uxPreview.getReviewItems(reviewId);
    
    spinner.succeed(`Retrieved ${issues.length} UX review issues`);

    console.log('\nUX Review Issues:');

    if (issues.length === 0) {
      console.log(chalk.yellow('No issues found in this review'));
    } else {
      issues.forEach((issue, index) => {
        const severityColor = 
          issue.severity === 'high' ? 'red' :
          issue.severity === 'medium' ? 'yellow' : 'blue';
        
        console.log(
          boxen(
            `${chalk.green('Issue #:')} ${index + 1}\n` +
            `${chalk.green('Type:')} ${issue.type}\n` +
            `${chalk.green('Severity:')} ${chalk[severityColor](issue.severity)}\n` +
            `${chalk.green('Title:')} ${issue.title}\n` +
            `${chalk.green('Description:')} ${issue.description}` +
            (issue.recommendations && issue.recommendations.length > 0 ? 
              `\n\n${chalk.green('Recommendations:')}\n${issue.recommendations.map(rec => `- ${rec}`).join('\n')}` : ''),
            { padding: 1, borderColor: severityColor, margin: 1 }
          )
        );
      });
    }
  } catch (error) {
    spinner.fail('Failed to retrieve UX review issues');
    throw error;
  }
}

/**
 * Compare two UX reviews (before/after)
 * @param {string} beforeReviewId - Before review ID
 * @param {string} afterReviewId - After review ID
 */
async function compareReviews(beforeReviewId, afterReviewId) {
  if (!beforeReviewId || !afterReviewId) {
    console.log(chalk.yellow('Missing required parameters:'));
    console.log('  --before     Before review ID');
    console.log('  --after      After review ID');
    return;
  }

  const spinner = ora('Generating UX review comparison...').start();

  try {
    const comparison = await uxPreview.generateComparisonView(beforeReviewId, afterReviewId);
    
    spinner.succeed('UX review comparison started successfully');

    console.log('\nComparison Details:');
    console.log(
      boxen(
        `${chalk.green('Comparison ID:')} ${comparison.comparisonId}\n` +
        `${chalk.green('Job ID:')} ${comparison.jobId}\n` +
        `${chalk.green('Status:')} ${comparison.status}\n` +
        `${chalk.green('Estimated Completion:')} ${comparison.estimatedCompletionTime || 'Unknown'}`,
        { padding: 1, borderColor: 'cyan', margin: 1 }
      )
    );

    console.log(chalk.blue('\nThe comparison will process in the background.'));
  } catch (error) {
    spinner.fail('Failed to generate UX review comparison');
    throw error;
  }
}

/**
 * Show help information
 */
function showHelp() {
  console.log(chalk.cyan('\nDr. Match UX Check Commands:'));
  console.log(`
${chalk.green('Create a UX review session:')}
  aixtiv claude ux-check --action create-session --userId <id> [--deviceType <type>] [--screenType <type>]

${chalk.green('Check screenshot for UX issues:')}
  aixtiv claude ux-check --action check-screenshot --session <id> --screenshot <path> [options]

${chalk.green('Check live URL for UX issues:')}
  aixtiv claude ux-check --action check-live --session <id> --url <url> [options]

${chalk.green('Check review status:')}
  aixtiv claude ux-check --action review-status --review <id>

${chalk.green('Get detailed review issues:')}
  aixtiv claude ux-check --action get-issues --review <id>

${chalk.green('Compare before/after reviews:')}
  aixtiv claude ux-check --action compare --before <id> --after <id>

${chalk.green('Options:')}
  --showGrid            Show grid overlay (true/false)
  --showAccessibility   Show accessibility markers (true/false)
  --showTapTargets      Show tap target areas (true/false)
  --deviceType          Device type (desktop, tablet, mobile)
  --reviewType          Review type (standard, accessibility, performance)
  --name                Name for the review
  --description         Description for the review
`);
}