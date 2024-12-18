const config = {
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  customSearchApiKey: process.env.GOOGLE_CUSTOM_SEARCH_API_KEY,
  searchEngineId: process.env.GOOGLE_SEARCH_ENGINE_ID,
  placesApiKey: process.env.GOOGLE_PLACES_API_KEY
};

module.exports = config;