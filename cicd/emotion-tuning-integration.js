/**
 * Emotion Tuning Integration Script
 *
 * Integrates the Emotion Tuning System with the Symphony platform and
 * registers it as an available service.
 *
 * Usage: node cicd/emotion-tuning-integration.js [--environment=production|staging]
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const admin = require('firebase-admin');

// Initialize Firebase
if (!admin.apps.length) {
  admin.initializeApp();
}
const firestore = admin.firestore();

// Parse arguments
const args = process.argv.slice(2);
const environment =
  args.find((arg) => arg.startsWith('--environment='))?.split('=')[1] || 'production';

// Configuration
const config = {
  moduleName: 'emotion-tuning',
  version: new Date().toISOString().split('T')[0].replace(/-/g, ''),
  serviceRegistry: 'symphony-services',
  dependencies: ['speech', 'firebase'],
  permissions: ['read', 'write'],
  description: 'Agent emotion tuning system that adjusts message tone based on user preferences',
  author: 'Pilots of Vision Lake',
  entry: {
    service: 'src/services/emotion-tuning/index.js',
    cli: 'commands/copilot/emotion.js',
  },
  environments: {
    production: {
      firestore: {
        collection: 'production_symphony_services',
      },
      gcs: 'gs://aixtiv-symphony-modules/emotion-tuning/production',
      enabled: true,
    },
    staging: {
      firestore: {
        collection: 'staging_symphony_services',
      },
      gcs: 'gs://aixtiv-symphony-modules/emotion-tuning/staging',
      enabled: true,
    },
  },
};

// Main execution
async function main() {
  console.log(`Starting Emotion Tuning integration for ${environment} environment...`);

  try {
    // 1. Register service in Firestore
    await registerService();

    // 2. Upload service manifest to GCS
    await uploadManifest();

    // 3. Create symlinks in Symphony directory structure
    await createSymlinks();

    // 4. Update telemetry configuration
    await updateTelemetry();

    // 5. Enable service in Symphony configuration
    await enableService();

    console.log('Integration completed successfully!');
  } catch (error) {
    console.error('Integration failed:', error);
    process.exit(1);
  }
}

// Register service in Firestore
async function registerService() {
  console.log('Registering service in Firestore...');

  const collection = config.environments[environment].firestore.collection;
  const serviceData = {
    name: config.moduleName,
    version: config.version,
    description: config.description,
    author: config.author,
    dependencies: config.dependencies,
    permissions: config.permissions,
    entry: config.entry,
    enabled: config.environments[environment].enabled,
    created: admin.firestore.FieldValue.serverTimestamp(),
    updated: admin.firestore.FieldValue.serverTimestamp(),
  };

  await firestore.collection(collection).doc(config.moduleName).set(serviceData);
  console.log(`Service registered in ${collection}`);
}

// Upload service manifest to GCS
async function uploadManifest() {
  console.log('Uploading service manifest to GCS...');

  const manifestPath = path.join(__dirname, `${config.moduleName}-manifest.json`);
  const manifest = {
    name: config.moduleName,
    version: config.version,
    description: config.description,
    author: config.author,
    dependencies: config.dependencies,
    entry: config.entry,
    update_timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  const gcsPath = config.environments[environment].gcs;
  await execPromise(`gsutil cp ${manifestPath} ${gcsPath}/manifest.json`);
  console.log(`Manifest uploaded to ${gcsPath}/manifest.json`);
}

// Create symlinks in Symphony directory structure
async function createSymlinks() {
  console.log('Creating symlinks in Symphony directory structure...');

  // Create symlink record in Symphony integration directory
  const symphonicPath = path.join(
    __dirname,
    '..',
    'symphony-configuration',
    'modules',
    config.moduleName
  );

  if (!fs.existsSync(symphonicPath)) {
    fs.mkdirSync(symphonicPath, { recursive: true });
  }

  const linkConfigPath = path.join(symphonicPath, 'links.json');
  const linkConfig = {
    service: path.resolve(__dirname, '..', config.entry.service),
    cli: path.resolve(__dirname, '..', config.entry.cli),
  };

  fs.writeFileSync(linkConfigPath, JSON.stringify(linkConfig, null, 2));
  console.log(`Symlink configuration created at ${linkConfigPath}`);
}

// Update telemetry configuration
async function updateTelemetry() {
  console.log('Updating telemetry configuration...');

  const telemetryConfigPath = path.join(__dirname, '..', 'telemetry', 'telemetry.config.js');

  if (fs.existsSync(telemetryConfigPath)) {
    let telemetryConfig = fs.readFileSync(telemetryConfigPath, 'utf8');

    // Check if emotion tuning is already in the config
    if (!telemetryConfig.includes(`'${config.moduleName}'`)) {
      // Add emotion tuning to the modules array
      telemetryConfig = telemetryConfig.replace(
        /modules:\s*\[([\s\S]*?)\]/,
        `modules: [$1  '${config.moduleName}',\n  ]`
      );

      fs.writeFileSync(telemetryConfigPath, telemetryConfig);
      console.log('Telemetry configuration updated');
    } else {
      console.log('Emotion tuning already configured in telemetry');
    }
  } else {
    console.warn('Telemetry configuration not found, skipping');
  }
}

// Enable service in Symphony configuration
async function enableService() {
  console.log('Enabling service in Symphony configuration...');

  const symphonyConfigPath = path.join(
    __dirname,
    '..',
    'symphony-configuration',
    'configure_agents_aixtiv_v2.sh'
  );

  if (fs.existsSync(symphonyConfigPath)) {
    let symphonyConfig = fs.readFileSync(symphonyConfigPath, 'utf8');

    // Check if emotion tuning is already in the config
    if (!symphonyConfig.includes(`EMOTION_TUNING_ENABLED=`)) {
      // Add emotion tuning to the configuration
      const configLine = `\n# Emotion Tuning System\nEMOTION_TUNING_ENABLED="true"\n`;

      // Insert after the last configuration variable
      symphonyConfig = symphonyConfig.replace(
        /(# Configuration variables[\s\S]*?)(\n\n# )/,
        `$1${configLine}$2`
      );

      fs.writeFileSync(symphonyConfigPath, symphonyConfig);
      console.log('Symphony configuration updated');
    } else {
      console.log('Emotion tuning already configured in Symphony');
    }
  } else {
    console.warn('Symphony configuration not found, skipping');
  }
}

// Helper: Execute shell commands
function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Command execution error: ${error.message}`);
        console.error(`stderr: ${stderr}`);
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
}

// Execute main function
main();
