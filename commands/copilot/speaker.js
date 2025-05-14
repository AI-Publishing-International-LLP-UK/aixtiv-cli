/**
 * Copilot Speaker Recognition Command
 *
 * This module provides commands for voice biometric functionality:
 * - Creating speaker profiles
 * - Enrolling speakers
 * - Verifying speakers
 * - Identifying speakers
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
const { v4: uuidv4 } = require('uuid');
const { parseOptions, withSpinner } = require('../../lib/utils');
const speechService = require('../../src/services/speech');
const speakerRecognition = require('../../src/services/speech/speaker-recognition');

/**
 * Speaker recognition command handler
 * @param {object} options - Command line options
 */
module.exports = async function speakerCommand(options) {
  const {
    action,
    email, // Using email instead of userId to align with existing system
    profileId,
    file,
    phrase,
    name,
    description,
    verify,
    identify,
  } = parseOptions(options);

  // Validate input
  if (!action) {
    showHelp();
    return;
  }

  try {
    switch (action) {
      case 'create-profile':
        await createProfile(email || userId, options);
        break;

      case 'enroll':
        await enrollSpeaker(profileId, file, phrase, options);
        break;

      case 'verify':
        await verifySpeaker(profileId, file, phrase, options);
        break;

      case 'identify':
        await identifySpeaker(file, options);
        break;

      case 'list-profiles':
        await listProfiles(email || userId);
        break;

      case 'profile-details':
        await getProfileDetails(profileId);
        break;

      case 'delete-profile':
        await deleteProfile(profileId);
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
 * Create a new speaker profile
 * @param {string} userId - User ID
 * @param {Object} options - Additional options
 */
async function createProfile(userId, options) {
  if (!userId) {
    console.log(chalk.yellow('Missing required parameter:'));
    console.log('  --userId     User ID for the profile');
    return;
  }

  // If interactive mode and no name/description, prompt for them
  let profileData = {
    displayName: options.name,
    description: options.description,
    locale: options.locale || 'en-US',
  };

  if (!profileData.displayName && !options.nonInteractive) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'displayName',
        message: 'Enter a name for this voice profile:',
        default: `Voice profile for ${userId}`,
      },
      {
        type: 'input',
        name: 'description',
        message: 'Enter a description (optional):',
        default: 'Created via CLI',
      },
      {
        type: 'list',
        name: 'locale',
        message: 'Select language:',
        choices: [
          { name: 'English (US)', value: 'en-US' },
          { name: 'English (UK)', value: 'en-GB' },
          { name: 'Spanish', value: 'es-ES' },
          { name: 'French', value: 'fr-FR' },
          { name: 'German', value: 'de-DE' },
        ],
        default: 'en-US',
      },
    ]);

    profileData = { ...profileData, ...answers };
  }

  const spinner = ora('Creating speaker profile...').start();

  try {
    const result = await speechService.createSpeakerProfile(userId, profileData);
    spinner.succeed('Speaker profile created');

    console.log('\nProfile Created:');
    console.log(
      boxen(
        `${chalk.bold('User ID:')} ${userId}\n` +
          `${chalk.bold('Profile ID:')} ${result.profileId}\n` +
          `${chalk.bold('Display Name:')} ${result.displayName}\n` +
          `${chalk.bold('Status:')} ${result.enrollmentStatus}`,
        { padding: 1, borderColor: 'green', margin: 1 }
      )
    );

    console.log(chalk.cyan('\nNext Steps:'));
    console.log(`Enroll your voice with this profile using the following command:`);
    console.log(
      chalk.grey(
        `  aixtiv copilot speaker --action enroll --profileId ${result.profileId} --file path/to/audio.wav --phrase "your enrollment phrase"`
      )
    );

    return result;
  } catch (error) {
    spinner.fail('Failed to create profile');
    throw error;
  }
}

/**
 * Enroll a speaker with an audio sample
 * @param {string} profileId - Profile ID
 * @param {string} filePath - Path to audio file
 * @param {string} phrase - Phrase spoken in the audio
 * @param {Object} options - Additional options
 */
