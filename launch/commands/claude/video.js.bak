/**
 * Dr. Claude Video Command
 *
 * This module provides commands for integrating with the Claude Orchestration
 * Video System. Supports green screen technology and Google Video Generation
 * for RIX/CRX agents and co-pilots.
 *
 * (c) 2025 Copyright AI Publishing International LLP All Rights Reserved.
 * Developed with assistance from the Pilots of Vision Lake.
 */

const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');
const boxen = require('boxen');
const { parseOptions, withSpinner } = require('../../lib/utils');
const videoSystem = require('../../src/services/video-system');

/**
 * Video command handler
 * @param {object} options - Command line options
 */
module.exports = async function videoCommand(options) {
  const {
    action,
    agentId,
    agentType,
    script,
    duration,
    background,
    prompt,
    session,
    job,
    jobType,
  } = parseOptions(options);

  // Validate input
  if (!action) {
    showHelp();
    return;
  }

  try {
    switch (action) {
      case 'create-session':
        await createSession(agentId, agentType, options);
        break;

      case 'generate-agent':
        await generateAgentVideo(session, script, duration, background, options);
        break;

      case 'generate-background':
        await generateBackground(prompt, duration, options);
        break;

      case 'combine':
        await combineVideos(options.agentJob, options.backgroundJob, options);
        break;

      case 'status':
        await checkJobStatus(job, jobType);
        break;

      case 'download':
        await getDownloadUrl(job, jobType);
        break;

      case 'list-backgrounds':
        await listBackgrounds();
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
 * Create a new video session
 */
async function createSession(agentId, agentType, options) {
  if (!agentId || !agentType) {
    console.log(chalk.yellow('Missing required parameters:'));
    console.log('  --agentId    ID of the agent');
    console.log('  --agentType  Type of agent (rix, crx, copilot)');
    return;
  }

  const spinner = ora('Creating video session...').start();

  try {
    const session = await videoSystem.createSession({
      agentId,
      agentType,
      title: options.title,
      description: options.description,
      resolution: options.resolution,
      frameRate: options.frameRate,
      greenScreen: options.greenScreen !== 'false',
      googleVideoGeneration: options.googleVideoGeneration !== 'false',
      interfaceVersion: options.interfaceVersion || 'v2',
    });

    spinner.succeed('Video session created successfully');

    console.log('\nSession Details:');
    console.log(
      boxen(
        `${chalk.green('Session ID:')} ${session.id}\n` +
          `${chalk.green('System Session ID:')} ${session.systemSessionId}\n` +
          `${chalk.green('Agent ID:')} ${session.agentId}\n` +
          `${chalk.green('Agent Type:')} ${session.agentType}\n` +
          `${chalk.green('Status:')} ${session.status}\n` +
          `${chalk.green('Resolution:')} ${session.settings.resolution}\n` +
          `${chalk.green('Interface Version:')} ${session.interfaceVersion}`,
        { padding: 1, borderColor: 'cyan', margin: 1 }
      )
    );

    console.log(chalk.blue('\nUse this Session ID for subsequent video operations:'));
    console.log(`  ${chalk.cyan(session.id)}`);
  } catch (error) {
    spinner.fail('Failed to create video session');
    throw error;
  }
}

/**
 * Generate agent video with green screen
 */
async function generateAgentVideo(sessionId, script, duration, backgroundId, options) {
  if (!sessionId || !script) {
    console.log(chalk.yellow('Missing required parameters:'));
    console.log('  --session    Session ID');
    console.log('  --script     Video script for the agent');
    return;
  }

  const spinner = ora('Generating agent video...').start();

  try {
    const job = await videoSystem.generateAgentVideo(sessionId, {
      script,
      duration: parseInt(duration) || 30,
      backgroundId,
    });

    spinner.succeed('Video generation job submitted successfully');

    console.log('\nJob Details:');
    console.log(
      boxen(
        `${chalk.green('Job ID:')} ${job.jobId}\n` +
          `${chalk.green('System Job ID:')} ${job.systemJobId}\n` +
          `${chalk.green('Status:')} ${job.status}\n` +
          `${chalk.green('Estimated Completion:')} ${job.estimatedCompletionTime || 'Unknown'}`,
        { padding: 1, borderColor: 'cyan', margin: 1 }
      )
    );

    console.log(chalk.blue('\nCheck job status with:'));
    console.log(`  aixtiv claude video --action status --job ${job.jobId} --jobType agent`);
  } catch (error) {
    spinner.fail('Failed to generate agent video');
    throw error;
  }
}

/**
 * Generate background video using Google Video Generation API
 */
async function generateBackground(prompt, duration, options) {
  if (!prompt) {
    console.log(chalk.yellow('Missing required parameters:'));
    console.log('  --prompt     Description of the background to generate');
    return;
  }

  const spinner = ora('Generating background video...').start();

  try {
    const job = await videoSystem.generateBackground({
      prompt,
      duration: `${parseInt(duration) || 30}s`,
      resolution: options.resolution,
      format: options.format,
    });

    spinner.succeed('Background generation job submitted successfully');

    console.log('\nJob Details:');
    console.log(
      boxen(
        `${chalk.green('Job ID:')} ${job.jobId}\n` +
          `${chalk.green('Status:')} ${job.status}\n` +
          `${chalk.green('Estimated Completion:')} ${job.estimatedCompletionTime || 'Unknown'}`,
        { padding: 1, borderColor: 'cyan', margin: 1 }
      )
    );

    console.log(chalk.blue('\nCheck job status with:'));
    console.log(`  aixtiv claude video --action status --job ${job.jobId} --jobType background`);
  } catch (error) {
    spinner.fail('Failed to generate background video');
    throw error;
  }
}

/**
 * Combine agent video and background video
 */
async function combineVideos(agentJobId, backgroundJobId, options) {
  if (!agentJobId || !backgroundJobId) {
    console.log(chalk.yellow('Missing required parameters:'));
    console.log('  --agentJob       Agent video job ID');
    console.log('  --backgroundJob  Background video job ID');
    return;
  }

  const spinner = ora('Combining videos...').start();

  try {
    const composition = await videoSystem.combineVideos(agentJobId, backgroundJobId);

    spinner.succeed('Video composition job submitted successfully');

    console.log('\nComposition Details:');
    console.log(
      boxen(
        `${chalk.green('Composition ID:')} ${composition.compositionId}\n` +
          `${chalk.green('System Composition ID:')} ${composition.systemCompositionId}\n` +
          `${chalk.green('Status:')} ${composition.status}\n` +
          `${chalk.green('Estimated Completion:')} ${composition.estimatedCompletionTime || 'Unknown'}`,
        { padding: 1, borderColor: 'cyan', margin: 1 }
      )
    );

    console.log(chalk.blue('\nCheck composition status with:'));
    console.log(
      `  aixtiv claude video --action status --job ${composition.compositionId} --jobType composition`
    );
  } catch (error) {
    spinner.fail('Failed to combine videos');
    throw error;
  }
}

/**
 * Check job status
 */
async function checkJobStatus(jobId, jobType) {
  if (!jobId || !jobType) {
    console.log(chalk.yellow('Missing required parameters:'));
    console.log('  --job       Job ID');
    console.log('  --jobType   Job type (agent, background, composition)');
    return;
  }

  const spinner = ora(`Checking ${jobType} job status...`).start();

  try {
    const status = await videoSystem.checkJobStatus(jobId, jobType);

    spinner.succeed(`${jobType} job status checked successfully`);

    console.log('\nStatus Details:');
    console.log(
      boxen(
        `${chalk.green('Job ID:')} ${status.id}\n` +
          `${chalk.green('Status:')} ${status.status}\n` +
          `${chalk.green('Progress:')} ${status.progress !== undefined ? `${status.progress}%` : 'Unknown'}\n` +
          (status.videoUrl ? `${chalk.green('Video URL:')} ${status.videoUrl}\n` : '') +
          (status.thumbnailUrl ? `${chalk.green('Thumbnail URL:')} ${status.thumbnailUrl}` : ''),
        { padding: 1, borderColor: 'cyan', margin: 1 }
      )
    );

    if (status.status === 'completed') {
      console.log(chalk.blue('\nGet download URL with:'));
      console.log(`  aixtiv claude video --action download --job ${jobId} --jobType ${jobType}`);
    } else {
      console.log(chalk.blue('\nCheck status again in a few moments:'));
      console.log(`  aixtiv claude video --action status --job ${jobId} --jobType ${jobType}`);
    }
  } catch (error) {
    spinner.fail(`Failed to check ${jobType} job status`);
    throw error;
  }
}

/**
 * Get video download URL
 */
async function getDownloadUrl(jobId, jobType) {
  if (!jobId || !jobType) {
    console.log(chalk.yellow('Missing required parameters:'));
    console.log('  --job       Job ID');
    console.log('  --jobType   Job type (agent, background, composition)');
    return;
  }

  const spinner = ora('Getting download URL...').start();

  try {
    const downloadUrl = await videoSystem.getVideoDownloadUrl(jobId, jobType);

    spinner.succeed('Download URL retrieved successfully');

    console.log('\nDownload URL:');
    console.log(boxen(downloadUrl, { padding: 1, borderColor: 'green', margin: 1 }));
  } catch (error) {
    spinner.fail('Failed to get download URL');
    throw error;
  }
}

/**
 * List available backgrounds
 */
async function listBackgrounds() {
  const spinner = ora('Listing backgrounds...').start();

  try {
    const backgrounds = await videoSystem.listBackgrounds();

    spinner.succeed(`Found ${backgrounds.length} backgrounds`);

    console.log('\nAvailable Backgrounds:');

    if (backgrounds.length === 0) {
      console.log(chalk.yellow('No backgrounds found'));
    } else {
      backgrounds.forEach((bg) => {
        console.log(
          boxen(
            `${chalk.green('ID:')} ${bg.id}\n` +
              `${chalk.green('Name:')} ${bg.name}\n` +
              `${chalk.green('Type:')} ${bg.type}\n` +
              (bg.thumbnailUrl ? `${chalk.green('Thumbnail:')} ${bg.thumbnailUrl}` : ''),
            { padding: 1, borderColor: 'blue', margin: 1 }
          )
        );
      });
    }
  } catch (error) {
    spinner.fail('Failed to list backgrounds');
    throw error;
  }
}

/**
 * Show help information
 */
function showHelp() {
  console.log(chalk.cyan('\nClaude Video Integration Commands:'));
  console.log(`
${chalk.green('Create a video session:')}
  aixtiv claude video --action create-session --agentId <id> --agentType <type> [options]

${chalk.green('Generate agent video with green screen:')}
  aixtiv claude video --action generate-agent --session <id> --script "Script text" [options]

${chalk.green('Generate background video:')}
  aixtiv claude video --action generate-background --prompt "Description" [options]

${chalk.green('Combine agent and background videos:')}
  aixtiv claude video --action combine --agentJob <id> --backgroundJob <id>

${chalk.green('Check job status:')}
  aixtiv claude video --action status --job <id> --jobType <agent|background|composition>

${chalk.green('Get video download URL:')}
  aixtiv claude video --action download --job <id> --jobType <agent|background|composition>

${chalk.green('List available backgrounds:')}
  aixtiv claude video --action list-backgrounds
`);
}
