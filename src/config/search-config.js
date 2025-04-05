const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

async function getSearchConfig() {
  const client = new SecretManagerServiceClient();
  const projectId = 'api-for-warp-drive';

  try {
    // Get Google Search credentials only
    const [apiKeyVersion] = await client.accessSecretVersion({
      name: `projects/${projectId}/secrets/google_custom_search_config/versions/latest`
    });
    const [searchEngineIdVersion] = await client.accessSecretVersion({
      name: `projects/${projectId}/secrets/google_search_engine_id/versions/latest`
    });

    return {
      apiKey: apiKeyVersion.payload.data.toString('utf8'),
      searchEngineId: searchEngineIdVersion.payload.data.toString('utf8')
    };
  } catch (error) {
    console.error('Error getting search config:', error);
    throw error;
  }
}

module.exports = { getSearchConfig };