async function enrollSpeaker(profileId, filePath, phrase, options) {
  if (!profileId || !filePath) {
    console.log(chalk.yellow('Missing required parameters:'));
    console.log('  --profileId  Speaker profile ID');
    console.log('  --file       Path to audio file for enrollment');
    console.log('  --phrase     The phrase spoken in the audio (optional but recommended)');
    return;
  }

  // If no phrase and interactive, prompt for it
  let enrollmentPhrase = phrase;
  if (!enrollmentPhrase && !options.nonInteractive) {
    const answer = await inquirer.prompt([
      {
        type: 'input',
        name: 'phrase',
        message: 'What phrase was spoken in the audio?',
        default: 'My voice is my passport, verify me.',
      },
    ]);

    enrollmentPhrase = answer.phrase;
  }

  // Check file existence
  if (!fs.existsSync(filePath)) {
    console.error(chalk.red('Error: Audio file not found:'), filePath);
    return;
  }

  const spinner = ora('Processing enrollment...').start();

  try {
    const result = await speechService.enrollSpeaker(profileId, filePath, enrollmentPhrase || '');

    if (result.status === 'completed') {
      spinner.succeed('Enrollment successful');
    } else {
      spinner.warn('Enrollment processed with warnings');
    }

    console.log('\nEnrollment Result:');
    console.log(
      boxen(
        `${chalk.bold('Profile ID:')} ${profileId}\n` +
          `${chalk.bold('Enrollment ID:')} ${result.enrollmentId}\n` +
          `${chalk.bold('Quality:')} ${displayQualityRating(result.quality)}\n` +
          `${chalk.bold('Progress:')} ${result.enrollmentProgress}\n` +
          `${chalk.bold('Status:')} ${result.enrollmentComplete ? chalk.green('Complete') : chalk.yellow('In Progress')}`,
        { padding: 1, borderColor: result.enrollmentComplete ? 'green' : 'yellow', margin: 1 }
      )
    );

    // Provide next steps
    if (result.enrollmentComplete) {
      console.log(chalk.cyan('\nEnrollment Complete!'));
      console.log('You can now verify this voice profile using:');
      console.log(
        chalk.grey(
          `  aixtiv copilot speaker --action verify --profileId ${profileId} --file path/to/verification-audio.wav`
        )
      );
    } else {
      console.log(chalk.cyan('\nContinue Enrollment:'));
      console.log('Additional voice samples needed. Add another sample using:');
      console.log(
        chalk.grey(
          `  aixtiv copilot speaker --action enroll --profileId ${profileId} --file path/to/next-audio.wav --phrase "another enrollment phrase"`
        )
      );
    }

    return result;
  } catch (error) {
    spinner.fail('Enrollment failed');
    throw error;
  }
}

/**
 * Verify a speaker against their profile
 * @param {string} profileId - Profile ID
 * @param {string} filePath - Path to audio file
 * @param {string} phrase - Expected phrase (optional)
 * @param {Object} options - Additional options
 */
async function verifySpeaker(profileId, filePath, phrase, options) {
  if (!profileId || !filePath) {
    console.log(chalk.yellow('Missing required parameters:'));
    console.log('  --profileId  Speaker profile ID to verify against');
    console.log('  --file       Path to audio file for verification');
    console.log('  --phrase     Expected phrase in the audio (optional)');
    return;
  }

  // Check file existence
  if (!fs.existsSync(filePath)) {
    console.error(chalk.red('Error: Audio file not found:'), filePath);
    return;
  }

  const spinner = ora('Verifying speaker...').start();

  try {
    const result = await speechService.verifySpeaker(profileId, filePath, phrase);

    if (result.verified) {
      spinner.succeed('Speaker verified');
    } else {
      spinner.fail('Speaker verification failed');
    }

    // Determine confidence color
    let confidenceColor;
    if (result.confidence >= 0.8) confidenceColor = 'green';
    else if (result.confidence >= 0.6) confidenceColor = 'yellow';
    else confidenceColor = 'red';

    console.log('\nVerification Result:');
    console.log(
      boxen(
        `${chalk.bold('Profile ID:')} ${profileId}\n` +
          `${chalk.bold('Verified:')} ${result.verified ? chalk.green('✓ Yes') : chalk.red('✗ No')}\n` +
          `${chalk.bold('Confidence:')} ${chalk[confidenceColor](result.confidence.toFixed(2))}\n` +
          `${chalk.bold('Threshold:')} ${result.threshold.toFixed(2)}`,
        { padding: 1, borderColor: result.verified ? 'green' : 'red', margin: 1 }
      )
    );

    return result;
  } catch (error) {
    spinner.fail('Verification failed');
    throw error;
  }
}

/**
 * Identify a speaker from a set of profiles
 * @param {string} filePath - Path to audio file
 * @param {Object} options - Additional options
 */
