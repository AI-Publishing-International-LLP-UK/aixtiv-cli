const path = require('path');
const fs = require('fs');
const player = require('play-sound')();
const chalk = require('chalk');
const { parseOptions, withSpinner } = require('../../lib/utils');

// Define paths
const ASSETS_DIR = path.join(__dirname, '../../assets');
const AUDIO_FILE = 'spring0.mp3';
const AUDIO_PATH = path.join(ASSETS_DIR, AUDIO_FILE);

/**
 * Summons Visionary 1 Command Suite with audio and visual effects
 * Creates an immersive experience for Dr. Lucy's interface
 */
/**
 * Ensures assets are installed and available
 * @returns {Promise<boolean>} true if assets are ready, false otherwise
 */
async function ensureAssetsInstalled() {
  try {
    // Check if assets directory exists
    if (!fs.existsSync(ASSETS_DIR)) {
      console.log(chalk.yellow('Creating assets directory...'));
      fs.mkdirSync(ASSETS_DIR, { recursive: true });
    }

    // Check if audio file exists
    if (!fs.existsSync(AUDIO_PATH)) {
      console.log(chalk.yellow(`Audio file ${AUDIO_FILE} not found.`));
      console.log(chalk.yellow('Please place a suitable audio file at: ' + AUDIO_PATH));
      return false;
    }

    return true;
  } catch (error) {
    console.error(chalk.red(`Error installing assets: ${error.message}`));
    return false;
  }
}

module.exports = async function summonVisionary(options) {
  const { silent, installAssets } = parseOptions(options);

  try {
    console.log(chalk.cyan('🌐 Invoking Visionary 1 Command Suite...'));

    // Handle the --install-assets option
    if (installAssets) {
      console.log(chalk.magenta('🔧 Installing/verifying assets...'));
      const assetsReady = await ensureAssetsInstalled();

      if (assetsReady) {
        console.log(chalk.green('✓ Assets successfully installed/verified.'));
      } else {
        console.log(chalk.yellow('⚠️ Asset installation incomplete.'));
        console.log(
          chalk.yellow('You may need to manually copy audio files to the assets directory.')
        );
        console.log(chalk.yellow(`Expected location: ${AUDIO_PATH}`));
      }

      // If only installing assets, exit early
      if (
        process.argv.includes('--install-assets') &&
        process.argv.length === 4 &&
        process.argv[2] === 'summon:visionary'
      ) {
        return;
      }
    }

    console.log(chalk.magenta('💎 Initializing SAO Control Panel...'));
    console.log(chalk.cyan('🌐 Invoking Visionary 1 Command Suite...'));
    console.log(chalk.magenta('💎 Initializing SAO Control Panel...'));

    // Play audio if not in silent mode
    // Play audio if not in silent mode
    if (!silent) {
      try {
        // Verify assets are available before attempting playback
        const assetsReady = await ensureAssetsInstalled();

        if (assetsReady && fs.existsSync(AUDIO_PATH)) {
          // Play the audio file with improved error handling
          player.play(AUDIO_PATH, function (err) {
            if (err) {
              console.error(chalk.red(`⚠️ Audio playback failed: ${err.message}`));
              // Continue execution despite audio failure
            } else {
              console.log(chalk.green('🎶 Welcome aboard, Visionary 1.'));
            }
          });
        } else {
          console.log(chalk.yellow(`⚠️ Audio file not found at: ${AUDIO_PATH}`));
          console.log(chalk.yellow('Run with --install-assets option to set up audio files.'));
          console.log(chalk.yellow('Proceeding without sound.'));
        }
      } catch (error) {
        // Catch any unexpected errors during audio setup/playback
        console.error(chalk.red(`⚠️ Audio system error: ${error.message}`));
        console.log(chalk.yellow('Proceeding without sound.'));
      }
    }
    // Simulate loading with a spinner
    await withSpinner(
      'Loading Visionary 1 Interfaces',
      () => new Promise((resolve) => setTimeout(resolve, 2000))
    );

    // Display welcome messages
    console.log('');
    console.log(chalk.bgCyan.white(' VISIONARY 1 COMMAND SUITE '));
    console.log('');
    console.log(chalk.cyan('🚀 Graphical Control Suite online.'));
    console.log(chalk.blue("🎯 Connected to Dr. Lucy's security protocol."));
    console.log(chalk.green('🧬 Custom themes and abilities now live.'));

    // Complete the sequence
    console.log('');
    console.log(chalk.green('✓ Visionary 1 Portal Active'));
    console.log(chalk.grey('The magic portal is now open.'));
  } catch (error) {
    console.log(chalk.red(`\n✗ Error: ${error.message}`));
    console.log(chalk.red('Stack trace:', error.stack));
    // Return a non-zero exit code for error handling by calling scripts
    process.exitCode = 1;
  }
};
