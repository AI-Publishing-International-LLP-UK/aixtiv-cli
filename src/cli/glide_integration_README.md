# Aixtiv CLI Glide Dashboard Integration

This guide provides instructions for integrating the Aixtiv Cards Dashboard with Glide apps.

## Overview

The Aixtiv Card system includes:
1. Card data stored in Firestore
2. React dashboard for displaying and filtering cards
3. Integration options for Glide apps

## Quick Setup Guide

### 1. Import Card Data into Firestore

Choose one of the provided scripts to import Batch 6 (Cards 101-120) into your Firestore database:

#### Node.js Method:
```bash
# Install dependencies
npm install firebase-admin

# Set environment variable to your service account key
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your-service-account-key.json"

# Run the import script
node firestore_import_nodejs.js
```

#### Python Method:
```bash
# Install dependencies
pip install firebase-admin

# Set environment variable to your service account key
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your-service-account-key.json"

# Run the import script
python firestore_import_python.py
```

### 2. Glide Integration Options

#### Option 1: Direct Firestore Integration
Glide can connect directly to your Firestore database:

1. Create a new Glide app
2. Add a new data source and select Firestore
3. Connect to your Firebase project
4. Select the "aixtiv_cards" collection
5. Create views and filters based on this data

#### Option 2: Custom API Endpoint
If you need more control or processing:

1. Deploy the included React components to a hosting service
2. Set up an API endpoint that queries Firestore and returns formatted data
3. Connect Glide to your custom API

#### Option 3: Data Export/Import
For a simpler approach:

1. Export Firestore data to CSV or Google Sheets
2. Connect Glide to this spreadsheet

## Dashboard Customization

The `AixtivGlideDashboard.jsx` component can be customized:

- Modify the card layout in the `return` section
- Add or remove filters in the filter grid
- Customize colors in the `getAgentColor` function
- Add additional functionality to the "Deploy Card" button

## Data Schema

Each card in the Aixtiv system follows this schema:

```javascript
{
  "card_id": "AIX.CASCADE.101",          // Unique identifier
  "title": "Adaptive Prompt Calibration", // Card title
  "category": "Prompt Frameworks > Strategic Execution", // Card category
  "use_case": "Automatically refines prompt parameters based on output quality feedback.", // Use case description
  "agent_benefit": "Improves model output quality over time with minimal human intervention.", // Benefit description
  "tags": ["prompt", "agentic", "automation", "strategy"], // Array of tags
  "assigned_agent": "Dr. Grant", // Assigned agent name
  "status": "converted", // Card status
  "blog_title": "Self-Tuning Prompts: AI That Learns How To Ask", // Blog post title
  "timestamp": "2025-05-12T22:15:30.063539", // Creation timestamp
  "batch_number": 6, // Batch number (added during import)
  "imported_at": [Firestore timestamp] // Import timestamp (added during import)
}
```

## Viewing in Glide

When setting up your Glide app:

1. Create a "Cards" screen using the Collection component
2. Set up filters for:
   - Agent (dropdown)
   - Batch (dropdown)
   - Search (text input)
3. Design each card to show:
   - Title
   - Use case
   - Agent benefit
   - Agent name with color coding
   - Tags as chips

## Need Help?

If you encounter any issues:
1. Check Firebase console for error messages
2. Verify your service account has proper permissions
3. Ensure all fields are properly mapped in Glide

For further assistance, contact the Aixtiv CLI support team.