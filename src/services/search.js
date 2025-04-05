const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const fetch = require('node-fetch');

class SearchService {
  constructor() {
    this.client = new SecretManagerServiceClient();
    this.projectId = 'api-for-warp-drive';
  }

  async getCredentials() {
    try {
      const [apiKeyVersion] = await this.client.accessSecretVersion({
        name: `projects/${this.projectId}/secrets/google_custom_search_config/versions/latest`
      });
      const [engineIdVersion] = await this.client.accessSecretVersion({
        name: `projects/${this.projectId}/secrets/google_search_engine_id/versions/latest`
      });

      return {
        apiKey: apiKeyVersion.payload.data.toString('utf8'),
        searchEngineId: engineIdVersion.payload.data.toString('utf8')
      };
    } catch (error) {
      console.error('Credential retrieval error:', error);
      throw new Error('Failed to retrieve search credentials');
    }
  }

  async searchWeb(query, options = {}) {
    const {
      resultType = 'web',
      dateRestrict,
      exactTerms,
      excludeTerms,
      fileType,
      sort = 'relevance'
    } = options;

    try {
      const credentials = await this.getCredentials();
      const params = new URLSearchParams({
        key: credentials.apiKey,
        cx: credentials.searchEngineId,
        q: query,
        searchType: resultType,
        sort: sort
      });

      if (dateRestrict) params.append('dateRestrict', dateRestrict);
      if (exactTerms) params.append('exactTerms', exactTerms);
      if (excludeTerms) params.append('excludeTerms', excludeTerms);
      if (fileType) params.append('fileType', fileType);

      const response = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      return data;
    } catch (error) {
      console.error('Search execution error:', error);
      throw error;
    }
  }

  async multiSearch(query, searchTypes) {
    try {
      const results = {};
      for (const searchType of searchTypes) {
        results[searchType] = await this.searchWeb(query, { resultType: searchType });
      }
      return results;
    } catch (error) {
      console.error('Multi-search error:', error);
      throw error;
    }
  }
}

module.exports = new SearchService();