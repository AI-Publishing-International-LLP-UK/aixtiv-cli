/**
 * Copilot Preview Command
 *
 * This module provides commands for the Copilot response preview panel,
 * showing "this is what the agent sees" transparency feature from Phase II.
 *
 * (c) 2025 Copyright AI Publishing International LLP All Rights Reserved.
 * Developed with assistance from the Pilots of Vision Lake.
 */

const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');
const boxen = require('boxen');
const { parseOptions, withSpinner } = require('../../lib/utils');
const previewService = require('../../src/services/copilot-preview');
const speechService = require('../../src/services/speech');

/**
 * Preview command handler
 * @param {object} options - Command line options
 */
module.exports = async function previewCommand(options) {
  const { action, userId, copilotId, message, response, previewId, feedback, editedText } =
    parseOptions(options);

  // Validate input
  if (!action) {
    showHelp();
    return;
  }

  try {
    // Initialize preview service
    await previewService.initialize();

    switch (action) {
      case 'create':
        await createPreview(userId, copilotId, message, response, options);
        break;

      case 'get':
        await getPreview(previewId);
        break;

      case 'approve':
        await approvePreview(previewId, options);
        break;

      case 'request-changes':
        await requestChanges(previewId, feedback, options);
        break;

      case 'edit':
        await editPreview(previewId, editedText);
        break;

      case 'settings':
        await manageSettings(userId, options);
        break;

      case 'history':
        await getPreviewHistory(userId, options);
        break;

      case 'submit-feedback':
        await submitFeedback(previewId, userId, options.feedbackType, options.comment);
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
 * Create a new copilot response preview
 * @param {string} userId - User ID
 * @param {string} copilotId - Copilot ID
 * @param {string} message - User's message
 * @param {string} response - Copilot's response
 * @param {object} options - Additional options
 */
async function createPreview(userId, copilotId, message, response, options) {
  if (!userId || !copilotId || !message || !response) {
    console.log(chalk.yellow('Missing required parameters:'));
    console.log('  --userId     User ID');
    console.log('  --copilotId  Copilot ID');
    console.log('  --message    User message');
    console.log('  --response   Copilot response');
    return;
  }

  const spinner = ora('Creating copilot response preview...').start();

  try {
    const preview = await previewService.createPreview(
      userId,
      copilotId,
      message,
      response,
      options
    );

    spinner.succeed('Response preview created successfully');

    // Display preview ID
    console.log('\nPreview Details:');
    console.log(
      boxen(`${chalk.green('Preview ID:')} ${preview.previewId}`, {
        padding: 1,
        borderColor: 'cyan',
        margin: 1,
      })
    );

    // Display the full preview
    await displayPreview(preview.previewId);
  } catch (error) {
    spinner.fail('Failed to create response preview');
    throw error;
  }
}

/**
 * Get preview details
 * @param {string} previewId - Preview ID
 */
async function getPreview(previewId) {
  if (!previewId) {
    console.log(chalk.yellow('Missing required parameter:'));
    console.log('  --previewId  Preview ID');
    return;
  }

  const spinner = ora('Retrieving preview...').start();

  try {
    await displayPreview(previewId);
    spinner.succeed('Preview retrieved successfully');
  } catch (error) {
    spinner.fail('Failed to retrieve preview');
    throw error;
  }
}

/**
 * Approve a preview
 * @param {string} previewId - Preview ID
 * @param {object} options - Approval options
 */
async function approvePreview(previewId, options) {
  if (!previewId) {
    console.log(chalk.yellow('Missing required parameter:'));
    console.log('  --previewId  Preview ID');
    return;
  }

  const spinner = ora('Approving response preview...').start();

  try {
    const updatedPreview = await previewService.approvePreview(previewId, {
      note: options.note,
    });

    spinner.succeed('Response preview approved successfully');

    console.log('\nPreview has been approved:');
    console.log(
      boxen(
        `${chalk.green('Preview ID:')} ${updatedPreview.id}\n` +
          `${chalk.green('Approved At:')} ${updatedPreview.approvedAt.toLocaleString()}\n` +
          (updatedPreview.approvalNote
            ? `${chalk.green('Note:')} ${updatedPreview.approvalNote}`
            : ''),
        { padding: 1, borderColor: 'green', margin: 1 }
      )
    );
  } catch (error) {
    spinner.fail('Failed to approve preview');
    throw error;
  }
}

/**
 * Request changes to a preview
 * @param {string} previewId - Preview ID
 * @param {string} feedback - Feedback for changes
 * @param {object} options - Change request options
 */
async function requestChanges(previewId, feedback, options) {
  if (!previewId || !feedback) {
    console.log(chalk.yellow('Missing required parameters:'));
    console.log('  --previewId  Preview ID');
    console.log('  --feedback   Feedback for changes');
    return;
  }

  const spinner = ora('Requesting changes to response preview...').start();

  try {
    const updatedPreview = await previewService.requestChanges(previewId, feedback, {
      changeOptions: options.changeOptions ? options.changeOptions.split(',') : [],
    });

    spinner.succeed('Change request submitted successfully');

    console.log('\nChange request details:');
    console.log(
      boxen(
        `${chalk.green('Preview ID:')} ${updatedPreview.id}\n` +
          `${chalk.green('Requested At:')} ${updatedPreview.changeRequestedAt.toLocaleString()}\n` +
          `${chalk.green('Feedback:')} ${updatedPreview.feedback}`,
        { padding: 1, borderColor: 'yellow', margin: 1 }
      )
    );
  } catch (error) {
    spinner.fail('Failed to request changes');
    throw error;
  }
}

/**
 * Edit a preview
 * @param {string} previewId - Preview ID
 * @param {string} editedText - Edited response text
 */
async function editPreview(previewId, editedText) {
  if (!previewId || !editedText) {
    console.log(chalk.yellow('Missing required parameters:'));
    console.log('  --previewId   Preview ID');
    console.log('  --editedText  Edited response text');
    return;
  }

  const spinner = ora('Editing response preview...').start();

  try {
    const updatedPreview = await previewService.editPreview(previewId, editedText);

    spinner.succeed('Response preview edited successfully');

    console.log('\nEdited Preview:');
    console.log(boxen(editedText, { padding: 1, borderColor: 'blue', margin: 1 }));

    console.log('\nPreview has been edited:');
    console.log(
      boxen(
        `${chalk.green('Preview ID:')} ${updatedPreview.id}\n` +
          `${chalk.green('Edited At:')} ${updatedPreview.editedAt.toLocaleString()}`,
        { padding: 1, borderColor: 'blue', margin: 1 }
      )
    );
  } catch (error) {
    spinner.fail('Failed to edit preview');
    throw error;
  }
}

/**
 * Manage user preview settings
 * @param {string} userId - User ID
 * @param {object} options - Settings options
 */
async function manageSettings(userId, options) {
  if (!userId) {
    console.log(chalk.yellow('Missing required parameter:'));
    console.log('  --userId  User ID');
    return;
  }

  // If no specific settings provided, show current settings
  if (
    !options.showEmotionIndicators &&
    !options.showToneSuggestions &&
    !options.showAIThinking &&
    !options.transparencyLevel
  ) {
    const spinner = ora('Retrieving user preview settings...').start();

    try {
      const settings = await previewService.getUserSettings(userId);

      spinner.succeed('User preview settings retrieved successfully');

      console.log('\nCurrent Preview Settings:');
      console.log(
        boxen(
          `${chalk.green('Show Emotion Indicators:')} ${settings.showEmotionIndicators ? 'Enabled' : 'Disabled'}\n` +
            `${chalk.green('Show Tone Suggestions:')} ${settings.showToneSuggestions ? 'Enabled' : 'Disabled'}\n` +
            `${chalk.green('Show AI Thinking:')} ${settings.showAIThinking ? 'Enabled' : 'Disabled'}\n` +
            `${chalk.green('Transparency Level:')} ${settings.transparencyLevel}`,
          { padding: 1, borderColor: 'cyan', margin: 1 }
        )
      );

      // Prompt for settings update
      const update = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'updateSettings',
          message: 'Would you like to update these settings?',
          default: false,
        },
      ]);

      if (update.updateSettings) {
        const answers = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'showEmotionIndicators',
            message: 'Show emotion indicators in previews?',
            default: settings.showEmotionIndicators,
          },
          {
            type: 'confirm',
            name: 'showToneSuggestions',
            message: 'Show tone suggestions in previews?',
            default: settings.showToneSuggestions,
          },
          {
            type: 'confirm',
            name: 'showAIThinking',
            message: 'Show AI thinking process in previews?',
            default: settings.showAIThinking,
          },
          {
            type: 'list',
            name: 'transparencyLevel',
            message: 'Select transparency level:',
            choices: ['low', 'medium', 'high'],
            default: settings.transparencyLevel,
          },
        ]);

        // Update settings
        await updateSettings(userId, answers);
      }

      return settings;
    } catch (error) {
      spinner.fail('Failed to retrieve user preview settings');
      throw error;
    }
  } else {
    // Update settings with provided values
    const newSettings = {};

    if (options.showEmotionIndicators !== undefined) {
      newSettings.showEmotionIndicators = options.showEmotionIndicators === 'true';
    }

    if (options.showToneSuggestions !== undefined) {
      newSettings.showToneSuggestions = options.showToneSuggestions === 'true';
    }

    if (options.showAIThinking !== undefined) {
      newSettings.showAIThinking = options.showAIThinking === 'true';
    }

    if (options.transparencyLevel) {
      newSettings.transparencyLevel = options.transparencyLevel;
    }

    await updateSettings(userId, newSettings);
  }
}

