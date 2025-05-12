/**
 * Aixtiv CLI - Firestore Batch 6 Import Script (Node.js)
 * 
 * This script imports Batch 6 (Cards 101-120) into Firestore.
 * 
 * Prerequisites:
 * 1. Firebase Admin SDK installed: npm install firebase-admin
 * 2. Service account credentials JSON file
 * 3. Proper permissions to write to Firestore
 * 
 * Usage:
 * 1. Set the GOOGLE_APPLICATION_CREDENTIALS environment variable to point to your service account file
 * 2. Run with: node firestore_import_nodejs.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK (uses GOOGLE_APPLICATION_CREDENTIALS env var)
admin.initializeApp();
const db = admin.firestore();

// Path to the Batch 6 JSON file
const batchFilePath = path.join(__dirname, 'aixtiv_cascade_batch_6.json');

async function importBatch6() {
  try {
    // Read the batch file
    const batchData = JSON.parse(fs.readFileSync(batchFilePath, 'utf8'));
    console.log(`Loaded ${batchData.length} cards from Batch 6 file`);

    // Create a batch operation
    const batch = db.batch();

    // Reference to the collection
    const cardsCollection = db.collection('aixtiv_cards');

    // Add each card to the batch
    batchData.forEach(card => {
      // Create a document reference with the card_id
      const docRef = cardsCollection.doc(card.card_id);
      
      // Add server timestamp
      const cardWithTimestamp = {
        ...card,
        imported_at: admin.firestore.FieldValue.serverTimestamp(),
        batch_number: 6
      };
      
      // Set the document data
      batch.set(docRef, cardWithTimestamp);
      
      console.log(`Added card ${card.card_id} - ${card.title} to batch`);
    });

    // Commit the batch
    await batch.commit();
    console.log('Batch 6 import completed successfully!');

    // Optional: Create a batch record
    await db.collection('aixtiv_batches').doc('batch_6').set({
      batch_number: 6,
      cards_count: batchData.length,
      import_date: admin.firestore.FieldValue.serverTimestamp(),
      status: 'imported',
      cards_range: 'AIX.CASCADE.101-AIX.CASCADE.120'
    });
    
    console.log('Batch record created');

  } catch (error) {
    console.error('Error importing Batch 6:', error);
  } finally {
    // Properly close the Firebase Admin connection
    admin.app().delete();
  }
}

// Run the import
importBatch6();