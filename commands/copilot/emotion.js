/**
 * Copilot Emotion Tuning Command
 * 
 * CLI interface for the Agent Emotion Tuning System
 * Phase II implementation for "Agent emotion tuner – softens or sharpens tone based on user preference."
 *
 * (c) 2025 Copyright AI Publishing International LLP All Rights Reserved.
 * Developed with assistance from the Pilots of Vision Lake.
 */

const { Command } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const { v4: uuidv4 } = require('uuid');
const emotionService = require('../../src/services/emotion-tuning');
const auth = require('../../lib/auth');
const { displayError } = require('../../lib/debug-display');

const command = new Command('emotion');
command.description('Manage copilot emotional tone preferences');

/**
 * Get and display user tone preferences
 */
command
  .command('preferences')
  .description('View your emotional tone preferences')
  .action(async function() {
    try {
      const userId = await auth.getUserId();
      const spinner = ora('Loading emotional tone preferences...').start();
      
      await emotionService.initialize();
      const preferences = await emotionService.getUserPreferences(userId);
      
      spinner.stop();
      
      console.log('\n' + chalk.bold('Your Emotional Tone Preferences:'));
      console.log(`Primary Tone: ${chalk.cyan(preferences.primaryTone)}`);
      console.log(`Tone Intensity: ${chalk.cyan(preferences.toneIntensity)}/10`);
      console.log(`Contextual Tone Adjustment: ${preferences.contextualToneEnabled ? chalk.green('Enabled') : chalk.red('Disabled')}`);
      
      if (Object.keys(preferences.domainSpecificTones).length > 0) {
        console.log('\n' + chalk.bold('Domain-Specific Tones:'));
        for (const [domain, settings] of Object.entries(preferences.domainSpecificTones)) {
          console.log(`${chalk.yellow(domain)}: ${settings.tone} (Intensity: ${settings.intensity}/10)`);
        }
      }
      
      if (preferences.customToneRules && preferences.customToneRules.length > 0) {
        console.log('\n' + chalk.bold('Custom Tones:'));
        for (const tone of preferences.customToneRules) {
          console.log(`${chalk.yellow(tone.name)}: ${tone.description}`);
        }
      }
    } catch (error) {
      displayError('Failed to retrieve emotional tone preferences', error);
    }
  });

/**
 * Update user tone preferences
 */
command
  .command('set')
  .description('Set your emotional tone preferences')
  .action(async function() {
    try {
      const userId = await auth.getUserId();
      const spinner = ora('Loading available tones...').start();
      
      await emotionService.initialize();
      const availableTones = emotionService.getAvailableTones();
      const currentPreferences = await emotionService.getUserPreferences(userId);
      
      spinner.stop();
      
      const choices = Object.entries(availableTones).map(([tone, details]) => ({
        name: `${tone} - ${details.description}`,
        value: tone
      }));
      
      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'primaryTone',
          message: 'Select your preferred emotional tone:',
          choices,
          default: currentPreferences.primaryTone
        },
        {
          type: 'number',
          name: 'toneIntensity',
          message: 'Set tone intensity (1-10):',
          default: currentPreferences.toneIntensity,
          validate: value => (value >= 1 && value <= 10) ? true : 'Please enter a number between 1 and 10'
        },
        {
          type: 'confirm',
          name: 'contextualToneEnabled',
          message: 'Allow contextual tone adjustment based on conversation?',
          default: currentPreferences.contextualToneEnabled
        }
      ]);
      
      const updateSpinner = ora('Updating tone preferences...').start();
      
      await emotionService.updateUserPreferences(userId, {
        primaryTone: answers.primaryTone,
        toneIntensity: answers.toneIntensity,
        contextualToneEnabled: answers.contextualToneEnabled
      });
      
      updateSpinner.succeed('Tone preferences updated successfully');
      
      console.log('\n' + chalk.green('Your copilot will now use a') + 
                  chalk.cyan(` ${answers.primaryTone} `) + 
                  chalk.green(`tone with intensity level ${answers.toneIntensity}/10`));
      
      if (answers.contextualToneEnabled) {
        console.log(chalk.yellow('Contextual tone adjustment is enabled. Your copilot may adjust its tone based on conversation context.'));
      } else {
        console.log(chalk.yellow('Contextual tone adjustment is disabled. Your copilot will always use your preferred tone.'));
      }
    } catch (error) {
      displayError('Failed to update emotional tone preferences', error);
    }
  });

/**
 * Test tone adjustment on a sample message
 */