/**
 * Update user preview settings
 * @param {string} userId - User ID
 * @param {object} settings - New settings
 */
async function updateSettings(userId, settings) {
  const spinner = ora('Updating user preview settings...').start();

  try {
    const updatedSettings = await previewService.updateUserSettings(userId, settings);

    spinner.succeed('User preview settings updated successfully');

    console.log('\nUpdated Preview Settings:');
    console.log(
      boxen(
        `${chalk.green('Show Emotion Indicators:')} ${updatedSettings.showEmotionIndicators ? 'Enabled' : 'Disabled'}\n` +
          `${chalk.green('Show Tone Suggestions:')} ${updatedSettings.showToneSuggestions ? 'Enabled' : 'Disabled'}\n` +
          `${chalk.green('Show AI Thinking:')} ${updatedSettings.showAIThinking ? 'Enabled' : 'Disabled'}\n` +
          `${chalk.green('Transparency Level:')} ${updatedSettings.transparencyLevel}`,
        { padding: 1, borderColor: 'green', margin: 1 }
      )
    );

    return updatedSettings;
  } catch (error) {
    spinner.fail('Failed to update user preview settings');
    throw error;
  }
}

/**
 * Get user preview history
 * @param {string} userId - User ID
 * @param {object} options - History options
 */
async function getPreviewHistory(userId, options) {
  if (!userId) {
    console.log(chalk.yellow('Missing required parameter:'));
    console.log('  --userId  User ID');
    return;
  }

  const spinner = ora('Retrieving preview history...').start();

  try {
    const history = await previewService.getPreviewHistory(userId, {
      limit: options.limit ? parseInt(options.limit) : 10,
      copilotId: options.copilotId,
      skipCache: options.skipCache === 'true',
    });

    spinner.succeed(`Retrieved ${history.length} preview items`);

    if (history.length === 0) {
      console.log(chalk.yellow('\nNo preview history found for this user.'));
      return;
    }

    console.log('\nPreview History:');

    history.forEach((item, index) => {
      console.log(
        boxen(
          `${chalk.green('Preview #:')} ${index + 1}\n` +
            `${chalk.green('Preview ID:')} ${item.id}\n` +
            `${chalk.green('Timestamp:')} ${item.timestamp.toLocaleString()}\n` +
            `${chalk.green('Message:')} ${item.userMessage}\n` +
            `${chalk.green('Copilot:')} ${item.copilotId}\n` +
            `${chalk.green('Status:')} ${item.approved ? 'Approved' : item.edited ? 'Edited' : 'Pending'}`,
          { padding: 1, borderColor: 'blue', margin: 1 }
        )
      );
    });

    // Allow selecting a preview to view
    const selectedPreview = await inquirer.prompt([
      {
        type: 'list',
        name: 'previewIndex',
        message: 'Select a preview to view details:',
        choices: history.map((item, index) => ({
          name: `#${index + 1}: ${item.userMessage} (${item.timestamp.toLocaleString()})`,
          value: index,
        })),
      },
    ]);

    // Display selected preview
    await displayPreview(history[selectedPreview.previewIndex].id);
  } catch (error) {
    spinner.fail('Failed to retrieve preview history');
    throw error;
  }
}

