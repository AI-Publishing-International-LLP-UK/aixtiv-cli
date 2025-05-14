/**
 * Copilot Voice Command (Simplified)
 * 
 * Provides simplified voice interaction with copilots including STT, TTS,
 * with personalization and sentiment analysis.
 * 
 * This is a lightweight version that doesn't depend on specific copilot IDs
 * or user IDs, and doesn't include Dream Commander functionality.
 * 
 * (c) 2025 Copyright AI Publishing International LLP
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');
const { parseOptions } = require('../../lib/utils');
const speechCore = require('../../src/services/speech/speech-core');
const playSound = require('play-sound')({});

/**
 * Record audio from microphone
 * @param {number} duration - Recording duration in seconds
 * @param {string} outputPath - Path to save the recording
 * @returns {Promise<string>} - Path to the recorded audio file
 */
async function recordAudio(duration = 10, outputPath) {
  const { spawn } = require('child_process');
  
  // Default output path if not specified
  const filePath = outputPath || path.join(process.cwd(), `recording-${Date.now()}.wav`);
  
  return new Promise((resolve, reject) => {
    const spinner = ora('Recording audio...').start();
    
    let recorder;
    
    if (process.platform === 'darwin') {
      // macOS using afrecord
      recorder = spawn('afrecord', [
        '-f', 'WAVE',
        '-c', '1',
        '-r', '16000',
        filePath
      ]);
    } else if (process.platform === 'linux') {
      // Linux using arecord
      recorder = spawn('arecord', [
        '-f', 'cd',
        '-c', '1',
        '-r', '16000',
        '-d', duration.toString(),
        filePath
      ]);
    } else if (process.platform === 'win32') {
      // Windows using SoX
      recorder = spawn('sox', [
        '-d',
        '-c', '1',
        '-r', '16000',
        '-b', '16',
        filePath,
        'trim', '0', duration.toString()
      ]);
    } else {
      spinner.fail('Unsupported platform for recording');
      reject(new Error('Unsupported platform'));
      return;
    }
    
    // Set timeout to stop recording after duration
    const timeoutId = setTimeout(() => {
      recorder.kill();
    }, duration * 1000);
    
    recorder.on('error', (err) => {
      clearTimeout(timeoutId);
      spinner.fail(`Recording failed: ${err.message}`);
      reject(err);
    });
    
    recorder.on('close', (code) => {
      clearTimeout(timeoutId);
      if (code === 0) {
        spinner.succeed(`Recording saved to ${filePath}`);
        resolve(filePath);
      } else {
        spinner.fail(`Recording process exited with code ${code}`);
        reject(new Error(`Recording process exited with code ${code}`));
      }
    });
  });
}

/**
 * Play audio file
 * @param {Buffer|string} audio - Audio buffer or path to audio file
 * @returns {Promise<void>}
 */
async function playAudio(audio) {
  // If audio is a buffer, save it to a temporary file first
  let audioPath;
  if (Buffer.isBuffer(audio)) {
    audioPath = path.join(process.cwd(), `playback-${Date.now()}.mp3`);
    fs.writeFileSync(audioPath, audio);
  } else {
    audioPath = audio;
  }
  
  return new Promise((resolve, reject) => {
    const spinner = ora('Playing audio...').start();
    
    const player = playSound.play(audioPath, (err) => {
      if (err) {
        spinner.fail(`Failed to play audio: ${err.message}`);
        reject(err);
      } else {
        spinner.succeed('Audio playback completed');
        
        // Clean up temp file if we created one
        if (Buffer.isBuffer(audio) && fs.existsSync(audioPath)) {
          fs.unlinkSync(audioPath);
        }
        
        resolve();
      }
    });
  });
}

/**
 * Main voice command handler
 * @param {object} options - Command options
 */
