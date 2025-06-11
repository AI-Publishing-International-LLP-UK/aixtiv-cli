const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

async function testSecretManager() {
  try {
    const client = new SecretManagerServiceClient();
    const projectId = 'api-for-warp-drive';

    console.log('Listing secrets in project...');
    const [secrets] = await client.listSecrets({
      parent: `projects/${projectId}`,
      pageSize: 10,
    });

    if (secrets.length === 0) {
      console.log('No secrets found in the project (or no access)');
    } else {
      console.log(`Found ${secrets.length} secrets. First few:`);
      secrets.slice(0, 3).forEach((secret) => {
        console.log(`- ${secret.name}`);
      });
      console.log('Secret Manager access working correctly\!');
    }
  } catch (error) {
    console.error('Error accessing Secret Manager:', error.message);
  }
}

testSecretManager();