/**
 * Submit feedback on a preview
 * @param {string} previewId - Preview ID
 * @param {string} userId - User ID
 * @param {string} feedbackType - Feedback type
 * @param {string} comment - Comment
 */
async function submitFeedback(previewId, userId, feedbackType, comment) {
  if (!previewId || !userId || !feedbackType) {
    console.log(chalk.yellow('Missing required parameters:'));
    console.log('  --previewId     Preview ID');
    console.log('  --userId        User ID');
    console.log(
      '  --feedbackType  Feedback type (helpful, not-helpful, tone-issue, needs-improvement)'
    );
    return;
  }

  const spinner = ora('Submitting feedback...').start();

  try {
    await previewService.submitFeedback(previewId, userId, feedbackType, comment);

    spinner.succeed('Feedback submitted successfully');

    console.log('\nThank you for your feedback!');
    console.log(
      boxen(
        `${chalk.green('Preview ID:')} ${previewId}\n` +
          `${chalk.green('Feedback Type:')} ${feedbackType}\n` +
          (comment ? `${chalk.green('Comment:')} ${comment}` : ''),
        { padding: 1, borderColor: 'green', margin: 1 }
      )
    );
  } catch (error) {
    spinner.fail('Failed to submit feedback');
    throw error;
  }
}

/**
 * Display a preview with all details
 * @param {string} previewId - Preview ID
 */
