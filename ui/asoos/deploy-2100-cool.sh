#!/bin/bash

# ASOOS UI Deployment Script for asoos.2100.cool
# This script deploys the ASOOS UI to asoos.2100.cool domain

echo "🚀 Starting ASOOS UI deployment to asoos.2100.cool"

# Step 1: Environment setup
echo "🔍 Setting up environment..."
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
DEPLOY_DIR="/tmp/asoos-2100-deploy-${TIMESTAMP}"
SOURCE_DIR=$(pwd)
TARGET_DOMAIN="asoos.2100.cool"

# Step 2: Create deployment package
echo "📦 Creating deployment package..."
mkdir -p $DEPLOY_DIR
cp -R $SOURCE_DIR/* $DEPLOY_DIR

# Step 3: Build optimized assets
echo "🔨 Building optimized assets..."
cd $DEPLOY_DIR

# Update environment configuration
echo "const BUILD_ENV = 'production';" > $DEPLOY_DIR/public/env.js
echo "const BUILD_TIMESTAMP = '${TIMESTAMP}';" >> $DEPLOY_DIR/public/env.js
echo "const TARGET_DOMAIN = '${TARGET_DOMAIN}';" >> $DEPLOY_DIR/public/env.js

# Step A standard build would run:
# npm run build

# Step 4: Create .htaccess file for Apache (if needed)
echo "📄 Creating server configuration files..."
cat > $DEPLOY_DIR/public/.htaccess << EOF
# .htaccess file for $TARGET_DOMAIN
RewriteEngine On

# Redirect all traffic to HTTPS
RewriteCond %{HTTPS} off
RewriteRule (.*) https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]

# Serve the ASOOS UI
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /index.html [L,QSA]

# Security headers
Header set X-Content-Type-Options "nosniff"
Header set X-Frame-Options "SAMEORIGIN"
Header set X-XSS-Protection "1; mode=block"
Header set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://api.2100.cool;"
Header set Referrer-Policy "strict-origin-when-cross-origin"

# Cache control
<FilesMatch "\.(html|htm)$">
  Header set Cache-Control "max-age=0, no-cache, no-store, must-revalidate"
</FilesMatch>
<FilesMatch "\.(js|css|json)$">
  Header set Cache-Control "max-age=31536000, public"
</FilesMatch>
<FilesMatch "\.(jpg|jpeg|png|gif|ico|svg|webp)$">
  Header set Cache-Control "max-age=31536000, public"
</FilesMatch>
EOF

# Create web.config for IIS (if needed)
cat > $DEPLOY_DIR/public/web.config << EOF
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="React Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
            <add input="{REQUEST_URI}" pattern="^/(api)" negate="true" />
          </conditions>
          <action type="Rewrite" url="/" />
        </rule>
      </rules>
    </rewrite>
    <httpProtocol>
      <customHeaders>
        <add name="X-Content-Type-Options" value="nosniff" />
        <add name="X-Frame-Options" value="SAMEORIGIN" />
        <add name="X-XSS-Protection" value="1; mode=block" />
        <add name="Content-Security-Policy" value="default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://api.2100.cool;" />
        <add name="Referrer-Policy" value="strict-origin-when-cross-origin" />
      </customHeaders>
    </httpProtocol>
    <staticContent>
      <clientCache cacheControlMode="UseMaxAge" cacheControlMaxAge="365.00:00:00" />
    </staticContent>
  </system.webServer>
</configuration>
EOF

# Step 5: Update HTML to include proper domain references
echo "🔄 Updating domain references..."
sed -i '' "s/asoos.aixtiv-symphony.com/$TARGET_DOMAIN/g" $DEPLOY_DIR/public/index.html
sed -i '' "s/staging.asoos.aixtiv-symphony.com/$TARGET_DOMAIN/g" $DEPLOY_DIR/public/index.html

# Step 6: Prepare deployment files
echo "📦 Preparing files for deployment to $TARGET_DOMAIN..."
DEPLOY_PACKAGE="$SOURCE_DIR/asoos-2100-deploy-${TIMESTAMP}.zip"
cd $DEPLOY_DIR
zip -r $DEPLOY_PACKAGE public

# Step 7: Deploy instructions
echo "🚢 Deployment package created: $DEPLOY_PACKAGE"
echo ""
echo "✅ To deploy to $TARGET_DOMAIN:"
echo ""
echo "1. Upload the deployment package to your web server"
echo "   scp $DEPLOY_PACKAGE user@your-server:/path/to/uploads/"
echo ""
echo "2. Extract the files to your web root directory"
echo "   ssh user@your-server 'unzip /path/to/uploads/asoos-2100-deploy-${TIMESTAMP}.zip -d /var/www/$TARGET_DOMAIN/'"
echo ""
echo "3. Verify the deployment"
echo "   Visit https://$TARGET_DOMAIN in your browser"
echo ""
echo "🔧 You may need to adjust your web server configuration to properly serve the site"

# Step 8: Local testing option
echo ""
echo "🧪 For local testing before deployment:"
echo "1. Start a local server: cd $DEPLOY_DIR && npx serve -s public -l 3002"
echo "2. Visit http://localhost:3002 in your browser"
echo ""
echo "🎉 Deployment preparation complete!"