command
  .command('preview')
  .description('Preview how tone adjustment affects a message')
  .action(async function() {
    try {
      const userId = await auth.getUserId();
      
      await emotionService.initialize();
      const availableTones = emotionService.getAvailableTones();
      const currentPreferences = await emotionService.getUserPreferences(userId);
      
      const toneChoices = Object.entries(availableTones).map(([tone, details]) => ({
        name: `${tone} - ${details.description}`,
        value: tone
      }));
      
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'message',
          message: 'Enter a message to preview tone adjustment:',
          validate: value => value.length > 0 ? true : 'Please enter a message'
        },
        {
          type: 'list',
          name: 'toneType',
          message: 'Select the tone to apply:',
          choices: toneChoices,
          default: currentPreferences.primaryTone
        },
        {
          type: 'number',
          name: 'intensity',
          message: 'Set tone intensity (1-10):',
          default: currentPreferences.toneIntensity,
          validate: value => (value >= 1 && value <= 10) ? true : 'Please enter a number between 1 and 10'
        }
      ]);
      
      const previewSpinner = ora('Generating tone-adjusted preview...').start();
      
      const result = await emotionService.adjustTone(
        answers.message,
        answers.toneType,
        answers.intensity,
        { userId }
      );
      
      previewSpinner.stop();
      
      console.log('\n' + chalk.bold('Original Message:'));
      console.log(answers.message);
      
      console.log('\n' + chalk.bold(`Adjusted Message (${answers.toneType}, intensity: ${answers.intensity}/10):`));
      console.log(chalk.cyan(result.adjustedMessage));
      
      if (result.originalSentiment) {
        console.log('\n' + chalk.dim(`Original message sentiment: ${result.originalSentiment.category} (${result.originalSentiment.score.toFixed(2)})`));
      }
      
      // Ask for feedback on the adjustment
      const feedbackAnswer = await inquirer.prompt([
        {
          type: 'list',
          name: 'feedback',
          message: 'How was the tone adjustment?',
          choices: [
            { name: 'Helpful - Improved the message', value: 'helpful' },
            { name: 'Too strong - Overemphasized the tone', value: 'too-strong' },
            { name: 'Too weak - Not enough tone change', value: 'too-weak' },
            { name: 'Wrong tone - Used inappropriate tone', value: 'wrong-tone' }
          ]
        },
        {
          type: 'input',
          name: 'comment',
          message: 'Any additional comments? (optional)',
          default: ''
        }
      ]);
      
      const feedbackSpinner = ora('Submitting feedback...').start();
      
      await emotionService.submitFeedback(
        result.id,
        userId,
        feedbackAnswer.feedback,
        feedbackAnswer.comment
      );
      
      feedbackSpinner.succeed('Thank you for your feedback!');
    } catch (error) {
      displayError('Failed to preview tone adjustment', error);
    }
  });

/**
 * Suggest a tone based on a message
 */
command
  .command('suggest')
  .description('Get a tone suggestion based on a message')
  .action(async function() {
    try {
      const userId = await auth.getUserId();
      
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'message',
          message: 'Enter a message to get a tone suggestion:',
          validate: value => value.length > 0 ? true : 'Please enter a message'
        },
        {
          type: 'input',
          name: 'domain',
          message: 'Enter the conversation domain/topic (optional):',
          default: ''
        }
      ]);
      
      const spinner = ora('Analyzing message and suggesting tone...').start();
      
      await emotionService.initialize();
      const suggestion = await emotionService.suggestTone(answers.message, {
        userId,
        domain: answers.domain || undefined
      });
      
      spinner.stop();
      
      console.log('\n' + chalk.bold('Tone Suggestion:'));
      console.log(`Recommended tone: ${chalk.cyan(suggestion.tone)}`);
      console.log(`Recommended intensity: ${chalk.cyan(suggestion.intensity)}/10`);
      console.log(`\n${chalk.dim(suggestion.explanation)}`);
      
      if (suggestion.intent) {
        console.log(chalk.dim(`Detected intent: ${suggestion.intent}`));
      }
      
      if (suggestion.sentiment) {
        console.log(chalk.dim(`Message sentiment: ${suggestion.sentiment.category} (${suggestion.sentiment.score.toFixed(2)})`));
      }
      
      // Ask if user wants to apply this tone to their preferences
      const confirmAnswer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'applyTone',
          message: 'Would you like to apply this tone to your preferences?',
          default: false
        }
      ]);
      
      if (confirmAnswer.applyTone) {
        const updateSpinner = ora('Updating tone preferences...').start();
        
        await emotionService.updateUserPreferences(userId, {
          primaryTone: suggestion.tone,
          toneIntensity: suggestion.intensity
        });
        
        updateSpinner.succeed('Tone preferences updated successfully');
      }
    } catch (error) {
      displayError('Failed to suggest tone', error);
    }
  });

