const {google} = require('googleapis');
const config = require('../config/google-config');

const customsearch = google.customsearch('v1');

async function webSearch(query, count = 10) {
  try {
    const response = await customsearch.cse.list({
      auth: config.customSearchApiKey,
      cx: config.searchEngineId,
      q: query,
      num: count
    });
    
    return response.data.items;
  } catch (error) {
    console.error('Error performing web search:', error);
    throw error;
  }
}

module.exports = {
  webSearch
};