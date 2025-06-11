#!/usr/bin/env node

/**
 * Firestore Collection Listing Script
 * 
 * This script initializes the Firebase Admin SDK with a service account key
 * and lists all collections and their contents from Firestore.
 * 
 * Usage:
 *   node list-collections.js [--collection <collection-name>] [--limit <number>]
 * 
 * Options:
 *   --collection  List documents only from a specific collection
 *   --limit       Limit the number of documents displayed per collection (default: 10)
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
let specificCollection = null;
let limit = 10;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--collection' && i + 1 < args.length) {
    specificCollection = args[i + 1];
    i++;
  } else if (args[i] === '--limit' && i + 1 < args.length) {
    limit = parseInt(args[i + 1], 10);
    i++;
  }
}

// Path to service account key file
const serviceAccountKeyPath = path.resolve('./firebase-adminsdk-key.json');

// Check if service account key file exists
if (!fs.existsSync(serviceAccountKeyPath)) {
  console.error('Error: Service account key file not found at', serviceAccountKeyPath);
  console.error('Please ensure the file exists at the specified location.');
  process.exit(1);
}

// Initialize Firebase Admin with the service account key
try {
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountKeyPath)),
    // Ensure we're using the us-west1 region
    storageBucket: 'api-for-warp-drive.appspot.com',
    databaseURL: 'https://api-for-warp-drive.firebaseio.com',
  });

  console.log('🔥 Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK:', error);
  process.exit(1);
}

// Get Firestore database instance
const db = admin.firestore();

// Configure Firestore to use us-west1
db.settings({
  timestampsInSnapshots: true,
  host: 'firestore.googleapis.com',
  ssl: true,
});

/**
 * Format a Firestore document for display
 * @param {Object} doc Firestore document
 * @returns {Object} Formatted document
 */
function formatDocument(doc) {
  const data = doc.data();
  
  // Format timestamps for readability
  Object.keys(data).forEach(key => {
    if (data[key] && typeof data[key].toDate === 'function') {
      data[key] = data[key].toDate().toISOString();
    }
  });
  
  return {
    id: doc.id,
    ...data
  };
}

/**
 * List all collections and their documents
 */
async function listAllCollections() {
  try {
    console.log('\n📊 Firestore Collections and Documents:');
    console.log('='.repeat(60));

    // Get all collections
    const collections = await db.listCollections();
    
    if (collections.length === 0) {
      console.log('No collections found in Firestore.');
      process.exit(0);
    }

    // Process specific collection if requested
    if (specificCollection) {
      const collection = db.collection(specificCollection);
      await listCollectionDocuments(collection, specificCollection);
      process.exit(0);
    }

    // Process all collections
    for (const collection of collections) {
      const collectionName = collection.id;
      await listCollectionDocuments(collection, collectionName);
    }

    console.log('\n✅ Done listing Firestore collections and documents');
  } catch (error) {
    console.error('Error listing collections:', error);
    process.exit(1);
  }
}

/**
 * List documents in a specific collection
 * @param {Object} collection Firestore collection
 * @param {string} collectionName Collection name
 */
async function listCollectionDocuments(collection, collectionName) {
  try {
    console.log(`\n📁 Collection: ${collectionName}`);
    console.log('-'.repeat(60));

    // Get documents with limit
    const snapshot = await collection.limit(limit).get();
    
    if (snapshot.empty) {
      console.log('   No documents found in this collection.');
      return;
    }

    let count = 0;
    
    // Display each document
    snapshot.forEach(doc => {
      console.log(`   📄 Document ID: ${doc.id}`);
      console.log('   📝 Data:');
      
      const formattedData = formatDocument(doc);
      // Pretty print document data with indentation
      console.log('   ' + JSON.stringify(formattedData, null, 3).replace(/\n/g, '\n   '));
      console.log('-'.repeat(60));
      count++;
    });

    // Get total count of documents in the collection
    const totalCount = (await collection.count().get()).data().count;
    
    console.log(`   Displayed ${count} of ${totalCount} total documents in this collection`);
    
    // Check for subcollections
    for (const doc of snapshot.docs) {
      const subcollections = await doc.ref.listCollections();
      if (subcollections.length > 0) {
        console.log(`   📚 Document ${doc.id} has subcollections:`);
        subcollections.forEach(subcoll => {
          console.log(`      - ${subcoll.id}`);
        });
      }
    }
  } catch (error) {
    console.error(`Error listing documents in collection ${collectionName}:`, error);
  }
}

// Execute the main function
listAllCollections().catch(error => {
  console.error('Error executing script:', error);
  process.exit(1);
});

