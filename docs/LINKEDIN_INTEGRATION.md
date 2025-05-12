# LinkedIn Integration with Aixtiv CLI

## Overview

This document describes the LinkedIn integration with the Aixtiv CLI system, providing authentication, profile management, and content sharing capabilities with complete Firestore data synchronization.

## Features

The LinkedIn integration provides the following capabilities:

1. **OAuth2 Authentication**
   - Secure authentication using LinkedIn's OAuth2 API
   - Token management and refresh
   - Controlled scope access

2. **Profile Management**
   - Fetch and store LinkedIn user profiles
   - Synchronize profile data with Firestore
   - Connect multiple LinkedIn accounts

3. **Content Sharing**
   - Share content on personal profiles
   - Post to company pages
   - Schedule posts for future publishing

4. **Organization Management**
   - List and manage company pages
   - Store organization data in Firestore
   - Track user-organization relationships

5. **Data Synchronization**
   - Two-way sync between LinkedIn and Firestore
   - Background data updates
   - Post tracking and analytics

## Integration Points

### Firestore Data Structure

The LinkedIn integration uses the following Firestore collections:

| Collection | Purpose |
|------------|---------|
| `linkedin_profiles` | User LinkedIn profile data |
| `linkedin_profiles/{userId}/posts` | User's LinkedIn posts |
| `linkedin_profiles/{userId}/organizations` | User's LinkedIn organizations |
| `linkedin_organizations` | Global LinkedIn organizations |
| `linkedin_organizations/{orgId}/posts` | Organization LinkedIn posts |
| `linkedin_posts` | All LinkedIn posts (personal and organization) |
| `linkedin_scheduled_posts` | Scheduled posts pending publication |

### User Management

LinkedIn profiles are associated with Aixtiv users through the `users` collection:

```javascript
// User document with LinkedIn data
{
  "id": "user123",
  "linkedInConnected": true,
  "linkedInId": "abc123xyz",
  "linkedInProfileUpdatedAt": Timestamp(...)
}
```

### OAuth2 Integration

LinkedIn authentication leverages the centralized OAuth2 service:

1. Get authorization URL:
   ```javascript
   const authUrl = await linkedInService.getAuthorizationUrl(redirectUri);
   ```

2. Handle the callback:
   ```javascript
   const profile = await linkedInService.handleOAuthCallback(code, redirectUri, userId);
   ```

## Usage Examples

### Authenticate with LinkedIn

```javascript
const linkedInService = require('../services/linkedin');

// Step 1: Generate authorization URL
const authUrl = await linkedInService.getAuthorizationUrl(
  'https://your-app.com/auth/linkedin/callback',
  'random-state-value'
);

// Redirect user to authUrl

// Step 2: Handle callback
const profile = await linkedInService.handleOAuthCallback(
  code,           // from callback query parameter
  redirectUri,    // same as in step 1
  'user123'       // the user ID
);
```

### Share Content on LinkedIn

```javascript
const linkedInService = require('../services/linkedin');

// Share on personal profile
const result = await linkedInService.shareContent(
  'user123',
  {
    text: 'Check out this amazing article!',
    title: 'New Insights on AI',
    linkUrl: 'https://example.com/article',
    imageUrl: 'https://example.com/image.jpg',
    linkDescription: 'Learn the latest about AI innovations'
  }
);

// Share on company page
const orgResult = await linkedInService.shareToCompanyPage(
  'user123',
  'organization456',
  {
    text: 'Exciting news from our company!',
    title: 'Company Announcement',
    linkUrl: 'https://company.example.com/news',
    imageUrl: 'https://company.example.com/logo.jpg',
    linkDescription: 'Learn about our latest product release'
  }
);
```

### Schedule a Post for Future Publishing

```javascript
const linkedInService = require('../services/linkedin');

const scheduledPostId = await linkedInService.schedulePost(
  'user123',
  {
    text: 'This will be posted tomorrow!',
    title: 'Scheduled Announcement',
    linkUrl: 'https://example.com/future',
  },
  new Date(Date.now() + 86400000), // Tomorrow
  null // Personal profile (or provide organization ID for company page)
);
```

### Synchronize LinkedIn Data

```javascript
const linkedInService = require('../services/linkedin');

// Sync user's LinkedIn data with Firestore
const syncResults = await linkedInService.synchronizeData('user123');
```

## Security Considerations

1. **Token Storage**
   - OAuth2 tokens are stored securely using the centralized OAuth2 service
   - Access tokens are short-lived and refreshed automatically
   - Refresh tokens are stored with proper encryption

2. **Permission Management**
   - Users must explicitly authorize required scopes
   - Firestore security rules protect LinkedIn data
   - Access is revoked when requested by the user

3. **Data Privacy**
   - Only authorized users can access their own LinkedIn data
   - Organization data is shared only with authorized members
   - Data is encrypted at rest in Firestore

## Implementation Notes

1. The LinkedIn API has rate limits (approx. 100 requests per day per user)
2. Organization access requires admin permission on the company page
3. Image uploads require additional processing outside this service
4. LinkedIn API changes should be monitored as they can impact functionality

## Future Enhancements

1. Analytics integration for post performance
2. Integration with LinkedIn Learning API
3. Job posting and application tracking
4. Campaign management and reporting
5. LinkedIn Sales Navigator integration

(c) 2025 Copyright AI Publishing International LLP All Rights Reserved.
Developed with assistance from the Pilots of Vision Lake and
Claude Code Generator. This is Human Driven and 100% Human Project
Amplified by attributes of AI Technology.