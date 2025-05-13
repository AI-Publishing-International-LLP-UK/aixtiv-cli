/**
 * Copilot Voice Command
 *
 * This module provides commands for using speech capabilities with Copilots.
 * Supports Google STT/TTS, personalization, sentiment analysis and Dream Commander.
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
const speechService = require('../../src/services/speech');

/**
 * Voice command handler
 * @param {object} options - Command line options
 */
module.exports = async function voiceCommand(options) {
  const {
    action,
    userId,
    copilotId,
    file,
    text,
    sessionId,
    ceScore,
    message,
    output,
    pitch,
    rate,
    gender
  } = parseOptions(options);

  // Validate input
  if (!action) {
    showHelp();
    return;
  }

  try {
    switch (action) {
      case 'transcribe':
        await transcribeAudio(file, options);
        break;

      case 'speak':
        await generateSpeech(text, options);
        break;

      case 'personalize':
        await personalizeVoice(userId, copilotId, options);
        break;

      case 'ce-score':
        await getCEScore(userId);
        break;

      case 'update-ce':
        await updateCEScore(userId, ceScore, options.reason);
        break;

      case 'dream-session':
        await createDreamSession(userId, options);
        break;

      case 'dream-interact':
        await interactWithDream(sessionId, message);
        break;

      case 'test':
        await testVoiceSystem(options);
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
 * Transcribe audio to text
 * @param {string} filePath - Path to audio file
 * @param {Object} options - Additional options
 */
async function transcribeAudio(filePath, options) {
  if (!filePath) {
    console.log(chalk.yellow('Missing required parameter:'));
    console.log('  --file       Path to audio file');
    return;
  }

  const spinner = ora('Transcribing audio...').start();

  try {
    // Read file if it exists
    if (!fs.existsSync(filePath)) {
      spinner.fail('Audio file not found');
      throw new Error(`File not found: ${filePath}`);
    }

    // Perform transcription
    const result = await speechService.transcribe(filePath, {
      userId: options.userId,
      sentiment: options.sentiment !== 'false',
      languageCode: options.language || 'en-US'
    });

    spinner.succeed('Transcription complete');

    // Display transcription
    console.log('\nTranscription:');
    console.log(boxen(result.text, { padding: 1, borderColor: 'green', margin: 1 }));

    // Display sentiment if available
    if (result.sentiment) {
      console.log('\nSentiment Analysis:');
      const sentimentColor = 
        result.sentiment.category === 'positive' ? 'green' :
        result.sentiment.category === 'negative' ? 'red' : 'yellow';
      
      console.log(boxen(
        `${chalk.bold('Category:')} ${chalk[sentimentColor](result.sentiment.category)}\n` +
        `${chalk.bold('Score:')} ${result.sentiment.score.toFixed(2)}\n` +
        `${chalk.bold('Magnitude:')} ${result.sentiment.magnitude.toFixed(2)}`,
        { padding: 1, borderColor: sentimentColor, margin: 1 }
      ));
    }

    // Save transcription to file if output specified
    if (options.output) {
      fs.writeFileSync(options.output, result.text);
      console.log(`\nTranscription saved to: ${options.output}`);
    }

    return result;
  } catch (error) {
    spinner.fail('Transcription failed');
    throw error;
  }
}

/**
 * Generate speech from text
 * @param {string} text - Text to convert to speech
 * @param {Object} options - Additional options
 */
async function generateSpeech(text, options) {
  if (!text) {
    console.log(chalk.yellow('Missing required parameter:'));
    console.log('  --text       Text to convert to speech');
    return;
  }

  const spinner = ora('Generating speech...').start();

  try {
    // Determine copilot
    const copilotId = options.copilotId || 'copilot-01';
    
    // Generate speech
    const audioContent = await speechService.textToSpeech(text, {
      userId: options.userId,
      copilotId,
      personalization: options.personalization !== 'false',
      languageCode: options.language || 'en-US',
      audioEncoding: options.format || 'MP3'
    });

    spinner.succeed('Speech generation complete');

    // Save audio to file
    const outputFile = options.output || `speech-${Date.now()}.mp3`;
    fs.writeFileSync(outputFile, audioContent);
    console.log(`\nSpeech saved to: ${outputFile}`);

    // Display details
    console.log('\nGeneration Details:');
    console.log(boxen(
      `${chalk.bold('Copilot:')} ${copilotId}\n` +
      `${chalk.bold('Text:')} ${text.length > 50 ? text.substring(0, 50) + '...' : text}\n` +
      `${chalk.bold('Output:')} ${outputFile}\n` +
      `${chalk.bold('Size:')} ${(audioContent.length / 1024).toFixed(2)} KB`,
      { padding: 1, borderColor: 'cyan', margin: 1 }
    ));

    return outputFile;
  } catch (error) {
    spinner.fail('Speech generation failed');
    throw error;
  }
}

/**
 * Personalize voice settings for a user
 * @param {string} userId - User ID
 * @param {string} copilotId - Copilot ID
 * @param {Object} options - Personalization options
 */
async function personalizeVoice(userId, copilotId, options) {
  if (!userId || !copilotId) {
    console.log(chalk.yellow('Missing required parameters:'));
    console.log('  --userId     User ID');
    console.log('  --copilotId  Copilot ID (copilot-01 for SirHand, copilot-02 for QBLucy)');
    return;
  }

  // Get personalization settings
  let settings = {};
  
  // Use command line options if provided
  if (options.pitch !== undefined || options.rate !== undefined || options.gender !== undefined) {
    settings = {
      pitch: parseFloat(options.pitch) || 0,
      speakingRate: parseFloat(options.rate) || 1.0,
      gender: options.gender || 'NEUTRAL'
    };
  } else {
    // Otherwise use interactive mode
    console.log(chalk.cyan(`\nPersonalizing voice for ${chalk.bold(copilotId)} (User: ${userId})`));
    
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'gender',
        message: 'Select voice gender:',
        choices: ['MALE', 'FEMALE', 'NEUTRAL'],
        default: copilotId === 'copilot-01' ? 'MALE' : 'FEMALE'
      },
      {
        type: 'number',
        name: 'pitch',
        message: 'Voice pitch (-10.0 to 10.0, where negative is lower):',
        default: copilotId === 'copilot-01' ? -2.0 : 0.5
      },
      {
        type: 'number',
        name: 'speakingRate',
        message: 'Speaking rate (0.25 to 4.0, where 1.0 is normal):',
        default: copilotId === 'copilot-01' ? 0.9 : 1.1
      }
    ]);
    
    settings = answers;
  }

  const spinner = ora('Saving personalization settings...').start();

  try {
    // Save settings
    await speechService.setPersonalization(userId, copilotId, settings);
    
    spinner.succeed('Personalization settings saved');
    
    // Display settings
    console.log('\nPersonalization Settings:');
    console.log(boxen(
      `${chalk.bold('User ID:')} ${userId}\n` +
      `${chalk.bold('Copilot:')} ${copilotId}\n` +
      `${chalk.bold('Gender:')} ${settings.gender}\n` +
      `${chalk.bold('Pitch:')} ${settings.pitch}\n` +
      `${chalk.bold('Speaking Rate:')} ${settings.speakingRate}`,
      { padding: 1, borderColor: 'green', margin: 1 }
    ));
    
    // Generate a test sample
    console.log(chalk.cyan('\nGenerating voice sample to test settings...'));
    const testText = `This is a voice sample for ${copilotId === 'copilot-01' ? 'SirHand' : 'QBLucy'} with personalized settings.`;
    
    await generateSpeech(testText, { 
      userId, 
      copilotId,
      output: `${copilotId}-sample.mp3`
    });
    
    return settings;
  } catch (error) {
    spinner.fail('Failed to save personalization settings');
    throw error;
  }
}

