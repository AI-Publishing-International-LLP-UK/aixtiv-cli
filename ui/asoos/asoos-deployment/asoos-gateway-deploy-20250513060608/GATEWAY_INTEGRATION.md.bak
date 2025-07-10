# ASOOS Integration Gateway Setup

This document provides instructions for deploying ASOOS UI with the Integration Gateway.

## What is the Integration Gateway?

The Integration Gateway manages API keys and key swapping for the ASOOS application.
It provides a secure way to handle API keys and integration with the Claude API.

## Deployment Steps

1. **Upload this package to your web server**

   - Copy all files to your web root directory for asoos.2100.cool

2. **Set up environment variables**

   ```
   export GATEWAY_ENDPOINT="https://us-west1-api-for-warp-drive.cloudfunctions.net/integration-gateway"
   export NODE_ENV="production"
   export PORT="3002"
   ```

3. **Install dependencies**

   ```
   npm install express
   ```

4. **Start the server**

   ```
   node gateway-server.js
   ```

5. **Set up web server configuration**
   - Configure your web server (Nginx/Apache) to proxy API requests to the Node.js server
   - Serve static files directly from the `public` directory
   - Ensure SSL is properly configured for HTTPS

## Testing the Integration

Once deployed, test the integration with these endpoints:

- **Gateway Status**: `https://asoos.2100.cool/api/gateway-status`
- **API Status**: `https://asoos.2100.cool/api/status`
- **Request Key**: `https://asoos.2100.cool/api/request-key` (POST)

These endpoints should return information about the gateway connection and status.

## Troubleshooting

If you encounter issues with the gateway integration:

1. Verify the GATEWAY_ENDPOINT environment variable is set correctly
2. Check that your web server has outbound access to the gateway endpoint
3. Verify that the gateway service is running in your GCP project
4. Check the server logs for connection errors

For assistance, contact the ASOOS development team.
