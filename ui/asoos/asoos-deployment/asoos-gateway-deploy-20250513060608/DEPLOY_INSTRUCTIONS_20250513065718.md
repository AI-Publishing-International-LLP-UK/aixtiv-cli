# ASOOS UI Deployment Instructions
## Build 20250513065718 for asoos.2100.cool

This package contains the ASOOS UI application with CTTT integration.

### Quick Deployment

1. Transfer the deployment package to your server:
   ```
   scp asoos-cttt-deploy-20250513065718.zip user@server:/path/to/deployment/
   ```

2. Extract the package:
   ```
   unzip asoos-cttt-deploy-20250513065718.zip -d asoos-ui
   cd asoos-ui
   ```

3. Install dependencies:
   ```
   npm install --production
   ```

4. Start the application:
   ```
   ./start.sh
   ```

### Web Server Configuration

#### Nginx:
```nginx
server {
    listen 80;
    server_name asoos.2100.cool;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name asoos.2100.cool;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### CTTT Telemetry

This deployment includes CTTT (Comprehensive Testing & Telemetry Tracking)
integration. Telemetry events are sent to: https://us-west1-api-for-warp-drive.cloudfunctions.net/cttt-telemetry

To disable telemetry, set the environment variable:
```
export TELEMETRY_ENABLED=false
```

### Verification

After deployment, verify the application is running correctly:
- Open https://asoos.2100.cool in your browser
- Check the API status: https://asoos.2100.cool/api/status
- Verify gateway connection: https://asoos.2100.cool/api/gateway-status

### Troubleshooting

If you encounter issues:
1. Check the logs: `journalctl -u asoos-ui`
2. Verify the gateway connection
3. Ensure all environment variables are set correctly
4. Check server resources (CPU, memory, disk)

### Contact

For assistance, contact the ASOOS development team.