module.exports = async function voiceCommand(options) {
  const {
    action,
    userId,
    copilotId,
    file,
    text,
    output,
    sentiment = 'true',
    personalization = 'true',
    pitch,
    rate,
    gender,
    language = 'en-US',
    duration = '10'
  } = parseOptions(options);
  
  try {
    // Initialize the speech service
    await speechCore.initialize();
    
    // Handle different actions
    switch (action) {
      case 'transcribe':
        await handleTranscribe(file, parseInt(duration), userId, sentiment === 'true', output);
        break;
        
      case 'speak':
        await handleSpeak(text, copilotId, userId, personalization === 'true', output, {
          pitch: parseFloat(pitch),
          rate: parseFloat(rate),
          gender,
          language
        });
        break;
        
      case 'personalize':
        await handlePersonalize(userId, copilotId, { 
          pitch: parseFloat(pitch), 
          rate: parseFloat(rate), 
          gender 
        });
        break;
        
      case 'test':
        await handleTest(userId, copilotId);
        break;
        
      default:
        console.log(
          chalk.yellow('\n⚠️  Please specify an action. Available actions:\n') +
          chalk.cyan('transcribe') + ' - Convert speech to text\n' +
          chalk.cyan('speak') + ' - Convert text to speech\n' +
          chalk.cyan('personalize') + ' - Set voice personalization settings\n' +
          chalk.cyan('test') + ' - Test voice functionality\n\n' +
          chalk.yellow('Example:') + ' aixtiv copilot voice --action speak --text "Hello" --copilotId your-copilot-id'
        );
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
  }
};

/**
 * Handle transcribe action
 * @param {string} audioFile - Path to audio file or null to record
 * @param {number} duration - Recording duration in seconds
 * @param {string} userId - User ID
 * @param {boolean} includeSentiment - Whether to include sentiment analysis
 * @param {string} outputPath - Path to save transcription text
 */
async function handleTranscribe(audioFile, duration, userId, includeSentiment, outputPath) {
  try {
    // If no audio file is provided, record one
    let audioPath = audioFile;
    if (!audioFile) {
      console.log(chalk.cyan('No audio file provided. Starting recording...'));
      audioPath = await recordAudio(duration);
    }
    
    // Transcribe the audio
    const spinner = ora('Transcribing audio to text...').start();
    
    const result = await speechCore.transcribe(audioPath, {
      userId,
      analyzeSentiment: includeSentiment
    });
    
    spinner.succeed('Transcription completed');
    
    // Display the transcription result
    console.log(chalk.green('\n✓ Transcription:'));
    console.log(result.text);
    console.log(chalk.green('\n✓ Confidence:'), `${(result.confidence * 100).toFixed(2)}%`);
    
    // Display sentiment if available
    if (includeSentiment && result.sentiment) {
      console.log(chalk.green('\n✓ Sentiment Analysis:'));
      console.log('Category:', result.sentiment.sentiment);
      console.log('Score:', result.sentiment.score.toFixed(2));
      console.log('Magnitude:', result.sentiment.magnitude.toFixed(2));
    }
    
    // Save transcription to file if output path is provided
    if (outputPath) {
      fs.writeFileSync(outputPath, result.text);
      console.log(chalk.green('\n✓ Transcription saved to:'), outputPath);
    }
    
    // Clean up temporary recording if we created one
    if (!audioFile && fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
      console.log(chalk.dim('\nTemporary recording deleted'));
    }
    
    return result;
  } catch (error) {
    console.error(chalk.red('Transcription failed:'), error.message);
    throw error;
  }
}

/**
 * Handle speak action
 * @param {string} text - Text to speak
 * @param {string} copilotId - Copilot ID
 * @param {string} userId - User ID
 * @param {boolean} usePersonalization - Whether to use personalized voice
 * @param {string} outputPath - Path to save audio file
 * @param {Object} voiceOptions - Voice options (pitch, rate, gender, language)
 */
async function handleSpeak(text, copilotId, userId, usePersonalization, outputPath, voiceOptions = {}) {
  if (!text) {
    // Prompt for text if not provided
    const { inputText } = await inquirer.prompt([
      {
        type: 'input',
        name: 'inputText',
        message: 'Enter text for the copilot to speak:',
        validate: (input) => input.length > 0 ? true : 'Text cannot be empty'
      }
    ]);
    
    text = inputText;
  }
  
  try {
    // Default output path if not specified
    outputPath = outputPath || path.join(process.cwd(), `speech-${Date.now()}.mp3`);
    
    const spinner = ora('Converting text to speech...').start();
    
    // Convert text to speech
    const audioContent = await speechCore.textToSpeech(text, {
      copilotId,
      userId,
      personalization: usePersonalization,
      name: voiceOptions.name,
      gender: voiceOptions.gender,
      pitch: voiceOptions.pitch,
      rate: voiceOptions.rate,
      languageCode: voiceOptions.language
    });
    
    spinner.succeed('Text-to-speech completed');
    
    // Save audio to a file
    fs.writeFileSync(outputPath, audioContent);
    console.log(chalk.green('\n✓ Audio saved to:'), outputPath);
    
    // Play the audio
    console.log(chalk.cyan('\nPlaying audio...'));
    await playAudio(audioContent);
    
    return outputPath;
  } catch (error) {
    console.error(chalk.red('Text-to-speech failed:'), error.message);
    throw error;
  }
}

/**
 * Handle personalize action
 * @param {string} userId - User ID
 * @param {string} copilotId - Copilot ID
 * @param {Object} voiceOptions - Voice options (pitch, rate, gender)
 */
async function handlePersonalize(userId, copilotId, voiceOptions = {}) {
  if (!userId || !copilotId) {
    console.log(chalk.yellow('Missing required parameters:'));
    console.log('  --userId     User ID');
    console.log('  --copilotId  Copilot ID');
    return;
  }
  
  // Get personalization settings
  let settings = {};
  
  // Use command line options if provided
  if (voiceOptions.pitch !== undefined || voiceOptions.rate !== undefined || voiceOptions.gender !== undefined) {
    settings = {
      pitch: voiceOptions.pitch || 0,
      speakingRate: voiceOptions.rate || 1.0,
      gender: voiceOptions.gender || 'NEUTRAL'
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
        default: 'NEUTRAL'
      },
      {
        type: 'number',
        name: 'pitch',
        message: 'Voice pitch (-10.0 to 10.0, where negative is lower):',
        default: 0
      },
      {
        type: 'number',
        name: 'speakingRate',
        message: 'Speaking rate (0.25 to 4.0, where 1.0 is normal):',
        default: 1.0
      }
    ]);
    
    settings = answers;
  }
  
  const spinner = ora('Saving personalization settings...').start();
  
  try {
    // Save settings
    const success = await speechCore.setPersonalization(userId, copilotId, settings);
    
    if (success) {
      spinner.succeed('Personalization settings saved');
      
      // Display settings
      console.log(chalk.green('\n✓ Personalization Settings:'));
      console.log('User ID:', userId);
      console.log('Copilot ID:', copilotId);
      console.log('Gender:', settings.gender);
      console.log('Pitch:', settings.pitch);
      console.log('Speaking Rate:', settings.speakingRate);
      
      // Generate a test sample
      console.log(chalk.cyan('\nGenerating voice sample to test settings...'));
      const testText = `This is a voice sample for ${copilotId} with personalized settings.`;
      
      await handleSpeak(testText, copilotId, userId, true, `${copilotId}-sample.mp3`);
    } else {
      spinner.fail('Failed to save personalization settings');
    }
    
    return settings;
  } catch (error) {
    spinner.fail('Failed to save personalization settings');
    throw error;
  }
}

