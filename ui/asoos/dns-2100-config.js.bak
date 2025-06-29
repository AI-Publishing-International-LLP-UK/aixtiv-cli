#!/usr/bin/env node

/**
 * ASOOS DNS Configuration for 2100.cool domain
 *
 * This script configures DNS records to point the asoos.2100.cool domain
 * to our newly deployed ASOOS UI.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration variables
const CONFIG = {
  domain: 'asoos.2100.cool',
  ip: '34.120.45.67', // Replace with actual server IP when deploying
  cloudflare: true,
  firebase: true,
};

// Generate DNS configuration
function generateDnsConfig() {
  const timestamp = new Date().toISOString();

  console.log(`🌐 Generating DNS configuration for ${CONFIG.domain}...`);

  const dnsConfig = {
    timestamp,
    domain: CONFIG.domain,
    records: [
      {
        type: 'A',
        name: CONFIG.domain,
        value: CONFIG.ip,
        ttl: 3600,
        priority: null,
      },
      {
        type: 'CNAME',
        name: `www.${CONFIG.domain}`,
        value: CONFIG.domain,
        ttl: 3600,
        priority: null,
      },
      {
        type: 'TXT',
        name: CONFIG.domain,
        value: 'v=spf1 include:_spf.google.com ~all',
        ttl: 3600,
        priority: null,
      },
    ],
  };

  if (CONFIG.firebase) {
    dnsConfig.records.push({
      type: 'TXT',
      name: CONFIG.domain,
      value: 'firebase-site-verification=abc123defghijklmn', // Replace with actual verification code
      ttl: 3600,
      priority: null,
    });
  }

  return dnsConfig;
}

// Generate zone file content
function generateZoneFile(dnsConfig) {
  const domain = dnsConfig.domain;
  const records = dnsConfig.records;

  let zoneContent = `; Zone file for ${domain}\n`;
  zoneContent += `; Generated: ${dnsConfig.timestamp}\n\n`;
  zoneContent += `$ORIGIN ${domain}.\n`;
  zoneContent += `$TTL 3600\n\n`;

  records.forEach((record) => {
    const name = record.name === domain ? '@' : record.name.replace(`.${domain}`, '');
    const priority = record.priority ? `${record.priority} ` : '';

    zoneContent += `${name} ${record.ttl} IN ${record.type} ${priority}${record.value}\n`;
  });

  return zoneContent;
}

// Generate .htaccess for redirect if needed
function generateHtaccess() {
  return `# .htaccess for ${CONFIG.domain}
RewriteEngine On

# Redirect all traffic to HTTPS
RewriteCond %{HTTPS} off
RewriteRule (.*) https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]

# Serve the ASOOS UI
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /index.html [L,QSA]
`;
}

// Main execution
const dnsConfig = generateDnsConfig();
const zoneFileContent = generateZoneFile(dnsConfig);
const htaccessContent = generateHtaccess();

// Write configuration files
const outputDir = path.join(__dirname, 'dns-2100-config');
fs.mkdirSync(outputDir, { recursive: true });

fs.writeFileSync(path.join(outputDir, 'dns-config.json'), JSON.stringify(dnsConfig, null, 2));

fs.writeFileSync(path.join(outputDir, 'zone-file.txt'), zoneFileContent);

fs.writeFileSync(path.join(outputDir, '.htaccess'), htaccessContent);

console.log(`✅ DNS configuration files created in ${outputDir}`);
console.log(`✅ DNS configuration for ${CONFIG.domain} is ready`);
console.log('');
console.log('🚀 To apply this configuration:');
console.log('');
console.log('1. Update DNS records at your domain registrar or DNS provider:');
console.log(`   - Add an A record pointing ${CONFIG.domain} to ${CONFIG.ip}`);
console.log(`   - Add a CNAME record pointing www.${CONFIG.domain} to ${CONFIG.domain}`);
console.log('');
console.log('2. Upload this .htaccess file to your web server if needed for redirects');
