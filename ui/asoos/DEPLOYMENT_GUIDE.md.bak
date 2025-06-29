# ASOOS UI Deployment Guide

This guide provides comprehensive instructions for deploying the ASOOS (Aixtiv Symphony Orchestrating OS) UI application to the asoos.2100.cool domain with MCP integration.

## Overview

The ASOOS UI is a sophisticated interface built with modern web technologies including:

- React for component-based UI
- Framer Motion for advanced animations
- Three.js for 3D effects
- Chart.js for data visualization
- GSAP for enhanced animations
- Integration Gateway for API key management

## Deployment Package

The deployment package (`asoos-gateway-deploy-20250513060608.zip`) contains everything needed to run the application:

- **Front-end UI**: Enhanced HTML/CSS/JS interface with advanced animations
- **Server Component**: Express.js server for serving the UI and API endpoints
- **Integration Gateway**: Configuration for connecting to the MCP gateway
- **Setup Scripts**: Scripts for easy deployment and configuration

## Deployment Steps

### 1. Prepare Your Web Server

Ensure your web server meets these requirements:

- Node.js v14+ installed
- HTTPS certificate for asoos.2100.cool domain
- Outbound access to the Integration Gateway at us-west1-api-for-warp-drive.cloudfunctions.net

### 2. Deploy the Application

Transfer the deployment package to your web server:

```bash
# On your local machine
scp asoos-gateway-deploy-20250513060608.zip user@your-server:/path/to/deployment/

# On the server
cd /path/to/deployment/
unzip asoos-gateway-deploy-20250513060608.zip
cd asoos-gateway-deploy-20250513060608
npm install express
chmod +x start.sh
```

### 3. Configure Web Server

#### Nginx Configuration

```nginx
server {
    listen 80;
    server_name asoos.2100.cool;

    # Redirect HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name asoos.2100.cool;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Static files
    location / {
        root /path/to/asoos-gateway-deploy-20250513060608/public;
        try_files $uri @nodejs;
    }

    # Node.js API proxy
    location @nodejs {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Apache Configuration

```apache
<VirtualHost *:80>
    ServerName asoos.2100.cool
    Redirect permanent / https://asoos.2100.cool/
</VirtualHost>

<VirtualHost *:443>
    ServerName asoos.2100.cool

    SSLEngine on
    SSLCertificateFile /path/to/cert.pem
    SSLCertificateKeyFile /path/to/key.pem

    DocumentRoot /path/to/asoos-gateway-deploy-20250513060608/public

    <Directory /path/to/asoos-gateway-deploy-20250513060608/public>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    ProxyPreserveHost On
    ProxyPass / http://localhost:3002/
    ProxyPassReverse / http://localhost:3002/
</VirtualHost>
```

### 4. Start the Application

Start the application server:

```bash
./start.sh
```

For production deployment, consider using a process manager like PM2:

```bash
npm install -g pm2
pm2 start gateway-server.js --name asoos-ui
pm2 save
pm2 startup
```

### 5. Test the Deployment

1. Open your browser and navigate to https://asoos.2100.cool
2. Check that the application loads correctly
3. Test API endpoints:
   - Gateway Status: https://asoos.2100.cool/api/gateway-status
   - API Status: https://asoos.2100.cool/api/status

## Integration Gateway Details

The ASOOS UI integrates with the Model Context Protocol (MCP) through an Integration Gateway. This gateway:

- Manages API keys for secure communication
- Handles key rotation and expiration
- Connects to the Claude AI model through Anthropic's API
- Supports Symphony integration in zero-drift mode

Configuration for the gateway is stored in `mcp-config.json`:

```json
{
  "domain": "asoos.2100.cool",
  "gateway": {
    "endpoint": "https://us-west1-api-for-warp-drive.cloudfunctions.net/integration-gateway",
    "serviceId": "asoos-ui",
    "clientId": "asoos-2100-cool"
  },
  "claude": {
    "modelProvider": "anthropic",
    "modelName": "claude-3-5-sonnet",
    "maxTokens": 4096
  },
  "symphony": {
    "mode": "zero-drift",
    "alwaysOn": true,
    "bondedAgent": true
  }
}
```

## Troubleshooting

### Connection Issues

If the application cannot connect to the Integration Gateway:

1. Verify network connectivity to the gateway endpoint
2. Check that the gateway service is running in GCP us-west1
3. Review server logs for connection errors
4. Ensure the correct environment variables are set

### UI Issues

If the UI is not rendering correctly:

1. Check browser console for JavaScript errors
2. Verify that all static assets are being served correctly
3. Ensure that the browser supports the required features (WebGL, etc.)
4. Try clearing browser cache or using incognito mode

## Security Considerations

1. Always use HTTPS for the domain
2. Keep the Node.js server and dependencies updated
3. Do not expose the Integration Gateway endpoint publicly
4. Regularly rotate API keys using the gateway's key rotation feature

## Next Steps

After successful deployment, consider these next steps:

1. Set up monitoring for the application using CloudWatch or similar
2. Configure automated backups
3. Implement logging for better debugging
4. Set up a CI/CD pipeline for future updates

## Support

For any issues or questions, contact the ASOOS development team.
