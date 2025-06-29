/**
 * Basic Speech Service Test
 *
 * This script tests the core speech functionality without requiring the full CLI.
 * It provides a more straightforward way to verify that the speech service
 * is properly working.
 *
 * Run with: node test/speech-test.js
 */

const fs = require('fs');
const path = require('path');
const speechService = require('../src/services/speech');

// Set up test parameters
const TEST_CONFIG = {
  outputDir: path.join(__dirname, 'output'),
  testText:
    'This is a test of the speech system. If you can hear this message, the text-to-speech functionality is working correctly.',
  testAudio: path.join(__dirname, 'output', 'test-audio.mp3'),
  userId: 'test-user-' + Date.now(),
  copilotId: 'test-copilot-' + Date.now(),
};

// Make sure output directory exists
if (!fs.existsSync(TEST_CONFIG.outputDir)) {
  fs.mkdirSync(TEST_CONFIG.outputDir, { recursive: true });
}

/**
 * Run the test suite
 */
async function runTests() {
  console.log('🧪 Running Speech Service Tests');
  console.log('===============================');

  try {
    // Test 1: Initialize the speech service
    console.log('\n1. Testing service initialization');
    await speechService.initialize();
    console.log('✅ Speech service initialized successfully');

    // Test 2: Test text-to-speech
    console.log('\n2. Testing text-to-speech');
    const ttsOptions = {
      userId: TEST_CONFIG.userId,
      copilotId: TEST_CONFIG.copilotId,
      pitch: 0,
      rate: 1.0,
      gender: 'FEMALE', // Using FEMALE instead of NEUTRAL which is not supported
    };

    const audioContent = await speechService.textToSpeech(TEST_CONFIG.testText, ttsOptions);

    if (audioContent && Buffer.isBuffer(audioContent) && audioContent.length > 0) {
      fs.writeFileSync(TEST_CONFIG.testAudio, audioContent);
      console.log(`✅ Text-to-speech test passed - Audio saved to ${TEST_CONFIG.testAudio}`);
    } else {
      console.log('❌ Text-to-speech test failed - Invalid or empty audio content returned');
    }

    // Test 3: Test sentiment analysis
    console.log('\n3. Testing sentiment analysis');

    const positiveText = 'I love how amazing and wonderful this system is working!';
    const negativeText = "This system is frustrating and doesn't work properly at all.";
    const neutralText = 'This is a simple test of the sentiment analysis functionality.';

    const positiveSentiment = await speechService.analyzeSentiment(positiveText);
    const negativeSentiment = await speechService.analyzeSentiment(negativeText);
    const neutralSentiment = await speechService.analyzeSentiment(neutralText);

    if (positiveSentiment && negativeSentiment && neutralSentiment) {
      console.log(`✅ Sentiment analysis test passed`);
      console.log(
        `   - Positive text sentiment: ${positiveSentiment.sentiment} (${positiveSentiment.score.toFixed(2)})`
      );
      console.log(
        `   - Negative text sentiment: ${negativeSentiment.sentiment} (${negativeSentiment.score.toFixed(2)})`
      );
      console.log(
        `   - Neutral text sentiment: ${neutralSentiment.sentiment} (${neutralSentiment.score.toFixed(2)})`
      );
    } else {
      console.log('❌ Sentiment analysis test failed');
    }

    // Test 4: Test voice personalization
    console.log('\n4. Testing voice personalization');

    const personalizationSettings = {
      pitch: -2.0,
      speakingRate: 0.9,
      gender: 'MALE', // MALE is supported
      name: 'en-US-Neural2-D', // Correct voice name for MALE gender
    };

    const success = await speechService.setPersonalization(
      TEST_CONFIG.userId,
      TEST_CONFIG.copilotId,
      personalizationSettings
    );

    if (success) {
      console.log('✅ Voice personalization test passed - Settings saved successfully');

      // Retrieve the settings to verify
      const settings = await speechService.getPersonalization(
        TEST_CONFIG.userId,
        TEST_CONFIG.copilotId
      );
      console.log('   - Retrieved settings:', JSON.stringify(settings));

      // Generate personalized audio
      const personalizedText = 'This is a test with personalized voice settings.';
      const personalizedAudio = await speechService.textToSpeech(personalizedText, {
        userId: TEST_CONFIG.userId,
        copilotId: TEST_CONFIG.copilotId,
        personalization: true,
      });

      if (personalizedAudio && Buffer.isBuffer(personalizedAudio)) {
        const personalizedAudioPath = path.join(TEST_CONFIG.outputDir, 'personalized-audio.mp3');
        fs.writeFileSync(personalizedAudioPath, personalizedAudio);
        console.log(`   - Personalized audio saved to ${personalizedAudioPath}`);
      }
    } else {
      console.log('❌ Voice personalization test failed');
    }

    // Summary
    console.log('\n🎉 Basic Speech Service Test Complete');
    console.log(
      'Check the generated audio files in the test/output directory to verify TTS functionality'
    );
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
  }
}

// Run the tests
runTests().catch((err) => {
  console.error('Test script failed:', err);
  process.exit(1);
});