/**
 * Get CE score for user
 * @param {string} userId - User ID
 */
async function getCEScore(userId) {
  if (!userId) {
    console.log(chalk.yellow('Missing required parameter:'));
    console.log('  --userId     User ID');
    return;
  }

  const spinner = ora('Retrieving CE score...').start();

  try {
    const score = await speechService.getCEScore(userId);
    spinner.succeed('CE score retrieved');

    // Determine color based on score
    let scoreColor;
    if (score >= 80) scoreColor = 'green';
    else if (score >= 60) scoreColor = 'yellow';
    else if (score >= 40) scoreColor = 'blue';
    else scoreColor = 'red';

    // Display score
    console.log('\nCE Score:');
    console.log(boxen(
      `${chalk.bold('User ID:')} ${userId}\n` +
      `${chalk.bold('Score:')} ${chalk[scoreColor](score)}`,
      { padding: 1, borderColor: scoreColor, margin: 1 }
    ));

    return score;
  } catch (error) {
    spinner.fail('Failed to retrieve CE score');
    throw error;
  }
}

/**
 * Update CE score for user
 * @param {string} userId - User ID
 * @param {number} delta - Change in CE score
 * @param {string} reason - Reason for change
 */
async function updateCEScore(userId, delta, reason) {
  if (!userId || delta === undefined) {
    console.log(chalk.yellow('Missing required parameters:'));
    console.log('  --userId     User ID');
    console.log('  --ceScore    Change in CE score (can be positive or negative)');
    console.log('  --reason     Reason for the change');
    return;
  }

  const spinner = ora('Updating CE score...').start();

  try {
    // Parse delta
    const numericDelta = parseFloat(delta);
    
    // Update score
    const newScore = await speechService.updateCEScore(userId, numericDelta, reason || 'Manual update');
    spinner.succeed('CE score updated');

    // Display updated score
    console.log('\nUpdated CE Score:');
    let scoreColor;
    if (newScore >= 80) scoreColor = 'green';
    else if (newScore >= 60) scoreColor = 'yellow';
    else if (newScore >= 40) scoreColor = 'blue';
    else scoreColor = 'red';

    console.log(boxen(
      `${chalk.bold('User ID:')} ${userId}\n` +
      `${chalk.bold('New Score:')} ${chalk[scoreColor](newScore)}\n` +
      `${chalk.bold('Change:')} ${numericDelta >= 0 ? '+' : ''}${numericDelta}\n` +
      `${chalk.bold('Reason:')} ${reason || 'Manual update'}`,
      { padding: 1, borderColor: scoreColor, margin: 1 }
    ));

    return newScore;
  } catch (error) {
    spinner.fail('Failed to update CE score');
    throw error;
  }
}

