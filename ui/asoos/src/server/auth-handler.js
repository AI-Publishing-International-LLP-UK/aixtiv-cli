const { verifyAuthentication } = require('../../../lib/firestore');
const { admin } = require('../../../lib/firestore');
const { debugDisplay } = require('../../../lib/debug-display');
const telemetry = require('../../../lib/telemetry');

/**
 * SallyPort Authentication Handler
 * Provides API endpoints for the React UI to authenticate with SallyPort
 */

// Authentication verification endpoint
const verifyAuth = async (req, res) => {
  try {
    // Get email from request body
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    
    // Record the authentication attempt in telemetry
    telemetry.recordRequest('auth:verify');
    
    // Verify authentication with SallyPort
    const result = await verifyAuthentication({ email });
    
    if (result.success) {
      // Generate JWT token for the authenticated user
      const token = await generateAuthToken(email, result);
      
      // Debugging information
      debugDisplay({
        thought: 'Processing authentication for SallyPort UI integration',
        result,
        command: 'auth:verify'
      });
      
      return res.status(200).json({
        success: true,
        token,
        principal: email,
        name: getPrincipalDisplayName(email),
        role: getPrincipalRole(email),
        message: 'Authentication successful'
      });
    } else {
      return res.status(401).json({
        success: false,
        message: result.message || 'Authentication failed'
      });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    telemetry.recordError('auth:verify', error);
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication'
    });
  }
};

// Token validation endpoint
const validateToken = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }
    
    // Verify the JWT token
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    if (decodedToken) {
      // Get principal email from the token
      const email = decodedToken.email;
      
      // Verify that the principal still has valid access
      const authStatus = await verifyAuthentication({ email });
      
      if (authStatus.success) {
        return res.status(200).json({
          success: true,
          principal: email,
          name: getPrincipalDisplayName(email),
          role: getPrincipalRole(email),
          message: 'Token is valid'
        });
      } else {
        return res.status(401).json({
          success: false,
          message: 'Token is no longer valid'
        });
      }
    } else {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
  } catch (error) {
    console.error('Token validation error:', error);
    
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

// Logout endpoint
const logout = async (req, res) => {
  // Since we're using JWT, we don't need server-side logout
  // The client will remove the token from storage
  
  return res.status(200).json({
    success: true,
    message: 'Logout successful'
  });
};

/**
 * Generate a JWT token for authentication
 * @param {string} email - Principal email
 * @param {object} authData - Authentication data from SallyPort
 * @returns {Promise<string>} JWT token
 */
const generateAuthToken = async (email, authData) => {
  try {
    // Create custom token with Firebase Admin
    const token = await admin.auth().createCustomToken(email, {
      isDelegated: authData.isDelegated || false,
      resourceCount: authData.resourceCount || 0,
      status: authData.status || 'authorized'
    });
    
    return token;
  } catch (error) {
    console.error('Error generating auth token:', error);
    throw error;
  }
};

/**
 * Get display name for a principal
 * @param {string} email - Principal email
 * @returns {string} Display name
 */
const getPrincipalDisplayName = (email) => {
  // For demo purposes, return a hardcoded name for PR
  if (email === 'pr@coaching2100.com') {
    return 'Mr. Phillip Corey Roark';
  }
  
  // Extract name from email for other users
  const name = email.split('@')[0];
  return name.split('.').map(part => 
    part.charAt(0).toUpperCase() + part.slice(1)
  ).join(' ');
};

/**
 * Get role for a principal
 * @param {string} email - Principal email
 * @returns {string} Role
 */
const getPrincipalRole = (email) => {
  // For demo purposes, return hardcoded roles
  const roleMap = {
    'pr@coaching2100.com': 'CEO',
    'admin@coaching2100.com': 'Administrator',
    'dev@coaching2100.com': 'Developer'
  };
  
  return roleMap[email] || 'User';
};

module.exports = {
  verifyAuth,
  validateToken,
  logout
};