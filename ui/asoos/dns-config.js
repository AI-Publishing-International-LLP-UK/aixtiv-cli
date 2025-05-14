#!/usr/bin/env node

/**
 * ASOOS DNS Configuration
 * 
 * This script helps configure DNS records to point to the ASOOS UI deployment.
 * It supports both staging and production environments.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration variables
const CONFIG = {
  staging: {
    domain: 'staging.asoos.aixtiv-symphony.com',
    ip: '34.120.45.67', // Example IP - replace with actual Firebase/GCP IP
    cloudflare: true
  },
  production: {
    domain: 'asoos.aixtiv-symphony.com',
    ip: '34.120.45.67', // Example IP - replace with actual Firebase/GCP IP
    cloudflare: true
  }
};

// Command line argument parsing
const args = process.argv.slice(2);
const environment = args[0] || 'staging';
const forceUpdate = args.includes('--force');

if (!['staging', 'production'].includes(environment)) {
  console.error('❌ Error: Environment must be "staging" or "production"');
  process.exit(1);
}

// Generate DNS configuration
function generateDnsConfig(env) {
  const config = CONFIG[env];
  const timestamp = new Date().toISOString();
  
  console.log(`🌐 Generating DNS configuration for ${env} environment...`);
  
  const dnsConfig = {
    timestamp,
    environment: env,
    domain: config.domain,
    records: [
      {
        type: 'A',
        name: config.domain,
        value: config.ip,
        ttl: 3600,
        priority: null
      },
      {
        type: 'CNAME',
        name: `www.${config.domain}`,
        value: config.domain,
        ttl: 3600,
        priority: null
      },
      {
        type: 'TXT',
        name: config.domain,
        value: 'v=spf1 include:_spf.google.com ~all',
        ttl: 3600,
        priority: null
      }
    ]
  };
  
  if (config.cloudflare) {
    dnsConfig.records.push({
      type: 'TXT',
      name: config.domain,
      value: 'cloudflare-verify=abc123defghijklmn', // Replace with actual verification code
      ttl: 3600,
      priority: null
    });
  }
  
  return dnsConfig;
}

// Generate zone file content
function generateZoneFile(dnsConfig) {
  const domain = dnsConfig.domain;
  const records = dnsConfig.records;
  
  let zoneContent = `; Zone file for ${domain}\n`;
  zoneContent += `; Generated: ${dnsConfig.timestamp}\n`;
  zoneContent += `; Environment: ${dnsConfig.environment}\n\n`;
  zoneContent += `$ORIGIN ${domain}.\n`;
  zoneContent += `$TTL 3600\n\n`;
  
  records.forEach(record => {
    const name = record.name === domain ? '@' : record.name.replace(`.${domain}`, '');
    const priority = record.priority ? `${record.priority} ` : '';
    
    zoneContent += `${name} ${record.ttl} IN ${record.type} ${priority}${record.value}\n`;
  });
  
  return zoneContent;
}

// Create DNS provider specific configuration
function createProviderConfig(dnsConfig) {
  // For this example, we'll create configurations for common DNS providers
  
  // 1. Cloudflare configuration
  const cloudflareConfig = {
    zone_id: "your_cloudflare_zone_id", // Replace with actual zone ID
    api_token: "your_cloudflare_api_token", // Should be stored securely
    records: dnsConfig.records.map(record => ({
      type: record.type,
      name: record.name,
      content: record.value,
      ttl: record.ttl,
      priority: record.priority,
      proxied: record.type === 'A' || record.type === 'CNAME'
    }))
  };
  
  // 2. Route53 configuration
  const route53Config = {
    hosted_zone_id: "your_route53_hosted_zone_id", // Replace with actual hosted zone ID
    changes: dnsConfig.records.map(record => ({
      Action: "UPSERT",
      ResourceRecordSet: {
        Name: record.name,
        Type: record.type,
        TTL: record.ttl,
        ResourceRecords: [{ Value: record.value }]
      }
    }))
  };
  
  // 3. GoDaddy configuration
  const godaddyConfig = {
    domain: dnsConfig.domain,
    api_key: "your_godaddy_api_key", // Should be stored securely
    api_secret: "your_godaddy_api_secret", // Should be stored securely
    records: dnsConfig.records.map(record => ({
      type: record.type,
      name: record.name === dnsConfig.domain ? '@' : record.name.replace(`.${dnsConfig.domain}`, ''),
      data: record.value,
      ttl: record.ttl,
      priority: record.priority
    }))
  };
  
  return {
    cloudflare: cloudflareConfig,
    route53: route53Config,
    godaddy: godaddyConfig
  };
}

// Main execution
const dnsConfig = generateDnsConfig(environment);
const zoneFileContent = generateZoneFile(dnsConfig);
const providerConfigs = createProviderConfig(dnsConfig);

// Write configuration files
const outputDir = path.join(__dirname, 'dns-config');
fs.mkdirSync(outputDir, { recursive: true });

fs.writeFileSync(
  path.join(outputDir, `${environment}-dns-config.json`), 
  JSON.stringify(dnsConfig, null, 2)
);

fs.writeFileSync(
  path.join(outputDir, `${environment}-zone-file.txt`), 
  zoneFileContent
);

fs.writeFileSync(
  path.join(outputDir, `${environment}-cloudflare-config.json`), 
  JSON.stringify(providerConfigs.cloudflare, null, 2)
);

fs.writeFileSync(
  path.join(outputDir, `${environment}-route53-config.json`), 
  JSON.stringify(providerConfigs.route53, null, 2)
);

fs.writeFileSync(
  path.join(outputDir, `${environment}-godaddy-config.json`), 
  JSON.stringify(providerConfigs.godaddy, null, 2)
);

console.log(`✅ DNS configuration files created in ${outputDir}`);
console.log(`✅ DNS configuration for ${dnsConfig.domain} is ready`);
console.log('');
console.log('🚀 To apply this configuration:');
console.log('');
console.log('  For Cloudflare:');
console.log(`  curl -X POST "https://api.cloudflare.com/client/v4/zones/[ZONE_ID]/dns_records" \\`);
console.log(`    -H "Authorization: Bearer [API_TOKEN]" \\`);
console.log(`    -H "Content-Type: application/json" \\`);
console.log(`    --data @${path.join(outputDir, environment + '-cloudflare-config.json')}`);
console.log('');
console.log('  For AWS Route53:');
console.log(`  aws route53 change-resource-record-sets \\`);
console.log(`    --hosted-zone-id [HOSTED_ZONE_ID] \\`);
console.log(`    --change-batch file://${path.join(outputDir, environment + '-route53-config.json')}`);
console.log('');
console.log('  For GoDaddy:');
console.log(`  curl -X PUT "https://api.godaddy.com/v1/domains/${dnsConfig.domain}/records" \\`);
console.log(`    -H "Authorization: sso-key [API_KEY]:[API_SECRET]" \\`);
console.log(`    -H "Content-Type: application/json" \\`);
console.log(`    --data @${path.join(outputDir, environment + '-godaddy-config.json')}`);