/**
 * Create Dream Commander session
 * @param {string} userId - User ID
 * @param {Object} options - Session options
 */
async function createDreamSession(userId, options) {
  if (!userId) {
    console.log(chalk.yellow('Missing required parameter:'));
    console.log('  --userId     User ID');
    return;
  }

  const spinner = ora('Creating Dream Commander session...').start();

  try {
    // Create session
    const session = await speechService.createDreamCommanderSession(userId, {
      minimumCEScore: options.minCE || 60,
      maxDuration: options.duration || 3600,
      theme: options.theme || 'default',
      intensity: options.intensity || 'medium'
    });
    
    spinner.succeed('Dream Commander session created');

    // Display session details
    console.log('\nDream Commander Session:');
    console.log(boxen(
      `${chalk.bold('Session ID:')} ${session.sessionId}\n` +
      `${chalk.bold('User ID:')} ${userId}\n` +
      `${chalk.bold('CE Score:')} ${session.ceScore}\n` +
      `${chalk.bold('Status:')} ${session.status}\n` +
      `${chalk.bold('Theme:')} ${session.config.theme}\n` +
      `${chalk.bold('Intensity:')} ${session.config.intensity}\n` +
      `${chalk.bold('Max Duration:')} ${session.config.maxDuration} seconds`,
      { padding: 1, borderColor: 'magenta', margin: 1 }
    ));

    console.log(chalk.blue('\nInteract with the Dream Commander:'));
    console.log(`  aixtiv copilot voice --action dream-interact --sessionId ${session.sessionId} --message "Your message here"`);

    return session;
  } catch (error) {
    spinner.fail('Failed to create Dream Commander session');
    throw error;
  }
}

/**
 * Interact with Dream Commander session
 * @param {string} sessionId - Session ID
 * @param {string} message - User message
 */