/**
 * Handle test action
 * @param {string} userId - User ID
 * @param {string} copilotId - Copilot ID
 */
async function handleTest(userId, copilotId) {
  console.log(chalk.cyan('\n🧪 Running speech system test'));
  
  // Test 1: Initialization
  try {
    console.log(chalk.cyan('\nTesting speech service initialization...'));
    await speechCore.initialize();
    console.log(chalk.green('✓ Speech service initialized successfully'));
  } catch (error) {
    console.error(chalk.red('✗ Initialization failed:'), error.message);
    return;
  }
  
  // Test 2: Text-to-Speech
  try {
    console.log(chalk.cyan('\nTesting Text-to-Speech...'));
    const testText = 'This is a test of the speech system. If you can hear this, the test was successful.';
    const outputPath = path.join(process.cwd(), 'test-tts-output.mp3');
    
    const audioContent = await speechCore.textToSpeech(testText, {
      copilotId,
      userId
    });
    
    fs.writeFileSync(outputPath, audioContent);
    console.log(chalk.green('✓ TTS test completed successfully'));
    console.log('Audio saved to:', outputPath);
    
    // Play the audio
    console.log(chalk.cyan('\nPlaying test audio...'));
    await playAudio(audioContent);
  } catch (error) {
    console.error(chalk.red('✗ TTS test failed:'), error.message);
  }
  
  // Test 3: Sentiment Analysis
  try {
    console.log(chalk.cyan('\nTesting sentiment analysis...'));
    
    // Test with positive text
    const positiveText = 'I love how well this system works! It is amazing and wonderful.';
    const positiveSentiment = await speechCore.analyzeSentiment(positiveText);
    console.log(`Positive text sentiment: ${positiveSentiment.sentiment} (${positiveSentiment.score.toFixed(2)})`);
    
    // Test with negative text
    const negativeText = 'This is terrible and frustrating. I dislike it very much.';
    const negativeSentiment = await speechCore.analyzeSentiment(negativeText);
    console.log(`Negative text sentiment: ${negativeSentiment.sentiment} (${negativeSentiment.score.toFixed(2)})`);
    
    // Test with neutral text
    const neutralText = 'This is a factual statement about the weather today.';
    const neutralSentiment = await speechCore.analyzeSentiment(neutralText);
    console.log(`Neutral text sentiment: ${neutralSentiment.sentiment} (${neutralSentiment.score.toFixed(2)})`);
    
    console.log(chalk.green('✓ Sentiment analysis test completed successfully'));
  } catch (error) {
    console.error(chalk.red('✗ Sentiment analysis test failed:'), error.message);
  }
  
  console.log(chalk.green('\n✓ Speech system test completed'));
}