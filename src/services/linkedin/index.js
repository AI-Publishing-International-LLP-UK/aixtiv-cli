/**
 * LinkedIn Integration Service
 * 
 * Provides integration with LinkedIn API for profile access, company pages,
 * and posts, with Firestore data synchronization.
 * 
 * (c) 2025 Copyright AI Publishing International LLP All Rights Reserved.
 * Developed with assistance from the Pilots of Vision Lake and
 * Claude Code Generator. This is Human Driven and 100% Human Project
 * Amplified by attributes of AI Technology.
 */

const axios = require('axios');
const admin = require('firebase-admin');
const oauth2Service = require('../oauth2');
const secretManager = require('../secrets/secret-manager');

// LinkedIn API configuration
const LINKEDIN_API_URL = 'https://api.linkedin.com/v2';
const LINKEDIN_PROVIDER = 'linkedin';

// Cache for LinkedIn data
const dataCache = new Map();
const CACHE_TTL = 1000 * 60 * 15; // 15 minutes

/**
 * LinkedIn integration service
 */
class LinkedInService {
  constructor() {
    this.db = null;
    this.initialized = false;
  }
  
  /**
   * Initialize the LinkedIn service
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      // Initialize Firestore if not already initialized
      if (!admin.apps.length) {
        admin.initializeApp();
      }
      this.db = admin.firestore();
      
      // Configure LinkedIn OAuth2 provider if not already configured
      await this._configureLinkedInProvider();
      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize LinkedIn service:', error.message);
      throw error;
    }
  }
  
  /**
   * Configure LinkedIn as an OAuth2 provider
   * @private
   */
  async _configureLinkedInProvider() {
    try {
      // Add LinkedIn provider configuration to OAuth2 service
      oauth2Service.addProviderConfig(LINKEDIN_PROVIDER, {
        authorizationEndpoint: 'https://www.linkedin.com/oauth/v2/authorization',
        tokenEndpoint: 'https://www.linkedin.com/oauth/v2/accessToken',
        scopes: [
          'r_liteprofile',
          'r_emailaddress',
          'w_member_social',
          'r_organization_social',
          'rw_organization_admin'
        ],
        tokenRefreshThreshold: 3600 // 1 hour
      });
    } catch (error) {
      console.error('Failed to configure LinkedIn OAuth2 provider:', error.message);
      throw error;
    }
  }
  
  /**
   * Get LinkedIn authorization URL
   * @param {string} redirectUri - Redirect URI
   * @param {string} [state] - State parameter for security
   * @param {string[]} [additionalScopes] - Additional scopes to request
   * @returns {Promise<string>} - Authorization URL
   */
  async getAuthorizationUrl(redirectUri, state, additionalScopes = []) {
    await this.initialize();
    
    return oauth2Service.getAuthorizationUrl(
      LINKEDIN_PROVIDER,
      redirectUri,
      state || oauth2Service.generateState(),
      additionalScopes
    );
  }
  
  /**
   * Handle OAuth2 callback for LinkedIn
   * @param {string} code - Authorization code
   * @param {string} redirectUri - Redirect URI
   * @param {string} userId - User ID to associate with the tokens
   * @returns {Promise<Object>} - User profile data
   */
  async handleOAuthCallback(code, redirectUri, userId) {
    await this.initialize();
    
    // Exchange code for tokens
    const tokens = await oauth2Service.exchangeCodeForTokens(
      LINKEDIN_PROVIDER,
      code,
      redirectUri
    );
    
    // Store tokens
    await oauth2Service.storeUserTokens(userId, LINKEDIN_PROVIDER, tokens);
    
    // Get user profile
    const profile = await this.getUserProfile(userId);
    
    // Store profile in Firestore
    await this.storeUserProfile(userId, profile);
    
    return profile;
  }
  
