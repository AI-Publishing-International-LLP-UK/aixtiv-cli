/**
 * Speech System Test
 * 
 * This script tests the full functionality of the speech system, including:
 * - STT (Speech-to-Text)
 * - TTS (Text-to-Speech)
 * - Personalization
 * - Sentiment analysis
 * - CE scoring
 * - Dream Commander functionality
 * 
 * Run with:
 * node test/speech-system-test.js
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const speechService = require('../src/services/speech');

// Test User IDs
const USERS = {
  PCR: 'Mr-Phillip-Corey-Roark',
  SIRHAND: 'copilot-01',
  QBLUCY: 'copilot-02'
};

// Create a temporary audio file
async function createTestAudio() {
  const testDir = path.join(__dirname, 'temp');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  // Generate test audio for SirHand
  const sirHandText = "Hello, this is SirHand, copilot-01. I am testing the speech system.";
  const sirHandAudio = await speechService.textToSpeech(sirHandText, {
    copilotId: 'copilot-01',
    userId: USERS.PCR
  });
  
  const sirHandPath = path.join(testDir, 'sirhand-test.mp3');
  fs.writeFileSync(sirHandPath, sirHandAudio);
  
  // Generate test audio for QBLucy
  const qbLucyText = "Hello, this is QBLucy, copilot-02. I am testing the speech system.";
  const qbLucyAudio = await speechService.textToSpeech(qbLucyText, {
    copilotId: 'copilot-02',
    userId: USERS.PCR
  });
  
  const qbLucyPath = path.join(testDir, 'qblucy-test.mp3');
  fs.writeFileSync(qbLucyPath, qbLucyAudio);
  
  return {
    sirHandPath,
    qbLucyPath
  };
}

// Test STT functionality
async function testSTT(audioPath) {
  console.log(chalk.cyan('\nTesting Speech-to-Text...'));
  
  try {
    const result = await speechService.transcribe(audioPath, {
      userId: USERS.PCR,
      sentiment: true
    });
    
    console.log(chalk.green('✅ Transcription:'), result.text);
    console.log(chalk.green('✅ Confidence:'), result.confidence);
    console.log(chalk.green('✅ Sentiment:'), result.sentiment);
    
    return result;
  } catch (error) {
    console.error(chalk.red('❌ STT Test Failed:'), error.message);
    throw error;
  }
}

// Test TTS functionality
async function testTTS() {
  console.log(chalk.cyan('\nTesting Text-to-Speech...'));
  
  try {
    // Test SirHand voice
    console.log(chalk.yellow('Testing SirHand voice...'));
    const sirHandText = "This is a test of the SirHand voice system. I am your copilot, sir.";
    const sirHandAudio = await speechService.textToSpeech(sirHandText, {
      copilotId: 'copilot-01',
      userId: USERS.PCR
    });
    
    const sirHandPath = path.join(__dirname, 'temp', 'sirhand-output.mp3');
    fs.writeFileSync(sirHandPath, sirHandAudio);
    console.log(chalk.green('✅ SirHand audio generated:'), sirHandPath);
    
    // Test QBLucy voice
    console.log(chalk.yellow('Testing QBLucy voice...'));
    const qbLucyText = "This is a test of the QBLucy voice system. I am your digital assistant.";
    const qbLucyAudio = await speechService.textToSpeech(qbLucyText, {
      copilotId: 'copilot-02',
      userId: USERS.PCR
    });
    
    const qbLucyPath = path.join(__dirname, 'temp', 'qblucy-output.mp3');
    fs.writeFileSync(qbLucyPath, qbLucyAudio);
    console.log(chalk.green('✅ QBLucy audio generated:'), qbLucyPath);
    
    // Test Dream Commander voice
    console.log(chalk.yellow('Testing Dream Commander voice...'));
    const dreamText = "This is a test of the Dream Commander voice system. Welcome to the dreamscape.";
    const dreamAudio = await speechService.textToSpeech(dreamText, {
      copilotId: 'dream-commander',
      userId: USERS.PCR
    });
    
    const dreamPath = path.join(__dirname, 'temp', 'dream-commander-output.mp3');
    fs.writeFileSync(dreamPath, dreamAudio);
    console.log(chalk.green('✅ Dream Commander audio generated:'), dreamPath);
    
    return {
      sirHandPath,
      qbLucyPath,
      dreamPath
    };
  } catch (error) {
    console.error(chalk.red('❌ TTS Test Failed:'), error.message);
    throw error;
  }
}

// Test voice personalization
async function testPersonalization() {
  console.log(chalk.cyan('\nTesting Voice Personalization...'));
  
  try {
    // Set personalization for SirHand
    console.log(chalk.yellow('Setting personalization for SirHand...'));
    const sirHandSettings = {
      pitch: -3.0,
      speakingRate: 0.85,
      gender: 'MALE'
    };
    
    await speechService.setPersonalization(USERS.PCR, 'copilot-01', sirHandSettings);
    console.log(chalk.green('✅ SirHand personalization set'));
    
    // Set personalization for QBLucy
    console.log(chalk.yellow('Setting personalization for QBLucy...'));
    const qbLucySettings = {
      pitch: 1.5,
      speakingRate: 1.2,
      gender: 'FEMALE'
    };
    
    await speechService.setPersonalization(USERS.PCR, 'copilot-02', qbLucySettings);
    console.log(chalk.green('✅ QBLucy personalization set'));
    
    // Test personalized TTS
    console.log(chalk.yellow('Testing personalized voices...'));
    
    // Generate personalized SirHand audio
    const sirHandText = "This is my personalized voice as SirHand.";
    const sirHandAudio = await speechService.textToSpeech(sirHandText, {
      copilotId: 'copilot-01',
      userId: USERS.PCR,
      personalization: true
    });
    
    const sirHandPath = path.join(__dirname, 'temp', 'sirhand-personalized.mp3');
    fs.writeFileSync(sirHandPath, sirHandAudio);
    console.log(chalk.green('✅ Personalized SirHand audio generated:'), sirHandPath);
    
    // Generate personalized QBLucy audio
    const qbLucyText = "This is my personalized voice as QBLucy.";
    const qbLucyAudio = await speechService.textToSpeech(qbLucyText, {
      copilotId: 'copilot-02',
      userId: USERS.PCR,
      personalization: true
    });
    
    const qbLucyPath = path.join(__dirname, 'temp', 'qblucy-personalized.mp3');
    fs.writeFileSync(qbLucyPath, qbLucyAudio);
    console.log(chalk.green('✅ Personalized QBLucy audio generated:'), qbLucyPath);
    
    return {
      sirHandSettings,
      qbLucySettings,
      sirHandPath,
      qbLucyPath
    };
  } catch (error) {
    console.error(chalk.red('❌ Personalization Test Failed:'), error.message);
    throw error;
  }
}

// Test CE scoring
async function testCEScoring() {
  console.log(chalk.cyan('\nTesting CE Scoring...'));
  
  try {
    // Get initial CE score
    console.log(chalk.yellow('Getting initial CE score...'));
    const initialScore = await speechService.getCEScore(USERS.PCR);
    console.log(chalk.green('✅ Initial CE score:'), initialScore);
    
    // Update CE score (positive)
    console.log(chalk.yellow('Updating CE score (positive)...'));
    const positiveUpdate = await speechService.updateCEScore(USERS.PCR, 5, 'Positive test interaction');
    console.log(chalk.green('✅ Updated CE score (positive):'), positiveUpdate);
    
    // Update CE score (negative)
    console.log(chalk.yellow('Updating CE score (negative)...'));
    const negativeUpdate = await speechService.updateCEScore(USERS.PCR, -3, 'Negative test interaction');
    console.log(chalk.green('✅ Updated CE score (negative):'), negativeUpdate);
    
    // Verify final CE score
    console.log(chalk.yellow('Verifying final CE score...'));
    const finalScore = await speechService.getCEScore(USERS.PCR);
    console.log(chalk.green('✅ Final CE score:'), finalScore);
    
    return {
      initialScore,
      positiveUpdate,
      negativeUpdate,
      finalScore
    };
  } catch (error) {
    console.error(chalk.red('❌ CE Scoring Test Failed:'), error.message);
    throw error;
  }
}

// Test Dream Commander
async function testDreamCommander() {
  console.log(chalk.cyan('\nTesting Dream Commander...'));
  
  try {
    // Create Dream Commander session
    console.log(chalk.yellow('Creating Dream Commander session...'));
    const session = await speechService.createDreamCommanderSession(USERS.PCR, {
      minimumCEScore: 0, // Set to 0 for testing
      intensity: 'high'
    });
    console.log(chalk.green('✅ Dream Commander session created:'), session.sessionId);
    
    // Interact with Dream Commander
    console.log(chalk.yellow('Interacting with Dream Commander...'));
    const response1 = await speechService.dreamCommanderInteraction(
      session.sessionId,
      "Hello Dream Commander, I am excited to begin this journey with you."
    );
    console.log(chalk.green('✅ Dream Commander response 1:'), response1.text);
    
    // Second interaction
    const response2 = await speechService.dreamCommanderInteraction(
      session.sessionId,
      "I am feeling uncertain about what we will discover in the dreamscape."
    );
    console.log(chalk.green('✅ Dream Commander response 2:'), response2.text);
    
    // Save Dream Commander responses
    const response1Path = path.join(__dirname, 'temp', 'dream-response-1.mp3');
    fs.writeFileSync(response1Path, response1.audio);
    
    const response2Path = path.join(__dirname, 'temp', 'dream-response-2.mp3');
    fs.writeFileSync(response2Path, response2.audio);
    
    return {
      session,
      response1,
      response2,
      response1Path,
      response2Path
    };
  } catch (error) {
    console.error(chalk.red('❌ Dream Commander Test Failed:'), error.message);
    throw error;
  }
}

// Main test function
async function runTests() {
  console.log(chalk.cyan('\n=== Speech System Test ===\n'));
  
  try {
    // Initialize speech service
    console.log(chalk.yellow('Initializing speech service...'));
    await speechService.initialize();
    console.log(chalk.green('✅ Speech service initialized'));
    
    // Create test audio
    console.log(chalk.yellow('Creating test audio files...'));
    const testAudio = await createTestAudio();
    console.log(chalk.green('✅ Test audio created'));
    
    // Test STT
    const sttResult = await testSTT(testAudio.sirHandPath);
    
    // Test TTS
    const ttsResult = await testTTS();
    
    // Test personalization
    const personalizationResult = await testPersonalization();
    
    // Test CE scoring
    const ceResult = await testCEScoring();
    
    // Test Dream Commander
    const dreamResult = await testDreamCommander();
    
    console.log(chalk.green('\n=== All Tests Passed Successfully ===\n'));
    
    return {
      sttResult,
      ttsResult,
      personalizationResult,
      ceResult,
      dreamResult
    };
  } catch (error) {
    console.error(chalk.red('\n=== Test Failed ===\n'));
    console.error(error);
    process.exit(1);
  }
}

// Run the tests
runTests()
  .then(() => {
    console.log(chalk.green('Tests completed successfully.'));
  })
  .catch((error) => {
    console.error(chalk.red('Tests failed:'), error);
    process.exit(1);
  });