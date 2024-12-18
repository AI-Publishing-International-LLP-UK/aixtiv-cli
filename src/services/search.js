const { getSearchConfig } = require('../config/search-config');

async function searchContent(query) {
  console.log('Starting Google search for:', query);
  try {
    const config = await getSearchConfig();
    const url = `https://www.googleapis.com/customsearch/v1?key=${config.apiKey}&cx=${config.searchEngineId}&q=${encodeURIComponent(query)}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      console.error('Google Search API Error:', data.error);
      throw new Error(data.error.message);
    }
    
    return data;
  } catch (error) {
    console.error('Search error:', error);
    throw error;
  }
}

module.exports = { searchContent };
