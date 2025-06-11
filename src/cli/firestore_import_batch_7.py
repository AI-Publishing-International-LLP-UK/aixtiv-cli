#!/usr/bin/env python3
"""
Aixtiv CLI - Firestore Batch 7 Import Script (Python)

This script imports Batch 7 (Cards 121-135) into Firestore.
It focuses on Phase III: Agent Autonomy + Platform Automation.

Prerequisites:
1. Firebase Admin SDK for Python installed: pip install firebase-admin
2. Service account credentials JSON file
3. Proper permissions to write to Firestore

Usage:
1. Set the GOOGLE_APPLICATION_CREDENTIALS environment variable to point to your service account file
2. Run with: python firestore_import_batch_7.py
"""

import json
import os
import datetime
from pathlib import Path
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore

def import_batch_7():
    """Import Batch 7 cards (Phase III) into Firestore"""
    
    # Path to the current script directory
    script_dir = Path(__file__).parent
    
    # Path to the Batch 7 JSON file
    batch_file_path = script_dir / 'aixtiv_cascade_batch_7.json'
    
    # Initialize Firebase Admin SDK (uses GOOGLE_APPLICATION_CREDENTIALS env var)
    firebase_admin.initialize_app()
    
    # Get Firestore client
    db = firestore.client()
    
    try:
        # Read the batch file
        with open(batch_file_path, 'r') as file:
            batch_data = json.load(file)
        
        print(f"Loaded {len(batch_data)} cards from Batch 7 file")
        
        # Reference to the collection
        cards_collection = db.collection('aixtiv_cards')
        
        # Create batched write operation
        batch = db.batch()
        
        # Add each card to the batch
        for card in batch_data:
            # Create a document reference with the card_id
            doc_ref = cards_collection.document(card['card_id'])
            
            # Add server timestamp and batch number
            card['imported_at'] = firestore.SERVER_TIMESTAMP
            card['batch_number'] = 7
            
            # Set the document data
            batch.set(doc_ref, card)
            
            print(f"Added card {card['card_id']} - {card['title']} to batch")
        
        # Commit the batch
        batch.commit()
        print("Batch 7 import completed successfully!")
        
        # Create a batch record
        batch_record = {
            'batch_number': 7,
            'cards_count': len(batch_data),
            'import_date': firestore.SERVER_TIMESTAMP,
            'status': 'imported',
            'cards_range': 'AIX.CASCADE.121-AIX.CASCADE.135',
            'phase': 'Phase III: Agent Autonomy + Platform Automation'
        }
        
        db.collection('aixtiv_batches').document('batch_7').set(batch_record)
        print("Batch record created")
        
    except Exception as e:
        print(f"Error importing Batch 7: {e}")

if __name__ == "__main__":
    import_batch_7()