async function interactWithDream(sessionId, message) {
  if (!sessionId || !message) {
    console.log(chalk.yellow('Missing required parameters:'));
    console.log('  --sessionId  Dream Commander session ID');
    console.log('  --message    Message to send to Dream Commander');
    return;
  }

  const spinner = ora('Sending message to Dream Commander...').start();

  try {
    // Send message
    const response = await speechService.dreamCommanderInteraction(sessionId, message);
    spinner.succeed('Dream Commander responded');

    // Display response
    console.log('\nDream Commander Response:');
    console.log(boxen(response.text, { padding: 1, borderColor: 'magenta', margin: 1 }));

    // Save audio response
    const outputFile = path.join(process.cwd(), `dream-response-${Date.now()}.mp3`);
    fs.writeFileSync(outputFile, response.audio);
    console.log(`\nResponse audio saved to: ${outputFile}`);

    // Display sentiment if available
    if (response.sentiment) {
      console.log('\nYour Message Sentiment:');
      const sentimentColor = 
        response.sentiment.category === 'positive' ? 'green' :
        response.sentiment.category === 'negative' ? 'red' : 'yellow';
      
      console.log(boxen(
        `${chalk.bold('Category:')} ${chalk[sentimentColor](response.sentiment.category)}\n` +
        `${chalk.bold('Score:')} ${response.sentiment.score.toFixed(2)}\n` +
        `${chalk.bold('Magnitude:')} ${response.sentiment.magnitude.toFixed(2)}`,
        { padding: 1, borderColor: sentimentColor, margin: 1 }
      ));
    }

    return response;
  } catch (error) {
    spinner.fail('Failed to interact with Dream Commander');
    throw error;
  }
}

/**
 * Test voice system functionality
 * @param {Object} options - Test options
 */
async function testVoiceSystem(options) {
  console.log(chalk.cyan('\n=== Voice System Test ===\n'));

  try {
    // Test initialized
    console.log(chalk.yellow('Testing Speech Service initialization...'));
    await speechService.initialize();
    console.log(chalk.green('✅ Speech Service initialized successfully\n'));

    // Test TTS for each copilot
    console.log(chalk.yellow('Testing Text-to-Speech for SirHand (copilot-01)...'));
    const sirHandOutput = await generateSpeech(
      'This is a test of the SirHand voice system. I am copilot-01.',
      { copilotId: 'copilot-01', output: 'sirhand-test.mp3' }
    );
    console.log(chalk.green(`✅ SirHand TTS test completed: ${sirHandOutput}\n`));

    console.log(chalk.yellow('Testing Text-to-Speech for QBLucy (copilot-02)...'));
    const qbLucyOutput = await generateSpeech(
      'This is a test of the QBLucy voice system. I am copilot-02.',
      { copilotId: 'copilot-02', output: 'qblucy-test.mp3' }
    );
    console.log(chalk.green(`✅ QBLucy TTS test completed: ${qbLucyOutput}\n`));

    console.log(chalk.yellow('Testing Text-to-Speech for Dream Commander...'));
    const dreamOutput = await generateSpeech(
      'This is a test of the Dream Commander voice system. Welcome to the dreamscape.',
      { copilotId: 'dream-commander', output: 'dream-commander-test.mp3' }
    );
    console.log(chalk.green(`✅ Dream Commander TTS test completed: ${dreamOutput}\n`));

    // Test CE score
    if (options.userId) {
      console.log(chalk.yellow(`Testing CE score for user ${options.userId}...`));
      const ceScore = await getCEScore(options.userId);
      console.log(chalk.green(`✅ CE score test completed: ${ceScore}\n`));
    }

    console.log(chalk.green('\n=== Voice System Test Completed Successfully ===\n'));
  } catch (error) {
    console.error(chalk.red(`\n❌ Test failed: ${error.message}\n`));
    throw error;
  }
}

/**
 * Show help information
 */
function showHelp() {
  console.log(chalk.cyan('\nCopilot Voice Commands:'));
  console.log(`
${chalk.green('Transcribe audio to text:')}
  aixtiv copilot voice --action transcribe --file <path> [--userId <id>] [--output <path>]

${chalk.green('Generate speech from text:')}
  aixtiv copilot voice --action speak --text "Text to speak" --copilotId <id> [--output <path>]

${chalk.green('Personalize copilot voice:')}
  aixtiv copilot voice --action personalize --userId <id> --copilotId <id> [--pitch <value>] [--rate <value>]

${chalk.green('Get CE (Collective Empathy) score:')}
  aixtiv copilot voice --action ce-score --userId <id>

${chalk.green('Update CE score:')}
  aixtiv copilot voice --action update-ce --userId <id> --ceScore <delta> --reason "Reason for change"

${chalk.green('Create Dream Commander session:')}
  aixtiv copilot voice --action dream-session --userId <id> [--minCE <score>] [--intensity <level>]

${chalk.green('Interact with Dream Commander:')}
  aixtiv copilot voice --action dream-interact --sessionId <id> --message "Your message"

${chalk.green('Test voice system:')}
  aixtiv copilot voice --action test [--userId <id>]
`);
}