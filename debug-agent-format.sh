#!/bin/bash

# Create a temporary script to debug agent formats
cat > debug_agent_format.js << 'EOJS'
const fs = require('fs');
const path = require('path');

// Function to get firebase config
function getFirebaseConfig() {
  const homeDir = require('os').homedir();
  const configPath = path.join(homeDir, '.aixtiv', 'firebase-agent-tracking.json');
  
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (error) {
    console.error('Error reading Firebase config:', error);
  }
  
  return null;
}

async function main() {
  try {
    // Try to load firebase admin
    const admin = require('firebase-admin');
    
    // Get the firebase config
    const config = getFirebaseConfig();
    
    if (!config) {
      console.error('Firebase config not found');
      return;
    }
    
    // Initialize firebase
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(config)
      });
    }
    
    // Get the firestore db
    const db = admin.firestore();
    
    // Get all agent actions
    console.log('Fetching agent actions from Firestore...');
    const snapshot = await db.collection('agentActions').orderBy('timestamp', 'desc').limit(50).get();
    
    // Create a map of agent IDs and their statuses
    const agentMap = new Map();
    
    // Process the actions
    snapshot.forEach(doc => {
      const data = doc.data();
      const agentId = data.agent_id;
      
      // Only track unique agent IDs
      if (!agentMap.has(agentId)) {
        agentMap.set(agentId, {
          id: agentId,
          lastAction: data.action_type,
          timestamp: data.timestamp,
        });
      }
    });
    
    // Output the agent information
    console.log('\nAgent Information:');
    console.log('=================');
    
    for (const [id, info] of agentMap.entries()) {
      console.log(`Agent ID: ${id}`);
      console.log(`Last Action: ${info.lastAction}`);
      console.log(`Timestamp: ${info.timestamp}`);
      console.log('---');
    }
    
    console.log('\nTotal unique agents:', agentMap.size);
    
    // Clean up
    await admin.app().delete();
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);
EOJS

# Run the debug script
node debug_agent_format.js

# Clean up
rm debug_agent_format.js