async function identifySpeaker(filePath, options) {
  if (!filePath) {
    console.log(chalk.yellow('Missing required parameter:'));
    console.log('  --file       Path to audio file for identification');
    console.log('  --profiles   Comma-separated list of profile IDs to check (optional)');
    return;
  }

  // Check file existence
  if (!fs.existsSync(filePath)) {
    console.error(chalk.red('Error: Audio file not found:'), filePath);
    return;
  }

  // Parse profileIds if provided
  let profileIds = [];
  if (options.profiles) {
    profileIds = options.profiles.split(',').map((id) => id.trim());
  }

  const spinner = ora('Identifying speaker...').start();

  try {
    const result = await speechService.identifySpeaker(filePath, profileIds);

    if (result.identified) {
      spinner.succeed('Speaker identified');
    } else {
      spinner.warn('No matching speaker found');
    }

    console.log('\nIdentification Result:');

    if (result.identified && result.matches && result.matches.length > 0) {
      // Show top match
      const topMatch = result.matches[0];
      console.log(
        boxen(
          `${chalk.bold('Top Match:')} ${topMatch.profileId}\n` +
            `${chalk.bold('Confidence:')} ${displayConfidenceLevel(topMatch.confidence)}`,
          { padding: 1, borderColor: 'green', margin: 1 }
        )
      );

      // Show other matches if any
      if (result.matches.length > 1) {
        console.log('\nOther Potential Matches:');
        const table = result.matches
          .slice(1, 4)
          .map((match, index) => {
            return `${index + 2}. ${match.profileId} (${(match.confidence * 100).toFixed(1)}%)`;
          })
          .join('\n');

        console.log(boxen(table, { padding: 1, borderColor: 'blue', margin: 1 }));
      }
    } else {
      console.log(
        boxen(chalk.yellow('No speaker identified with sufficient confidence'), {
          padding: 1,
          borderColor: 'yellow',
          margin: 1,
        })
      );
    }

    return result;
  } catch (error) {
    spinner.fail('Identification failed');
    throw error;
  }
}

/**
 * List all speaker profiles for a user
 * @param {string} userId - User ID
 */
async function listProfiles(userId) {
  if (!userId) {
    console.log(chalk.yellow('Missing required parameter:'));
    console.log('  --userId     User ID to list profiles for');
    return;
  }

  const spinner = ora('Fetching speaker profiles...').start();

  try {
    const profiles = await speechService.getSpeakerProfiles(userId);

    spinner.succeed(`Found ${profiles.length} speaker profiles`);

    if (profiles.length === 0) {
      console.log(
        boxen(chalk.yellow(`No speaker profiles found for user ${userId}`), {
          padding: 1,
          borderColor: 'yellow',
          margin: 1,
        })
      );
      return [];
    }

    console.log('\nSpeaker Profiles:');

    profiles.forEach((profile, index) => {
      const statusColor =
        profile.enrollmentStatus === 'completed'
          ? 'green'
          : profile.enrollmentStatus === 'in_progress'
            ? 'yellow'
            : 'blue';

      console.log(
        boxen(
          `${chalk.bold('Profile:')} ${profile.profileId}\n` +
            `${chalk.bold('Name:')} ${profile.displayName}\n` +
            `${chalk.bold('Status:')} ${chalk[statusColor](profile.enrollmentStatus)}\n` +
            `${chalk.bold('Phrases:')} ${profile.enrolledPhraseCount}`,
          {
            padding: 1,
            borderColor: statusColor,
            margin: { top: index > 0 ? 0 : 1, bottom: 0, left: 1, right: 1 },
          }
        )
      );
    });

    // Provide next steps
    console.log('\nTo see details for a specific profile:');
    console.log(
      chalk.grey(`  aixtiv copilot speaker --action profile-details --profileId <profile-id>`)
    );

    return profiles;
  } catch (error) {
    spinner.fail('Failed to fetch profiles');
    throw error;
  }
}

/**
 * Get details for a specific profile
 * @param {string} profileId - Profile ID
 */