/**
 * Create a custom tone
 */
command
  .command('custom')
  .description('Create a custom emotional tone')
  .action(async function() {
    try {
      const userId = await auth.getUserId();
      
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Enter a name for your custom tone:',
          validate: value => value.length > 0 ? true : 'Please enter a name'
        },
        {
          type: 'input',
          name: 'description',
          message: 'Enter a description for your custom tone:',
          validate: value => value.length > 0 ? true : 'Please enter a description'
        },
        {
          type: 'input',
          name: 'keywords',
          message: 'Enter keywords to add, separated by commas:',
          validate: value => value.length > 0 ? true : 'Please enter at least one keyword'
        },
        {
          type: 'list',
          name: 'sentenceStructure',
          message: 'Select a sentence structure style:',
          choices: [
            { name: 'Balanced - Mix of simple and complex sentences', value: 'balanced' },
            { name: 'Complex - More formal, structured sentences', value: 'complex' },
            { name: 'Simple - Short, direct sentences', value: 'simple' },
            { name: 'Direct - Concise and to-the-point', value: 'direct' },
            { name: 'Exclamatory - Enthusiastic with emphasis', value: 'exclamatory' }
          ],
          default: 'balanced'
        }
      ]);
      
      // Parse keywords
      const keywords = answers.keywords.split(',').map(k => k.trim()).filter(k => k.length > 0);
      
      const toneDefinition = {
        description: answers.description,
        keywords: {
          add: keywords,
          replace: [] // User-defined replacements would require a more complex UI
        },
        sentenceStructure: answers.sentenceStructure
      };
      
      const spinner = ora('Creating custom tone...').start();
      
      await emotionService.initialize();
      await emotionService.addCustomTone(userId, answers.name, toneDefinition);
      
      spinner.succeed('Custom tone created successfully');
      
      console.log('\n' + chalk.green(`Your custom tone "${answers.name}" has been created and added to your preferences.`));
      console.log(chalk.yellow('Note: Custom tones can be selected just like built-in tones when using the emotion set command.'));
    } catch (error) {
      displayError('Failed to create custom tone', error);
    }
  });

/**
 * Set domain-specific tone
 */
command
  .command('domain')
  .description('Set tone preferences for specific domains/topics')
  .action(async function() {
    try {
      const userId = await auth.getUserId();
      const spinner = ora('Loading available tones...').start();
      
      await emotionService.initialize();
      const availableTones = emotionService.getAvailableTones();
      const currentPreferences = await emotionService.getUserPreferences(userId);
      
      spinner.stop();
      
      const toneChoices = Object.entries(availableTones).map(([tone, details]) => ({
        name: `${tone} - ${details.description}`,
        value: tone
      }));
      
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'domain',
          message: 'Enter the domain/topic name:',
          validate: value => value.length > 0 ? true : 'Please enter a domain name'
        },
        {
          type: 'list',
          name: 'tone',
          message: 'Select the tone to use for this domain:',
          choices: toneChoices
        },
        {
          type: 'number',
          name: 'intensity',
          message: 'Set tone intensity (1-10):',
          default: 5,
          validate: value => (value >= 1 && value <= 10) ? true : 'Please enter a number between 1 and 10'
        }
      ]);
      
      const updateSpinner = ora('Updating domain-specific tone...').start();
      
      // Update domain-specific tones
      const domainSpecificTones = {
        ...currentPreferences.domainSpecificTones,
        [answers.domain]: {
          tone: answers.tone,
          intensity: answers.intensity
        }
      };
      
      await emotionService.updateUserPreferences(userId, {
        domainSpecificTones
      });
      
      updateSpinner.succeed('Domain-specific tone updated successfully');
      
      console.log('\n' + chalk.green(`Your copilot will now use a ${answers.tone} tone with intensity level ${answers.intensity}/10 for the domain "${answers.domain}".`));
      console.log(chalk.yellow('Note: Contextual tone adjustment must be enabled for domain-specific tones to take effect.'));
    } catch (error) {
      displayError('Failed to set domain-specific tone', error);
    }
  });

module.exports = command;