async function displayPreview(previewId) {
  try {
    const preview = await previewService.getPreview(previewId);

    // Display user message
    console.log('\nUser Message:');
    console.log(boxen(preview.userMessage, { padding: 1, borderColor: 'yellow', margin: 1 }));

    // Display message sentiment if available
    if (preview.messageSentiment) {
      const sentimentColor =
        preview.messageSentiment.category === 'positive'
          ? 'green'
          : preview.messageSentiment.category === 'negative'
            ? 'red'
            : 'yellow';

      console.log('\nMessage Sentiment:');
      console.log(
        boxen(
          `${chalk.bold('Category:')} ${chalk[sentimentColor](preview.messageSentiment.category)}\n` +
            `${chalk.bold('Score:')} ${preview.messageSentiment.score.toFixed(2)}\n` +
            `${chalk.bold('Magnitude:')} ${preview.messageSentiment.magnitude.toFixed(2)}`,
          { padding: 1, borderColor: sentimentColor, margin: 1 }
        )
      );
    }

    // Display AI thinking if available and enabled
    if (preview.aiThinking && preview.settings.showAIThinking) {
      console.log('\nAI Thought Process:');
      console.log(
        boxen(
          `${chalk.bold('Reasoning:')}\n${preview.aiThinking.reasoning}\n\n` +
            `${chalk.bold('Analysis Steps:')}\n` +
            preview.aiThinking.steps
              .map((step) => `• ${chalk.blue(step.step)}: ${step.description}\n  ${step.details}`)
              .join('\n\n') +
            '\n\n' +
            `${chalk.bold('Key Considerations:')}\n` +
            preview.aiThinking.considerations.map((item) => `• ${item}`).join('\n'),
          { padding: 1, borderColor: 'magenta', margin: 1 }
        )
      );
    }

    // Display copilot response
    console.log('\nCopilot Response:');
    console.log(
      boxen(preview.responseText, {
        padding: 1,
        borderColor: preview.approved ? 'green' : preview.edited ? 'blue' : 'cyan',
        margin: 1,
        title: preview.approved ? 'APPROVED' : preview.edited ? 'EDITED' : 'PREVIEW',
        titleAlignment: 'center',
      })
    );

    // Display tone analysis if available
    if (preview.toneAnalysis && preview.settings.showToneSuggestions) {
      console.log('\nTone Analysis:');
      console.log(
        boxen(
          `${chalk.bold('Primary Tone:')} ${preview.toneAnalysis.tone}\n` +
            `${chalk.bold('Confidence:')} ${(preview.toneAnalysis.confidence * 100).toFixed(1)}%`,
          { padding: 1, borderColor: 'blue', margin: 1 }
        )
      );
    }

    // Display status information
    console.log('\nPreview Status:');
    const statusInfo = [];

    statusInfo.push(`${chalk.bold('Preview ID:')} ${preview.id}`);
    statusInfo.push(
      `${chalk.bold('Created:')} ${preview.timestamp ? preview.timestamp.toDate().toLocaleString() : 'Unknown'}`
    );
    statusInfo.push(
      `${chalk.bold('Status:')} ${preview.approved ? 'Approved' : preview.changesRequested ? 'Changes Requested' : preview.edited ? 'Edited' : 'Pending'}`
    );

    if (preview.edited) {
      statusInfo.push(
        `${chalk.bold('Edited:')} ${preview.editedAt ? preview.editedAt.toDate().toLocaleString() : 'Unknown'}`
      );
    }

    if (preview.approved) {
      statusInfo.push(
        `${chalk.bold('Approved:')} ${preview.approvedAt ? preview.approvedAt.toDate().toLocaleString() : 'Unknown'}`
      );
      if (preview.approvalNote) {
        statusInfo.push(`${chalk.bold('Approval Note:')} ${preview.approvalNote}`);
      }
    }

    if (preview.changesRequested) {
      statusInfo.push(
        `${chalk.bold('Changes Requested:')} ${preview.changeRequestedAt ? preview.changeRequestedAt.toDate().toLocaleString() : 'Unknown'}`
      );
      statusInfo.push(`${chalk.bold('Feedback:')} ${preview.feedback}`);
    }

    console.log(
      boxen(statusInfo.join('\n'), {
        padding: 1,
        borderColor: preview.approved ? 'green' : preview.changesRequested ? 'yellow' : 'blue',
        margin: 1,
      })
    );

    return preview;
  } catch (error) {
    console.error(chalk.red('\nFailed to display preview:'), error.message);
    throw error;
  }
}

