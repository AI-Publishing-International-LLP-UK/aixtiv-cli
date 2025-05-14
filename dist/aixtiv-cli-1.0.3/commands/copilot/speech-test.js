/**
 * Speech Test Command
 * 
 * A simple command to test the speech service functionality without requiring complex setup.
 * This is primarily for testing and troubleshooting the speech integration.
 * 
 * Usage:
 *   aixtiv copilot:speech-test
 */

const { Command } = require('commander');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const speechService = require('../../src/services/speech');

const command = new Command('speech-test')
  .description('Test the Speech-to-Text and Text-to-Speech functionality')
  .option('--gender <gender>', 'Voice gender (MALE or FEMALE)', 'FEMALE')
  .option('--text <text>', 'Text to synthesize', 'This is a test of the speech system. If you can hear this message, the text-to-speech functionality is working correctly.')
  .option('--output <path>', 'Output file path for the generated audio', path.join(process.cwd(), 'speech-test.mp3'))
  .option('--sentiment', 'Include sentiment analysis test', false)
  .action(async (options) => {
    console.log(chalk.bold.blue('🔊 Speech Service Test'));
    console.log(chalk.blue('====================='));
    
    try {
      // Step 1: Initialize the speech service
      console.log(chalk.yellow('\n1. Initializing speech service...'));
      await speechService.initialize();
      console.log(chalk.green('✓ Speech service initialized successfully'));
      
      // Step 2: Test text-to-speech
      console.log(chalk.yellow('\n2. Testing text-to-speech...'));
      
      const ttsOptions = {
        userId: 'test-user',
        copilotId: 'test-copilot',
        gender: options.gender,
        pitch: 0,
        rate: 1.0
      };
      
      console.log(`   Text: "${options.text}"`);
      console.log(`   Voice gender: ${ttsOptions.gender}`);
      
      const audioContent = await speechService.textToSpeech(options.text, ttsOptions);
      
      if (audioContent && Buffer.isBuffer(audioContent) && audioContent.length > 0) {
        fs.writeFileSync(options.output, audioContent);
        console.log(chalk.green(`✓ Text-to-speech test passed - Audio saved to ${options.output}`));
      } else {
        console.log(chalk.red('✗ Text-to-speech test failed - Invalid or empty audio content returned'));
      }
      
      // Step 3: Test sentiment analysis if requested
      if (options.sentiment) {
        console.log(chalk.yellow('\n3. Testing sentiment analysis...'));
        
        const positiveText = "I love how amazing and wonderful this system is working!";
        const negativeText = "This system is frustrating and doesn't work properly at all.";
        const neutralText = "This is a simple test of the sentiment analysis functionality.";
        
        const positiveSentiment = await speechService.analyzeSentiment(positiveText);
        const negativeSentiment = await speechService.analyzeSentiment(negativeText);
        const neutralSentiment = await speechService.analyzeSentiment(neutralText);
        
        if (positiveSentiment && negativeSentiment && neutralSentiment) {
          console.log(chalk.green('✓ Sentiment analysis test passed'));
          console.log(`   - Positive text sentiment: ${positiveSentiment.sentiment} (${positiveSentiment.score.toFixed(2)})`);
          console.log(`   - Negative text sentiment: ${negativeSentiment.sentiment} (${negativeSentiment.score.toFixed(2)})`);
          console.log(`   - Neutral text sentiment: ${neutralSentiment.sentiment} (${neutralSentiment.score.toFixed(2)})`);
        } else {
          console.log(chalk.red('✗ Sentiment analysis test failed'));
        }
      }
      
      // Summary
      console.log(chalk.bold.green('\n🎉 Speech Service Test Complete'));
      console.log(`To play the generated audio, use your system's audio player to open: ${options.output}`);
      
    } catch (error) {
      console.error(chalk.red('\n✗ Test failed with error:'), error.message);
      console.error(chalk.gray(error.stack));
      process.exit(1);
    }
  });

module.exports = command;