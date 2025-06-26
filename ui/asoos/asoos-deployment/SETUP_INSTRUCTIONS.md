# ASOOS Setup with MCP Integration

Follow these steps to deploy ASOOS with MCP integration:

## 1. Copy files to your web server

Transfer the entire `asoos-gateway-deploy-20250513060608` directory to your web server.

## 2. Install dependencies

```bash
cd asoos-gateway-deploy-20250513060608
npm install express
```

## 3. Start the server

```bash
./start.sh
```

## 4. Configure web server (Nginx/Apache)

### Nginx Configuration Example:

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
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 5. Test the deployment

Visit https://asoos.2100.cool in your browser.

API endpoints to test:

- Gateway Status: https://asoos.2100.cool/api/gateway-status
- API Status: https://asoos.2100.cool/api/status