async function getProfileDetails(profileId) {
  if (!profileId) {
    console.log(chalk.yellow('Missing required parameter:'));
    console.log('  --profileId  Speaker profile ID');
    return;
  }

  const spinner = ora('Fetching profile details...').start();

  try {
    const profile = await speechService.getSpeakerProfileDetails(profileId);

    spinner.succeed('Profile details retrieved');

    console.log('\nProfile Details:');

    const statusColor =
      profile.enrollmentStatus === 'completed'
        ? 'green'
        : profile.enrollmentStatus === 'in_progress'
          ? 'yellow'
          : 'blue';

    console.log(
      boxen(
        `${chalk.bold('Profile ID:')} ${profileId}\n` +
          `${chalk.bold('User ID:')} ${profile.userId}\n` +
          `${chalk.bold('Name:')} ${profile.displayName}\n` +
          `${chalk.bold('Description:')} ${profile.description || 'N/A'}\n` +
          `${chalk.bold('Status:')} ${chalk[statusColor](profile.enrollmentStatus)}\n` +
          `${chalk.bold('Locale:')} ${profile.locale}\n` +
          `${chalk.bold('Created:')} ${profile.createdAt ? formatDate(profile.createdAt) : 'N/A'}\n` +
          `${chalk.bold('Updated:')} ${profile.updatedAt ? formatDate(profile.updatedAt) : 'N/A'}\n` +
          `${chalk.bold('Enrolled Phrases:')} ${profile.enrolledPhrases ? profile.enrolledPhrases.length : 0}`,
        { padding: 1, borderColor: statusColor, margin: 1 }
      )
    );

    // Show enrolled phrases
    if (profile.enrolledPhrases && profile.enrolledPhrases.length > 0) {
      console.log('\nEnrolled Phrases:');

      const phrasesText = profile.enrolledPhrases
        .map((enrollment, idx) => {
          const date = enrollment.timestamp ? formatDate(enrollment.timestamp.toDate()) : 'Unknown';
          return `${idx + 1}. "${enrollment.phrase}" (${date})`;
        })
        .join('\n');

      console.log(boxen(phrasesText, { padding: 1, borderColor: 'blue', margin: 1 }));
    }

    // Show recent verifications
    if (profile.recentVerifications && profile.recentVerifications.length > 0) {
      console.log('\nRecent Verifications:');

      const verificationsText = profile.recentVerifications
        .map((verification, idx) => {
          const date = verification.timestamp ? formatDate(verification.timestamp) : 'Unknown';
          const resultColor = verification.result === 'success' ? 'green' : 'red';
          return `${date}: ${chalk[resultColor](verification.result)} (${(verification.confidence * 100).toFixed(1)}%)`;
        })
        .join('\n');

      console.log(boxen(verificationsText, { padding: 1, borderColor: 'cyan', margin: 1 }));
    }

    return profile;
  } catch (error) {
    spinner.fail('Failed to fetch profile details');
    throw error;
  }
}

/**
 * Delete a speaker profile
 * @param {string} profileId - Profile ID
 */
async function deleteProfile(profileId) {
  if (!profileId) {
    console.log(chalk.yellow('Missing required parameter:'));
    console.log('  --profileId  Speaker profile ID to delete');
    return;
  }

  // Confirm deletion
  const answer = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Are you sure you want to delete profile ${profileId}? This cannot be undone.`,
      default: false,
    },
  ]);

  if (!answer.confirm) {
    console.log(chalk.yellow('Profile deletion cancelled'));
    return false;
  }

  const spinner = ora('Deleting speaker profile...').start();

  try {
    await speechService.deleteSpeakerProfile(profileId);

    spinner.succeed('Speaker profile deleted');

    console.log(
      boxen(chalk.bold(`Profile ${profileId} has been permanently deleted`), {
        padding: 1,
        borderColor: 'red',
        margin: 1,
      })
    );

    return true;
  } catch (error) {
    spinner.fail('Failed to delete profile');
    throw error;
  }
}

/**
 * Display quality rating visually
 * @param {number} quality - Quality score (0-1)
 * @returns {string} Visual representation of quality
 */
function displayQualityRating(quality) {
  const score = Math.round(quality * 100);
  let color;

  if (score >= 90) color = 'green';
  else if (score >= 70) color = 'yellow';
  else color = 'red';

  return chalk[color](`${score}%`);
}

/**
 * Display confidence level visually
 * @param {number} confidence - Confidence score (0-1)
 * @returns {string} Visual representation of confidence
 */
function displayConfidenceLevel(confidence) {
  const score = Math.round(confidence * 100);
  let color;

  if (score >= 80) color = 'green';
  else if (score >= 60) color = 'yellow';
  else color = 'red';

  return chalk[color](`${score}%`);
}

/**
 * Format date for display
 * @param {Date} date - Date to format
 * @returns {string} Formatted date
 */
function formatDate(date) {
  if (!date) return 'N/A';

  return new Date(date).toLocaleString();
}

/**
 * Show help information
 */
function showHelp() {
  console.log(chalk.cyan('\nCopilot Speaker Recognition Commands:'));
  console.log(`
${chalk.green('Create a new speaker profile:')}
  aixtiv copilot speaker --action create-profile --email principal@coaching2100.com [--name "Voice Profile"] [--description "Description"]

${chalk.green('Enroll a speaker with audio:')}
  aixtiv copilot speaker --action enroll --profileId <profile-id> --file <audio-path> [--phrase "Enrollment phrase"]

${chalk.green('Verify a speaker against their profile:')}
  aixtiv copilot speaker --action verify --profileId <profile-id> --file <audio-path> [--phrase "Expected phrase"]

${chalk.green('Identify an unknown speaker from all profiles:')}
  aixtiv copilot speaker --action identify --file <audio-path> [--profiles "id1,id2,id3"]

${chalk.green('List all speaker profiles for a principal:')}
  aixtiv copilot speaker --action list-profiles --email principal@coaching2100.com

${chalk.green('Get detailed profile information:')}
  aixtiv copilot speaker --action profile-details --profileId <profile-id>

${chalk.green('Delete a speaker profile:')}
  aixtiv copilot speaker --action delete-profile --profileId <profile-id>
`);
}
