# SallyPort Authentication Deployment

This deployment package includes the SallyPort authentication module for ASOOS Gateway.

## Components

- `sallyport-auth.js`: SallyPort authentication module
- `gateway-server.js`: Main gateway server with SallyPort integration
- `mcp-config.json`: MCP configuration

## Deployment Instructions

1. Install dependencies:

   ```
   npm install
   ```

2. Set environment variables in .env or use environment:

   - NODE_ENV: Environment (production, development)
   - PORT: Server port
   - DOMAIN: Service domain
   - SALLYPORT_ENDPOINT: SallyPort API endpoint
   - SALLYPORT_API_KEY: API key for SallyPort (secure)

3. Start the server:
   ```
   node gateway-server.js
   ```

## Deployment Date

Deployed on: 2025-05-13 13:37:40 UTC

## Version

1.0.0
