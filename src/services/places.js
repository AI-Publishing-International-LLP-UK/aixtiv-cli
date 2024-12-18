const {Client} = require('@googlemaps/google-maps-services-js');
const config = require('../config/google-config');

const client = new Client({});

async function localSearch(query, location) {
  try {
    const response = await client.textSearch({
      params: {
        query: query,
        key: config.placesApiKey
      }
    });
    
    return response.data.results;
  } catch (error) {
    console.error('Error performing local search:', error);
    throw error;
  }
}

module.exports = {
  localSearch
};