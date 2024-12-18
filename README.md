# API for Warp Drive

API integration layer for Warp Drive project with GCP services.

## Setup

1. Create a Google Cloud Project
2. Enable required APIs:
   - Custom Search API
   - Places API
3. Create API credentials and download service account key
4. Set environment variables:
   ```bash
   export GOOGLE_CLOUD_PROJECT='your-project-id'
   export GOOGLE_APPLICATION_CREDENTIALS='path/to/service-account-key.json'
   export GOOGLE_CUSTOM_SEARCH_API_KEY='your-custom-search-api-key'
   export GOOGLE_SEARCH_ENGINE_ID='your-search-engine-id'
   export GOOGLE_PLACES_API_KEY='your-places-api-key'
   ```

## Installation

```bash
npm install
```

## Running the Server

```bash
npm start
```

## API Endpoints

### Web Search
POST /api/search
```json
{
  "query": "search term",
  "count": 10
}
```

### Local Search
POST /api/local-search
```json
{
  "query": "pizza near me",
  "location": {
    "lat": 37.7749,
    "lng": -122.4194
  }
}
```