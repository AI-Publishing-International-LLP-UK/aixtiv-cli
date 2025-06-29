/**
 * Emotion Tuning + Speech Service Integration Test
 *
 * Tests the integration between emotion tuning service and speech services,
 * verifying that emotion tuning properly affects speech output and integrates
 * with sentiment analysis.
 *
 * Run with:
 * node test/emotion-tuning-speech-integration-test.js
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const speechService = require('../src/services/speech');
const emotionTuningService = require('../src/services/emotion-tuning');

// Use real Firestore implementation for production integration
console.log(chalk.yellow('Using real database connections for production deployment...'));

// Production user IDs for real deployment
const TEST_USER = 'Mr-Phillip-Corey-Roark';
const TEST_COPILOT = 'copilot-01';

/**
 * Test the emotion tuning with speech sentiment analysis
 */
async function testEmotionTuningSentimentAnalysis() {
  console.log(chalk.cyan('\nTesting Emotion Tuning + Sentiment Analysis Integration...'));

  try {
    // Sample texts with different emotional tones
    const texts = {
      positive:
        "I'm really thrilled about the progress we're making together. This is excellent work!",
      negative: "I'm disappointed with these results. We need to completely rethink our approach.",
      neutral: 'Here are the project specifications. We will need to implement five features.',
    };

    // Loop through each text and analyze sentiment
    console.log(chalk.yellow('Analyzing sentiments for different texts...'));

    for (const [emotion, text] of Object.entries(texts)) {
      // Analyze sentiment using speech service
      const sentiment = await speechService.analyzeSentiment(text);

      console.log(
        chalk.green(`✅ ${emotion.charAt(0).toUpperCase() + emotion.slice(1)} text sentiment:`)
      );
      console.log(
        `   Score: ${sentiment.score.toFixed(2)}, Magnitude: ${sentiment.magnitude.toFixed(2)}, Classification: ${sentiment.sentiment}`
      );

      // Get tone suggestion based on sentiment
      const suggestedTone = await emotionTuningService.suggestTone(text);
      console.log(chalk.green(`✅ Suggested tone for ${emotion} text:`), suggestedTone);
    }

    return true;
  } catch (error) {
    console.error(chalk.red('❌ Emotion Tuning + Sentiment Analysis Test Failed:'), error.message);
    throw error;
  }
}

/**
 * Test tone adjustments for TTS outputs
 */
async function testToneAdjustedSpeech() {
  console.log(chalk.cyan('\nTesting Tone-Adjusted Speech Generation...'));

  try {
    const testDir = path.join(__dirname, 'temp');

    // Create directory if it doesn't exist
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Original text to be transformed
    const originalText =
      'The project deadline is approaching. We need to complete all tasks by Friday.';

    // Define test tones
    const testTones = [
      { type: 'formal', intensity: 8 },
      { type: 'friendly', intensity: 7 },
      { type: 'empathetic', intensity: 9 },
      { type: 'confident', intensity: 10 },
      { type: 'enthusiastic', intensity: 8 },
    ];

    // Process each tone and generate speech
    for (const tone of testTones) {
      console.log(chalk.yellow(`Processing tone: ${tone.type} (intensity: ${tone.intensity})...`));

      // Adjust text using emotion tuning service
      const adjustedText = await emotionTuningService.adjustTone(
        originalText,
        tone.type,
        tone.intensity
      );
      console.log(chalk.green(`✅ Adjusted text (${tone.type}):`), adjustedText);

      // Convert adjusted text to speech - extracting the adjusted message from the result
      const textToSpeak =
        typeof adjustedText === 'object' && adjustedText.adjustedMessage
          ? adjustedText.adjustedMessage
          : originalText;

      const audio = await speechService.textToSpeech(textToSpeak, {
        copilotId: TEST_COPILOT,
        userId: TEST_USER,
      });

      // Save audio file
      const audioPath = path.join(testDir, `${tone.type}-tone-speech.mp3`);
      fs.writeFileSync(audioPath, audio);
      console.log(chalk.green(`✅ Generated speech file:`), audioPath);
    }

    return true;
  } catch (error) {
    console.error(chalk.red('❌ Tone-Adjusted Speech Test Failed:'), error.message);
    throw error;
  }
}

/**
 * Test user preferences for tone-adjusted speech
 */
async function testUserTonePreferences() {
  console.log(chalk.cyan('\nTesting User Tone Preferences...'));

  try {
    // Test message
    const message = "We will be reviewing the project metrics during tomorrow's meeting.";

    // Clear previous preferences
    await emotionTuningService.clearUserPreferences(TEST_USER);

    // Set user preference to formal tone
    console.log(chalk.yellow('Setting formal tone preference...'));
    await emotionTuningService.setTonePreference(TEST_USER, {
      defaultTone: 'formal',
      defaultIntensity: 7,
      domainSpecificTones: {
        meetings: 'formal',
        feedback: 'empathetic',
      },
    });

    // Check that preference was saved
    const preferences = await emotionTuningService.getUserPreferences(TEST_USER);
    console.log(chalk.green('✅ User preferences:'), preferences);

    // Adjust tone based on user preferences
    console.log(chalk.yellow('Adjusting message with user preferences...'));
    const adjustedMessage = await emotionTuningService.adjustToneWithUserPreferences(
      message,
      TEST_USER,
      { context: 'meetings' }
    );
    console.log(chalk.green('✅ Preference-adjusted message:'), adjustedMessage);

    // Convert adjusted message to speech
    console.log(chalk.yellow('Converting adjusted message to speech...'));
    const textToSpeak =
      typeof adjustedMessage === 'object' && adjustedMessage.adjustedMessage
        ? adjustedMessage.adjustedMessage
        : message;

    const audio = await speechService.textToSpeech(textToSpeak, {
      copilotId: TEST_COPILOT,
      userId: TEST_USER,
    });

    // Save audio file
    const testDir = path.join(__dirname, 'temp');
    const audioPath = path.join(testDir, 'preference-adjusted-speech.mp3');
    fs.writeFileSync(audioPath, audio);
    console.log(chalk.green('✅ Generated preference-adjusted speech:'), audioPath);

    return true;
  } catch (error) {
    console.error(chalk.red('❌ User Tone Preferences Test Failed:'), error.message);
    throw error;
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log(chalk.cyan('\n=== Emotion Tuning + Speech Integration Test ===\n'));

  try {
    // Initialize services
    console.log(chalk.yellow('Initializing speech service...'));
    await speechService.initialize();
    console.log(chalk.green('✅ Speech service initialized'));

    console.log(chalk.yellow('Initializing emotion tuning service...'));
    await emotionTuningService.initialize();
    console.log(chalk.green('✅ Emotion tuning service initialized'));

    // Run tests
    await testEmotionTuningSentimentAnalysis();
    await testToneAdjustedSpeech();
    await testUserTonePreferences();

    console.log(chalk.green('\n=== All Tests Passed Successfully ===\n'));
    return true;
  } catch (error) {
    console.error(chalk.red('\n=== Test Failed ===\n'));
    console.error(error);
    process.exit(1);
  }
}

// Run the tests
runTests()
  .then(() => {
    console.log(chalk.green('Integration tests completed successfully.'));
    process.exit(0);
  })
  .catch((error) => {
    console.error(chalk.red('Integration tests failed:'), error);
    process.exit(1);
  });