/**
 * Show help information
 */
function showHelp() {
  console.log(chalk.cyan('\nCopilot Preview Commands:'));
  console.log(`
${chalk.green('Create a response preview:')}
  aixtiv copilot preview --action create --userId <id> --copilotId <id> --message "User message" --response "Copilot response"

${chalk.green('Get a preview:')}
  aixtiv copilot preview --action get --previewId <id>

${chalk.green('Approve a preview:')}
  aixtiv copilot preview --action approve --previewId <id> [--note "Approval note"]

${chalk.green('Request changes to a preview:')}
  aixtiv copilot preview --action request-changes --previewId <id> --feedback "Change feedback" [--changeOptions "tone,clarity,length"]

${chalk.green('Edit a preview:')}
  aixtiv copilot preview --action edit --previewId <id> --editedText "Edited response text"

${chalk.green('Manage preview settings:')}
  aixtiv copilot preview --action settings --userId <id> [--showEmotionIndicators true|false] [--showToneSuggestions true|false] [--showAIThinking true|false] [--transparencyLevel low|medium|high]

${chalk.green('View preview history:')}
  aixtiv copilot preview --action history --userId <id> [--copilotId <id>] [--limit <number>] [--skipCache true|false]

${chalk.green('Submit feedback on a preview:')}
  aixtiv copilot preview --action submit-feedback --previewId <id> --userId <id> --feedbackType <type> [--comment "Feedback comment"]
`);
}