  /**
   * Store LinkedIn user profile in Firestore
   * @param {string} userId - User ID
   * @param {Object} profile - LinkedIn profile data
   * @returns {Promise<void>}
   */
  async storeUserProfile(userId, profile) {
    await this.initialize();
    
    // Store in Firestore
    await this.db.collection('linkedin_profiles').doc(userId).set({
      userId,
      linkedInId: profile.id,
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      profilePicture: profile.profilePicture,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      connectionCount: profile.connectionCount || 0
    }, { merge: true });
    
    // Update user document with LinkedIn data
    await this.db.collection('users').doc(userId).set({
      linkedInConnected: true,
      linkedInId: profile.id,
      linkedInProfileUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }
  
  /**
   * Get LinkedIn user profile
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - User profile data
   */
  async getUserProfile(userId) {
    await this.initialize();
    
    // Get access token
    const accessToken = await oauth2Service.getUserAccessToken(userId, LINKEDIN_PROVIDER);
    
    // Get basic profile
    const profileResponse = await axios.get(`${LINKEDIN_API_URL}/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });
    
    // Get email address
    const emailResponse = await axios.get(`${LINKEDIN_API_URL}/emailAddress?q=members&projection=(elements*(handle~))`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });
    
    // Get profile picture
    const pictureResponse = await axios.get(`${LINKEDIN_API_URL}/me?projection=(id,profilePicture(displayImage~:playableStreams))`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });
    
    // Extract profile data
    const profile = {
      id: profileResponse.data.id,
      firstName: profileResponse.data.localizedFirstName,
      lastName: profileResponse.data.localizedLastName,
      email: emailResponse.data.elements[0]['handle~'].emailAddress,
      profilePicture: null
    };
    
    // Extract profile picture URL (if available)
    if (pictureResponse.data.profilePicture && 
        pictureResponse.data.profilePicture['displayImage~'] &&
        pictureResponse.data.profilePicture['displayImage~'].elements &&
        pictureResponse.data.profilePicture['displayImage~'].elements.length > 0) {
      // Get the largest image
      const elements = pictureResponse.data.profilePicture['displayImage~'].elements;
      const largestImage = elements.reduce((prev, current) => {
        return (prev.data['com.linkedin.digitalmedia.mediaartifact.StillImage'].storageSize.width > 
                current.data['com.linkedin.digitalmedia.mediaartifact.StillImage'].storageSize.width) 
               ? prev : current;
      });
      
      profile.profilePicture = largestImage.identifiers[0].identifier;
    }
    
    return profile;
  }
  
  /**
   * Fetch all LinkedIn profiles from Firestore
   * @param {number} limit - Maximum number of profiles to fetch
   * @returns {Promise<Array>} - Array of LinkedIn profiles
   */
  async getAllProfiles(limit = 100) {
    await this.initialize();
    
    const profilesSnapshot = await this.db.collection('linkedin_profiles')
      .orderBy('updatedAt', 'desc')
      .limit(limit)
      .get();
    
    const profiles = [];
    profilesSnapshot.forEach(doc => {
      profiles.push(doc.data());
    });
    
    return profiles;
  }
  
  /**
   * Share content on LinkedIn
   * @param {string} userId - User ID
   * @param {Object} content - Content to share
   * @param {string} content.text - Text content (required)
   * @param {string} [content.title] - Title of the shared content
   * @param {string} [content.imageUrl] - URL of an image to include
   * @param {string} [content.linkUrl] - URL to share
   * @param {string} [content.linkDescription] - Description of the link
   * @returns {Promise<Object>} - Response data with post ID
   */
  async shareContent(userId, content) {
    await this.initialize();
    
    // Get access token
    const accessToken = await oauth2Service.getUserAccessToken(userId, LINKEDIN_PROVIDER);
    
    // Get user's LinkedIn ID
    const profileDoc = await this.db.collection('linkedin_profiles').doc(userId).get();
    if (!profileDoc.exists) {
      throw new Error(`LinkedIn profile not found for user ${userId}`);
    }
    const linkedInId = profileDoc.data().linkedInId;
    
    // Build share content
    const shareData = {
      owner: `urn:li:person:${linkedInId}`,
      subject: content.title || '',
      text: {
        text: content.text
      }
    };
    
    // Add link if provided
    if (content.linkUrl) {
      shareData.content = {
        contentEntities: [
          {
            entityLocation: content.linkUrl,
            thumbnails: content.imageUrl ? [
              {
                resolvedUrl: content.imageUrl
              }
            ] : undefined
          }
        ],
        title: content.title || '',
        description: content.linkDescription || ''
      };
    }
    
    // Post to LinkedIn
    const response = await axios.post(`${LINKEDIN_API_URL}/shares`, shareData, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });
    
    // Store share data in Firestore
    const postId = response.data.id;
    await this.storeShareData(userId, postId, content);
    
    return {
      id: postId,
      ...response.data
    };
  }
  
  /**
   * Store LinkedIn share data in Firestore
   * @param {string} userId - User ID
   * @param {string} postId - LinkedIn post ID
   * @param {Object} content - Content that was shared
   * @returns {Promise<void>}
   */
  async storeShareData(userId, postId, content) {
    await this.initialize();
    
    await this.db.collection('linkedin_posts').doc(postId).set({
      userId,
      postId,
      content,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Also add to user's posts subcollection
    await this.db.collection('linkedin_profiles').doc(userId)
      .collection('posts').doc(postId).set({
        postId,
        content,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
  }
  
  /**
   * Get recent posts for a user
   * @param {string} userId - User ID
   * @param {number} limit - Maximum number of posts to fetch
   * @returns {Promise<Array>} - Array of posts
   */
  async getUserPosts(userId, limit = 20) {
    await this.initialize();
    
    const postsSnapshot = await this.db.collection('linkedin_profiles')
      .doc(userId)
      .collection('posts')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    
    const posts = [];
    postsSnapshot.forEach(doc => {
      posts.push(doc.data());
    });
    
    return posts;
  }
  
  /**
   * List organizations (company pages) a user has access to
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Array of organizations
   */
  async listOrganizations(userId) {
    await this.initialize();
    
    // Get access token
    const accessToken = await oauth2Service.getUserAccessToken(userId, LINKEDIN_PROVIDER);
    
    // Get user's LinkedIn ID
    const profileDoc = await this.db.collection('linkedin_profiles').doc(userId).get();
    if (!profileDoc.exists) {
      throw new Error(`LinkedIn profile not found for user ${userId}`);
    }
    const linkedInId = profileDoc.data().linkedInId;
    
    // Get organizations
    const response = await axios.get(`${LINKEDIN_API_URL}/organizationAcls?q=roleAssignee&roleAssignee=urn%3Ali%3Aperson%3A${linkedInId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });
    
    // Extract organization data
    const organizations = [];
    if (response.data.elements && response.data.elements.length > 0) {
      for (const element of response.data.elements) {
        const orgId = element.organization.split(':').pop();
        
        // Get organization details
        const orgResponse = await axios.get(`${LINKEDIN_API_URL}/organizations/${orgId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
          }
        });
        
        organizations.push({
          id: orgId,
          name: orgResponse.data.localizedName,
          role: element.role,
          state: element.state,
          logoUrl: orgResponse.data.logoUrl || null
        });
      }
    }
    
    // Store organizations in Firestore
    await this.storeUserOrganizations(userId, organizations);
    
    return organizations;
  }
  
  /**
   * Store user's LinkedIn organizations in Firestore
   * @param {string} userId - User ID
   * @param {Array} organizations - Array of organizations
   * @returns {Promise<void>}
   */
  async storeUserOrganizations(userId, organizations) {
    await this.initialize();
    
    // Create a batch to update all organization documents
    const batch = this.db.batch();
    
    // Update user's organizations collection
    for (const org of organizations) {
      const orgRef = this.db.collection('linkedin_profiles')
        .doc(userId)
        .collection('organizations')
        .doc(org.id);
      
      batch.set(orgRef, {
        ...org,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Also update global organizations collection
      const globalOrgRef = this.db.collection('linkedin_organizations').doc(org.id);
      batch.set(globalOrgRef, {
        id: org.id,
        name: org.name,
        logoUrl: org.logoUrl,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
    
    // Commit the batch
    await batch.commit();
  }
  
  /**
   * Share content on a company page
   * @param {string} userId - User ID
   * @param {string} organizationId - LinkedIn organization ID
   * @param {Object} content - Content to share
   * @param {string} content.text - Text content (required)
   * @param {string} [content.title] - Title of the shared content
   * @param {string} [content.imageUrl] - URL of an image to include
   * @param {string} [content.linkUrl] - URL to share
   * @param {string} [content.linkDescription] - Description of the link
   * @returns {Promise<Object>} - Response data with post ID
   */
  async shareToCompanyPage(userId, organizationId, content) {
    await this.initialize();
    
    // Get access token
    const accessToken = await oauth2Service.getUserAccessToken(userId, LINKEDIN_PROVIDER);
    
    // Build share content
    const shareData = {
      owner: `urn:li:organization:${organizationId}`,
      subject: content.title || '',
      text: {
        text: content.text
      }
    };
    
    // Add link if provided
    if (content.linkUrl) {
      shareData.content = {
        contentEntities: [
          {
            entityLocation: content.linkUrl,
            thumbnails: content.imageUrl ? [
              {
                resolvedUrl: content.imageUrl
              }
            ] : undefined
          }
        ],
        title: content.title || '',
        description: content.linkDescription || ''
      };
    }
    
    // Post to LinkedIn
    const response = await axios.post(`${LINKEDIN_API_URL}/shares`, shareData, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });
    
    // Store share data in Firestore
    const postId = response.data.id;
    await this.storeOrganizationShareData(userId, organizationId, postId, content);
    
    return {
      id: postId,
      ...response.data
    };
  }
  
  /**
   * Store organization share data in Firestore
   * @param {string} userId - User ID
   * @param {string} organizationId - LinkedIn organization ID
   * @param {string} postId - LinkedIn post ID
   * @param {Object} content - Content that was shared
   * @returns {Promise<void>}
   */
  async storeOrganizationShareData(userId, organizationId, postId, content) {
    await this.initialize();
    
    await this.db.collection('linkedin_posts').doc(postId).set({
      userId,
      organizationId,
      postId,
      content,
      type: 'organization',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Also add to organization's posts subcollection
    await this.db.collection('linkedin_organizations').doc(organizationId)
      .collection('posts').doc(postId).set({
        userId,
        postId,
        content,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
  }
  
  /**
   * Create a scheduled LinkedIn post for future publishing
   * @param {string} userId - User ID
   * @param {Object} content - Content to share
   * @param {Date} scheduledTime - Time to publish the post
   * @param {string} [organizationId] - Optional organization ID for company page posts
   * @returns {Promise<string>} - Scheduled post ID
   */
  async schedulePost(userId, content, scheduledTime, organizationId = null) {
    await this.initialize();
    
    // Validate scheduled time (must be in the future)
    const now = new Date();
    if (scheduledTime <= now) {
      throw new Error('Scheduled time must be in the future');
    }
    
    // Create a scheduled post document
    const scheduledPostRef = this.db.collection('linkedin_scheduled_posts').doc();
    await scheduledPostRef.set({
      userId,
      organizationId,
      content,
      scheduledTime: admin.firestore.Timestamp.fromDate(scheduledTime),
      status: 'scheduled',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return scheduledPostRef.id;
  }
  
  /**
   * Synchronize Firestore data with LinkedIn
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Synchronization results
   */
  async synchronizeData(userId) {
    await this.initialize();
    
    // Get user profile
    const profile = await this.getUserProfile(userId);
    await this.storeUserProfile(userId, profile);
    
    // Get organizations
    const organizations = await this.listOrganizations(userId);
    
    return {
      profile,
      organizations,
      syncTime: new Date()
    };
  }
  
  /**
   * Revoke LinkedIn access for a user
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async revokeAccess(userId) {
    await this.initialize();
    
    // Revoke OAuth2 tokens
    await oauth2Service.revokeUserTokens(userId, LINKEDIN_PROVIDER);
    
    // Update user document
    await this.db.collection('users').doc(userId).update({
      linkedInConnected: false,
      linkedInRevokedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }
}

// Export singleton instance
module.exports = new LinkedInService();