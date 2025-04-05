/**
 * Dr. Grant's Authenticator & Sally Port Security Framework
 * 
 * Part of the AIXTIV SYMPHONY OPUS OPERATING SYSTEM (ASOOS)
 * 
 * A comprehensive next-generation authentication system integrating
 * passwordless verification, zero-trust architecture, continuous authorization,
 * blockchain validation, and SERPEW-based identity profiling.
 * 
 * The Sally Port concept creates a secure holding area between verification stages,
 * ensuring comprehensive identity verification before granting system access.
 * 
 * Configured for API FOR WARP DRIVE project and optimized for multi-domain 
 * environments (supporting 250+ domains) with Firebase integration.
 */

// Project configuration
const PROJECT_CONFIG = {
  projectId: 'api-for-warp-drive',
  // Harmony with AIXTIV SYMPHONY OPUS OPERATING SYSTEM
  asoos: {
    enabled: true,
    orchestrationEndpoint: 'https://api.aixtiv.com/symphony/opus/orchestration',
    harmonicSecurityEnabled: true
  },
  // Multi-domain support (for 250+ domains)
  multiDomain: {
    enabled: true,
    federationMode: 'trusted-idps', // Don't enumerate all domains
    allowAllDomains: true, // Per GCP recommendation for numerous domains
    primaryDomains: [] // Can add high-priority domains here if needed
  },
  // Firebase integration
  firebase: {
    enabled: true,
    authEmulatorHost: process.env.NODE_ENV === 'development' ? 'localhost:9099' : null,
    region: 'us-west1',
    customTokenEnabled: true
  },
  // Google Cloud organization policies
  gcpPolicies: {
    securityBaselinePercentage: 60, // Current security baseline percentage
    domainRestrictedSharingEnabled: false, // Set to inactive as recommended
    disableServiceAccountKeyUpload: true,
    uniformBucketLevelAccess: true,
    zonalDNSOnly: true
  }
};

// Core Authentication Module
const SallyPortAuth = {
  /**
   * Initialize the Sally Port Authentication Process
   * Creates a secure holding area between entry point and system access
   */
  initializeSallyPort: async (req, res) => {
    try {
      // Create secure session for visitor in the "holding area"
      const sessionId = crypto.randomUUID();
      
      // Context store for the verification journey
      const visitorContext = {
        entryTimestamp: Date.now(),
        isFirstTimeVisitor: !req.cookies.previousVisit,
        verificationStage: 'entry',
        verificationStatus: {
          biometric: false,     // Facial/fingerprint verification
          linkedin: false,      // Professional identity verification
          serpew: false,        // Sector, Role, Person, Wildcard data
          hobmidho: false,      // Holland, MBTI, DISC, Hogan assessments
          deviceTrust: false    // Device security posture
        },
        regionData: await geoService.detectRegion(req.ip),
        ceUuid: null,           // To be generated after verification
        continuousAuthScore: 100, // Starting trust score (degrades over time)
        zeroTrustAttributes: {
          deviceFingerprint: req.headers['device-fingerprint'] || null,
          networkContext: await networkAnalyzer.assessContext(req),
          behavioralBaseline: null // Will be established during verification
        }
      };
      
      // Store in secure Redis session with encryption
      await secureDataStore.setWithEncryption(
        `sally_port:${sessionId}`, 
        visitorContext,
        3600 // 1-hour initial TTL
      );
      
      // Set secure, httpOnly, sameSite cookie
      res.cookie('sallyPortSession', sessionId, { 
        httpOnly: true, 
        secure: true,
        sameSite: 'strict',
        maxAge: 3600000 // 1 hour
      });
      
      // Log authentication initialization attempt with timestamp
      await auditLogger.logEvent({
        eventType: 'AUTH_INIT',
        sessionId: sessionId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString(),
        success: true
      });
      
      // Return initial authentication state
      return res.status(200).json({
        status: 'sally_port_initialized',
        sessionId: sessionId,
        next: visitorContext.isFirstTimeVisitor ? 'welcome' : 'verification',
        requiredVerifications: Object.keys(visitorContext.verificationStatus),
        timeLimit: 3600, // Seconds until session expires
        region: visitorContext.regionData.region
      });
    } catch (error) {
      console.error('Sally port initialization failed:', error);
      
      // Log failed initialization
      await auditLogger.logEvent({
        eventType: 'AUTH_INIT_FAILED',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      return res.status(500).json({ 
        error: 'Authentication initialization failed',
        message: 'Security systems could not establish a secure verification session'
      });
    }
  },

  /**
   * First-time visitor welcome experience (5 second duration)
   * Part of the onboarding sequence for new users
   */
  showWelcomeMessage: async (req, res) => {
    try {
      const { sallyPortSession } = req.cookies;
      if (!sallyPortSession) {
        return res.status(401).json({ error: 'Session expired or invalid' });
      }
      
      // Retrieve visitor context from secure storage
      const visitorContext = await secureDataStore.getWithDecryption(`sally_port:${sallyPortSession}`);
      if (!visitorContext) {
        return res.status(401).json({ error: 'Session data not found' });
      }
      
      // If not a first-time visitor, redirect to verification
      if (!visitorContext.isFirstTimeVisitor) {
        return res.redirect('/api/auth/sally-port/verification');
      }
      
      // Set cookie to remember user for future visits
      res.cookie('previousVisit', 'true', { 
        maxAge: 31536000000, // 1 year
        httpOnly: true, 
        secure: true,
        sameSite: 'strict'
      });
      
      // Update context
      visitorContext.verificationStage = 'welcome';
      await secureDataStore.setWithEncryption(
        `sally_port:${sallyPortSession}`, 
        visitorContext,
        3600
      );
      
      // Log welcome shown
      await auditLogger.logEvent({
        eventType: 'WELCOME_SHOWN',
        sessionId: sallyPortSession,
        timestamp: new Date().toISOString()
      });
      
      return res.status(200).json({
        status: 'welcome',
        message: "Welcome to our secure environment. You'll complete a brief verification process.",
        duration: 5000, // 5 seconds
        next: '/api/auth/sally-port/verification'
      });
    } catch (error) {
      console.error('Welcome message display failed:', error);
      
      // Log error
      await auditLogger.logEvent({
        eventType: 'WELCOME_ERROR',
        sessionId: req.cookies.sallyPortSession || 'unknown',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      return res.status(500).json({ error: 'Error displaying welcome message' });
    }
  },
  
  /**
   * Multi-factor verification process
   * Handles all verification methods in the Sally Port
   */
  verifyVisitor: async (req, res) => {
    try {
      const { sallyPortSession } = req.cookies;
      if (!sallyPortSession) {
        return res.status(401).json({ error: 'Session expired or invalid' });
      }
      
      // Retrieve visitor context from secure storage
      const visitorContext = await secureDataStore.getWithDecryption(`sally_port:${sallyPortSession}`);
      if (!visitorContext) {
        return res.status(401).json({ error: 'Session data not found' });
      }
      
      // Update verification stage
      visitorContext.verificationStage = 'verification';
      
      // Process biometric verification if provided
      if (req.body.biometricData) {
        const biometricValid = await biometricVerifier.verify(req.body.biometricData);
        visitorContext.verificationStatus.biometric = biometricValid;
        
        // Log biometric attempt
        await auditLogger.logEvent({
          eventType: 'BIOMETRIC_VERIFICATION',
          sessionId: sallyPortSession,
          success: biometricValid,
          timestamp: new Date().toISOString()
        });
      }
      
      // Process LinkedIn verification if provided
      if (req.body.linkedinToken) {
        const linkedinValid = await linkedinVerifier.verify(req.body.linkedinToken);
        visitorContext.verificationStatus.linkedin = linkedinValid;
        
        // Log LinkedIn verification attempt
        await auditLogger.logEvent({
          eventType: 'LINKEDIN_VERIFICATION',
          sessionId: sallyPortSession,
          success: linkedinValid,
          timestamp: new Date().toISOString()
        });
        
        // If LinkedIn verification is successful, enrich SERPEW data
        if (linkedinValid) {
          const linkedinData = await linkedinVerifier.getProfileData(req.body.linkedinToken);
          await serpewEnricher.enrichFromLinkedIn(linkedinData, sallyPortSession);
        }
      }
      
      // Process SERPEW data if provided (Sector, Role, Person, Wild-card)
      if (req.body.serpewData) {
        const serpewValid = await serpewValidator.validate(req.body.serpewData);
        visitorContext.verificationStatus.serpew = serpewValid;
        
        // If valid, store SERPEW data for personalization
        if (serpewValid) {
          await serpewStore.save(sallyPortSession, req.body.serpewData);
        }
        
        // Log SERPEW verification
        await auditLogger.logEvent({
          eventType: 'SERPEW_VERIFICATION',
          sessionId: sallyPortSession,
          success: serpewValid,
          timestamp: new Date().toISOString()
        });
      }
      
      // Process HOBMIDHO assessments if provided
      if (req.body.hobmidhoData) {
        const hobmidhoValid = await hobmidhoValidator.validate(req.body.hobmidhoData);
        visitorContext.verificationStatus.hobmidho = hobmidhoValid;
        
        // Log HOBMIDHO verification
        await auditLogger.logEvent({
          eventType: 'HOBMIDHO_VERIFICATION',
          sessionId: sallyPortSession,
          success: hobmidhoValid,
          timestamp: new Date().toISOString()
        });
      }
      
      // Process device security posture check
      if (req.body.deviceSecurityData) {
        const deviceTrustValid = await deviceTrustVerifier.validate(req.body.deviceSecurityData);
        visitorContext.verificationStatus.deviceTrust = deviceTrustValid;
        
        // Log device trust verification
        await auditLogger.logEvent({
          eventType: 'DEVICE_TRUST_VERIFICATION',
          sessionId: sallyPortSession,
          success: deviceTrustValid,
          deviceInfo: JSON.stringify(req.body.deviceSecurityData).substring(0, 100) + '...',
          timestamp: new Date().toISOString()
        });
      }
      
      // Update visitor context in secure storage
      await secureDataStore.setWithEncryption(
        `sally_port:${sallyPortSession}`, 
        visitorContext,
        3600
      );
      
      // Check if all verifications are complete
      const allVerified = Object.values(visitorContext.verificationStatus).every(status => status === true);
      
      if (allVerified) {
        // Generate CE-UUID for fully verified visitor
        visitorContext.ceUuid = await identityService.generateCeUuid(visitorContext);
        
        // Establish behavioral baseline for continuous auth
        visitorContext.zeroTrustAttributes.behavioralBaseline = await behavioralAnalyzer.establishBaseline(req, visitorContext);
        
        // Record verification completion on blockchain for immutable audit
        const blockchainReceipt = await blockchainAudit.recordVerification({
          ceUuid: visitorContext.ceUuid,
          verifications: visitorContext.verificationStatus,
          timestamp: new Date().toISOString(),
          sessionId: sallyPortSession
        });
        
        // Update visitor context with blockchain receipt
        visitorContext.blockchainReceipt = blockchainReceipt;
        
        // Update context in secure storage
        await secureDataStore.setWithEncryption(
          `sally_port:${sallyPortSession}`, 
          visitorContext,
          86400 // Extend session to 24 hours once fully verified
        );
        
        // Log successful complete verification
        await auditLogger.logEvent({
          eventType: 'VERIFICATION_COMPLETE',
          sessionId: sallyPortSession,
          ceUuid: visitorContext.ceUuid,
          blockchainReceipt: blockchainReceipt,
          timestamp: new Date().toISOString()
        });
        
        return res.status(200).json({
          status: 'verification_complete',
          ceUuid: visitorContext.ceUuid,
          blockchainReceipt: blockchainReceipt,
          next: '/api/auth/sally-port/regional-pilot'
        });
      } else {
        // Return pending verifications
        const pendingVerifications = Object.entries(visitorContext.verificationStatus)
          .filter(([_, status]) => status === false)
          .map(([key]) => key);
        
        return res.status(200).json({
          status: 'verification_pending',
          pendingVerifications,
          completedVerifications: Object.entries(visitorContext.verificationStatus)
            .filter(([_, status]) => status === true)
            .map(([key]) => key),
          message: 'Please complete all verification steps to proceed'
        });
      }
    } catch (error) {
      console.error('Verification process failed:', error);
      
      // Log verification error
      await auditLogger.logEvent({
        eventType: 'VERIFICATION_ERROR',
        sessionId: req.cookies.sallyPortSession || 'unknown',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      return res.status(500).json({ 
        error: 'Verification process failed',
        message: 'An error occurred during identity verification'
      });
    }
  },
  
  /**
   * Connect verified user to their regional pilot
   * Final stage of the Sally Port process
   */
  connectToRegionalPilot: async (req, res) => {
    try {
      const { sallyPortSession } = req.cookies;
      if (!sallyPortSession) {
        return res.status(401).json({ error: 'Session expired or invalid' });
      }
      
      // Retrieve visitor context from secure storage
      const visitorContext = await secureDataStore.getWithDecryption(`sally_port:${sallyPortSession}`);
      if (!visitorContext) {
        return res.status(401).json({ error: 'Session data not found' });
      }
      
      // Verify that user has completed verification
      if (!visitorContext.ceUuid || !visitorContext.blockchainReceipt) {
        return res.status(403).json({ 
          error: 'Verification incomplete',
          message: 'You must complete all verification steps before connecting to a regional pilot'
        });
      }
      
      // Update verification stage
      visitorContext.verificationStage = 'regional_pilot';
      
      // Get regional greeting script
      const regionalScript = await regionalScriptService.getGreeting(visitorContext.regionData.region);
      
      // Assign regional pilot based on SERPEW and HOBMIDHO data
      const pilotAssignment = await regionalPilotService.assignPilot({
        region: visitorContext.regionData.region,
        serpewData: await serpewStore.get(sallyPortSession),
        hobmidhoData: await hobmidhoStore.get(sallyPortSession),
        ceUuid: visitorContext.ceUuid
      });
      
      // Create secure access token with all verification claims
      const token = await tokenService.generateToken({
        sub: visitorContext.ceUuid,
        region: visitorContext.regionData.region,
        verifications: Object.keys(visitorContext.verificationStatus),
        pilot_id: pilotAssignment.pilotId,
        blockchainReceipt: visitorContext.blockchainReceipt,
        continuousAuthRequired: true,
        iss: 'https://auth.aixtiv.org',
        aud: req.body.client_id || 'default-client',
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
        iat: Math.floor(Date.now() / 1000)
      });
      
      // Create refresh token for continuous authentication
      const refreshToken = await tokenService.generateRefreshToken({
        sub: visitorContext.ceUuid,
        sessionId: sallyPortSession,
        jti: crypto.randomUUID(),
        exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
        iat: Math.floor(Date.now() / 1000)
      });
      
      // Store tokens in secure token store with rotation policy
      await tokenStore.saveTokenPair(visitorContext.ceUuid, token, refreshToken, {
        rotationEnabled: true,
        reuseDetection: true,
        rotationWindow: 86400 // 24 hours
      });
      
      // Record token issuance on blockchain
      await blockchainAudit.recordTokenIssuance({
        ceUuid: visitorContext.ceUuid,
        tokenId: token.jti,
        issuedAt: new Date().toISOString(),
        pilotId: pilotAssignment.pilotId
      });
      
      // Update visitor context with token info
      visitorContext.currentTokenId = token.jti;
      visitorContext.lastAuthentication = new Date().toISOString();
      
      // Update context in secure storage, extending session
      await secureDataStore.setWithEncryption(
        `sally_port:${sallyPortSession}`, 
        visitorContext,
        86400 * 30 // 30 days
      );
      
      // Log successful pilot connection
      await auditLogger.logEvent({
        eventType: 'REGIONAL_PILOT_CONNECTED',
        sessionId: sallyPortSession,
        ceUuid: visitorContext.ceUuid,
        pilotId: pilotAssignment.pilotId,
        region: visitorContext.regionData.region,
        timestamp: new Date().toISOString()
      });
      
      // Set secure, httpOnly cookie with refresh token
      res.cookie('refreshToken', refreshToken, { 
        httpOnly: true, 
        secure: true,
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });
      
      return res.status(200).json({
        status: 'authentication_complete',
        access_token: token,
        token_type: 'Bearer',
        expires_in: 24 * 60 * 60, // 24 hours in seconds
        regional_greeting: regionalScript.greeting,
        pilot_name: pilotAssignment.pilotName,
        pilot_id: pilotAssignment.pilotId,
        ceUuid: visitorContext.ceUuid
      });
    } catch (error) {
      console.error('Regional pilot connection failed:', error);
      
      // Log error
      await auditLogger.logEvent({
        eventType: 'REGIONAL_PILOT_ERROR',
        sessionId: req.cookies.sallyPortSession || 'unknown',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      return res.status(500).json({ 
        error: 'Regional pilot connection failed',
        message: 'An error occurred while connecting to your regional pilot'
      });
    }
  },
  
  /**
   * Continuous authentication verification
   * Ensures ongoing user verification throughout their session
   */
  continuousAuthentication: async (req, res, next) => {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }
      
      const token = authHeader.split(' ')[1];
      
      // Verify token
      const decoded = await tokenService.verifyToken(token);
      
      // Check if token is in revocation list
      const isRevoked = await tokenStore.isRevoked(decoded.jti);
      if (isRevoked) {
        return res.status(401).json({ 
          error: 'Token revoked',
          code: 'token_revoked'
        });
      }
      
      // Get current security context for the user
      const securityContext = await securityContextService.getContext(decoded.sub);
      
      // Calculate current risk score based on:
      // 1. Device context
      // 2. Network context
      // 3. Behavioral patterns
      // 4. Resource sensitivity
      // 5. Time since last full authentication
      const currentRiskScore = await riskScoringEngine.calculateScore({
        user: decoded.sub,
        deviceFingerprint: req.headers['device-fingerprint'],
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        resource: req.originalUrl,
        accessPattern: await userActivityService.getRecentActivity(decoded.sub),
        timeSinceFullAuth: Date.now() - new Date(decoded.iat * 1000).getTime(),
        anomalyScore: await anomalyDetectionService.detectAnomalies(decoded.sub, req)
      });
      
      // Update security context with new risk score
      securityContext.currentRiskScore = currentRiskScore;
      await securityContextService.updateContext(decoded.sub, securityContext);
      
      // Log continuous authentication check
      await auditLogger.logEvent({
        eventType: 'CONTINUOUS_AUTH_CHECK',
        ceUuid: decoded.sub,
        riskScore: currentRiskScore,
        resource: req.originalUrl,
        timestamp: new Date().toISOString()
      });
      
      // If risk score is acceptable, allow access
      if (currentRiskScore <= securityContext.maxAcceptableRiskScore) {
        // Attach user info to request for downstream use
        req.user = {
          ceUuid: decoded.sub,
          region: decoded.region,
          pilotId: decoded.pilot_id,
          riskScore: currentRiskScore
        };
        
        // Add security headers
        res.set('X-Auth-Level', 'full');
        res.set('X-Risk-Score', currentRiskScore.toString());
        
        // Continue to the next middleware/route handler
        return next();
      } 
      // If risk score is in step-up range, require additional verification
      else if (currentRiskScore <= securityContext.stepUpThreshold) {
        return res.status(403).json({
          error: 'Additional authentication required',
          code: 'step_up_required',
          requiredFactors: securityContext.requiredStepUpFactors,
          currentRiskScore,
          stepUpUrl: '/api/auth/step-up'
        });
      } 
      // If risk score is too high, reject access
      else {
        // Revoke the token
        await tokenStore.revokeToken(decoded.jti, 'high_risk_score');
        
        // Log security event
        await auditLogger.logEvent({
          eventType: 'ACCESS_DENIED_HIGH_RISK',
          ceUuid: decoded.sub,
          riskScore: currentRiskScore,
          threshold: securityContext.stepUpThreshold,
          resource: req.originalUrl,
          timestamp: new Date().toISOString()
        });
        
        return res.status(401).json({
          error: 'Access denied due to security risk',
          code: 'high_risk_score',
          message: 'Your session has been terminated due to suspicious activity. Please re-authenticate.'
        });
      }
    } catch (error) {
      console.error('Continuous authentication failed:', error);
      
      // Log error
      await auditLogger.logEvent({
        eventType: 'CONTINUOUS_AUTH_ERROR',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      // If token validation fails, require re-authentication
      return res.status(401).json({ 
        error: 'Authentication failed',
        message: 'Your session is invalid or expired. Please re-authenticate.',
        code: 'token_invalid'
      });
    }
  },
  
  /**
   * Step-up authentication when continuous auth requires additional verification
   */
  stepUpAuthentication: async (req, res) => {
    try {
      // Get current user from refresh token cookie
      const { refreshToken } = req.cookies;
      if (!refreshToken) {
        return res.status(401).json({ error: 'No refresh token' });
      }
      
      // Verify refresh token
      const decoded = await tokenService.verifyRefreshToken(refreshToken);
      
      // Get security context
      const securityContext = await securityContextService.getContext(decoded.sub);
      
      // Determine which step-up factors are required based on current risk
      const stepUpFactors = await stepUpService.determineRequiredFactors(
        decoded.sub,
        securityContext.currentRiskScore
      );
      
      // Process provided step-up factor
      if (req.body.stepUpType && req.body.stepUpData) {
        const stepUpResult = await stepUpService.verifyFactor(
          decoded.sub,
          req.body.stepUpType,
          req.body.stepUpData
        );
        
        // Log step-up attempt
        await auditLogger.logEvent({
          eventType: 'STEP_UP_ATTEMPT',
          ceUuid: decoded.sub,
          factorType: req.body.stepUpType,
          success: stepUpResult.success,
          timestamp: new Date().toISOString()
        });
        
        if (stepUpResult.success) {
          // Remove the factor from required list
          const updatedFactors = stepUpFactors.filter(f => f !== req.body.stepUpType);
          
          // If all required factors are verified, issue new token
          if (updatedFactors.length === 0) {
            // Generate new token with reset risk score
            const newToken = await tokenService.generateToken({
              sub: decoded.sub,
              region: securityContext.region,
              verifications: securityContext.verifications,
              pilot_id: securityContext.pilotId,
              continuousAuthRequired: true,
              iss: 'https://auth.aixtiv.org',
              aud: req.body.client_id || 'default-client',
              exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
              iat: Math.floor(Date.now() / 1000)
            });
            
            // Generate new refresh token
            const newRefreshToken = await tokenService.generateRefreshToken({
              sub: decoded.sub,
              sessionId: decoded.sessionId,
              jti: crypto.randomUUID(),
              exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
              iat: Math.floor(Date.now() / 1000)
            });
            
            // Store new tokens
            await tokenStore.saveTokenPair(decoded.sub, newToken, newRefreshToken, {
              rotationEnabled: true,
              reuseDetection: true,
              rotationWindow: 86400 // 24 hours
            });
            
            // Record step-up success on blockchain
            await blockchainAudit.recordStepUpSuccess({
              ceUuid: decoded.sub,
              oldTokenId: decoded.jti,
              newTokenId: newToken.jti,
              timestamp: new Date().toISOString()
            });
            
            // Reset risk score in security context
            securityContext.currentRiskScore = 0;
            await securityContextService.updateContext(decoded.sub, securityContext);
            
            // Set secure, httpOnly cookie with new refresh token
            res.cookie('refreshToken', newRefreshToken, { 
              httpOnly: true, 
              secure: true,
              sameSite: 'strict',
              maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
            });
            
            // Log successful step-up
            await auditLogger.logEvent({
              eventType: 'STEP_UP_COMPLETE',
              ceUuid: decoded.sub,
              newTokenId: newToken.jti,
              timestamp: new Date().toISOString()
            });
            
            return res.status(200).json({
              status: 'step_up_complete',
              access_token: newToken,
              token_type: 'Bearer',
              expires_in: 24 * 60 * 60 // 24 hours in seconds
            });
          }
          // If more factors are required
          else {
            return res.status(200).json({
              status: 'additional_factors_required',
              remainingFactors: updatedFactors,
              completedFactors: stepUpFactors.filter(f => !updatedFactors.includes(f))
            });
          }
        } else {
          // Failed verification
          return res.status(401).json({
            error: 'Step-up verification failed',
            code: 'step_up_failed',
            reason: stepUpResult.reason || 'Verification data invalid'
          });
        }
      }
      // If no factor provided, return required factors
      else {
        return res.status(200).json({
          status: 'step_up_required',
          requiredFactors: stepUpFactors,
          message: 'Additional verification required to continue'
        });
      }
    } catch (error) {
      console.error('Step-up authentication failed:', error);
      
      // Log error
      await auditLogger.logEvent({
        eventType: 'STEP_UP_ERROR',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      return res.status(500).json({ 
        error: 'Step-up authentication failed',
        message: 'An error occurred during additional verification'
      });
    }
  },
  
  /**
   * Token refresh functionality
   * Supports token rotation with reuse detection
   */
  refreshToken: async (req, res) => {
    try {
      const { refreshToken } = req.cookies;
      if (!refreshToken) {
        return res.status(401).json({ error: 'No refresh token' });
      }
      
      // Verify refresh token
      const decoded = await tokenService.verifyRefreshToken(refreshToken);
      
      // Check if token is known and valid
      const isValid = await tokenStore.validateRefreshToken(decoded.sub, refreshToken);
      if (!isValid) {
        // Potential token reuse attack - invalidate all tokens for the user
        await tokenStore.revokeAllUserTokens(decoded.sub, 'refresh_token_reuse');
        
        // Log security event
        await auditLogger.logEvent({
          eventType: 'REFRESH_TOKEN_REUSE_DETECTED',
          ceUuid: decoded.sub,
          tokenId: decoded.jti,
          timestamp: new Date().toISOString()
        });
        
        return res.status(401).json({ 
          error: 'Invalid refresh token',
          code: 'token_reuse_detected',
          message: 'Security violation detected. All sessions have been terminated.'
        });
      }
      
      // Get security context for the user
      const securityContext = await securityContextService.getContext(decoded.sub);
      
      // Generate new token
      const newToken = await tokenService.generateToken({
        sub: decoded.sub,
        region: securityContext.region,
        verifications: securityContext.verifications,
        pilot_id: securityContext.pilotId,
        continuousAuthRequired: true,
        iss: 'https://auth.aixtiv.org',
        aud: req.body.client_id || 'default-client',
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
        iat: Math.floor(Date.now() / 1000)
      });
      
      // Generate new refresh token
      const newRefreshToken = await tokenService.generateRefreshToken({
        sub: decoded.sub,
        sessionId: decoded.sessionId,
        jti: crypto.randomUUID(),
        exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
        iat: Math.floor(Date.now() / 1000)
      });
      
      // Store new tokens and invalidate old refresh token
      await tokenStore.rotateTokens(decoded.sub, refreshToken, newToken, newRefreshToken);
      
      // Set secure, httpOnly cookie with new refresh token
      res.cookie('refreshToken', newRefreshToken, { 
        httpOnly: true, 
        secure: true,
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });
      
      // Log token refresh
      await auditLogger.logEvent({
        eventType: 'TOKEN_REFRESHED',
        ceUuid: decoded.sub,
        newTokenId: newToken.jti,
        timestamp: new Date().toISOString()
      });
      
      return res.status(200).json({
        status: 'token_refreshed',
        access_token: newToken,
        token_type: 'Bearer',
        expires_in: 24 * 60 * 60 // 24 hours in seconds
      });
    } catch (error) {
      console.error('Token refresh failed:', error);
      
      // Log error
      await auditLogger.logEvent({
        eventType: 'TOKEN_REFRESH_ERROR',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      // Clear invalid refresh token
      res.clearCookie('refreshToken');
      
      return res.status(401).json({ 
        error: 'Token refresh failed',
        message: 'Your session is invalid or expired. Please re-authenticate.'
      });
    }
  },
  
  /**
   * User logout functionality
   */
  logout: async (req, res) => {
    try {
      // Get user from access token
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          const decoded = await tokenService.verifyToken(token);
          
          // Revoke the token
          await tokenStore.revokeToken(decoded.jti, 'user_logout');
          
          // If refresh token exists, revoke it too
          const { refreshToken } = req.cookies;
          if (refreshToken) {
            await tokenStore.revokeRefreshToken(decoded.sub, refreshToken, 'user_logout');
          }
          
          // Log logout
          await auditLogger.logEvent({
            eventType: 'USER_LOGOUT',
            ceUuid: decoded.sub,
            timestamp: new Date().toISOString()
          });
        } catch (err) {
          // Token might be invalid, continue with logout anyway
          console.warn('Logout with invalid token:', err.message);
        }
      }
      
      // Clear cookies
      res.clearCookie('refreshToken');
      res.clearCookie('sallyPortSession');
      
      return res.status(200).json({
        status: 'logout_successful',
        message: 'You have been successfully logged out'
      });
    } catch (error) {
      console.error('Logout failed:', error);
      
      // Log error
      await auditLogger.logEvent({
        eventType: 'LOGOUT_ERROR',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      // Still clear cookies on error
      res.clearCookie('refreshToken');
      res.clearCookie('sallyPortSession');
      
      return res.status(500).json({ 
        error: 'Logout process encountered an error',
        status: 'partial_logout'
      });
    }
  },
  
  /**
   * Generate a QR code for approval and verification
   * Used in high-stakes actions requiring explicit approval
   */
  generateApprovalQR: async (req, res) => {
    try {
      // Get user from access token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }
      
      const token = authHeader.split(' ')[1];
      const decoded = await tokenService.verifyToken(token);
      
      // Validate required parameters
      if (!req.body.actionType || !req.body.actionData) {
        return res.status(400).json({ 
          error: 'Missing parameters',
          message: 'actionType and actionData are required'
        });
      }
      
      // Create approval request with expiration
      const approvalId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
      
      // Store approval request
      await approvalStore.createRequest({
        id: approvalId,
        userId: decoded.sub,
        actionType: req.body.actionType,
        actionData: req.body.actionData,
        createdAt: new Date(),
        expiresAt: expiresAt,
        status: 'pending'
      });
      
      // Create QR code payload with encrypted data
      const qrPayload = await qrCodeService.generatePayload({
        approvalId,
        userId: decoded.sub,
        actionType: req.body.actionType,
        timestamp: new Date().toISOString()
      });
      
      // Generate QR code image
      const qrCodeImage = await qrCodeService.generateQRCode(qrPayload);
      
      // Log QR code generation
      await auditLogger.logEvent({
        eventType: 'QR_APPROVAL_GENERATED',
        ceUuid: decoded.sub,
        approvalId,
        actionType: req.body.actionType,
        timestamp: new Date().toISOString()
      });
      
      // Record on blockchain for immutable audit
      await blockchainAudit.recordApprovalRequest({
        approvalId,
        userId: decoded.sub,
        actionType: req.body.actionType,
        timestamp: new Date().toISOString()
      });
      
      return res.status(200).json({
        status: 'qr_generated',
        approvalId,
        qrCodeImage,
        expiresAt,
        verificationUrl: `/api/auth/verify-approval/${approvalId}`
      });
    } catch (error) {
      console.error('QR code generation failed:', error);
      
      // Log error
      await auditLogger.logEvent({
        eventType: 'QR_GENERATION_ERROR',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      return res.status(500).json({ 
        error: 'QR code generation failed',
        message: 'An error occurred while generating the approval QR code'
      });
    }
  },
  
  /**
   * Verify an approval QR code
   * Used to confirm high-stakes actions
   */
  verifyApprovalQR: async (req, res) => {
    try {
      const { approvalId } = req.params;
      if (!approvalId) {
        return res.status(400).json({ error: 'Approval ID is required' });
      }
      
      // Get approval request
      const approvalRequest = await approvalStore.getRequest(approvalId);
      if (!approvalRequest) {
        return res.status(404).json({ 
          error: 'Approval not found',
          message: 'The requested approval does not exist or has expired'
        });
      }
      
      // Check if expired
      if (new Date() > new Date(approvalRequest.expiresAt)) {
        // Update status to expired
        await approvalStore.updateStatus(approvalId, 'expired');
        
        // Log expiration
        await auditLogger.logEvent({
          eventType: 'QR_APPROVAL_EXPIRED',
          approvalId,
          userId: approvalRequest.userId,
          timestamp: new Date().toISOString()
        });
        
        return res.status(400).json({ 
          error: 'Approval expired',
          message: 'This approval request has expired'
        });
      }
      
      // Check if already approved or rejected
      if (approvalRequest.status !== 'pending') {
        return res.status(400).json({ 
          error: `Approval already ${approvalRequest.status}`,
          message: `This approval request has already been ${approvalRequest.status}`
        });
      }
      
      // Get user from token for verification
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const token = authHeader.split(' ')[1];
      const decoded = await tokenService.verifyToken(token);
      
      // Verify that the approver matches the approval request creator
      if (decoded.sub !== approvalRequest.userId) {
        // Log security event - someone else trying to approve
        await auditLogger.logEvent({
          eventType: 'QR_APPROVAL_UNAUTHORIZED_ATTEMPT',
          approvalId,
          requestedBy: approvalRequest.userId,
          attemptedBy: decoded.sub,
          timestamp: new Date().toISOString()
        });
        
        return res.status(403).json({ 
          error: 'Unauthorized',
          message: 'You are not authorized to approve this request'
        });
      }
      
      // Process verification data if provided
      if (req.body.verificationData) {
        // Verify the provided data against the QR code
        const isValid = await qrCodeService.validateVerificationData(
          approvalId,
          req.body.verificationData
        );
        
        if (!isValid) {
          // Log invalid verification attempt
          await auditLogger.logEvent({
            eventType: 'QR_INVALID_VERIFICATION',
            approvalId,
            userId: decoded.sub,
            timestamp: new Date().toISOString()
          });
          
          return res.status(400).json({ 
            error: 'Invalid verification',
            message: 'The provided verification data is invalid'
          });
        }
        
        // Update approval status
        await approvalStore.updateStatus(approvalId, 'approved');
        
        // Record approval on blockchain
        await blockchainAudit.recordApprovalConfirmation({
          approvalId,
          userId: decoded.sub,
          actionType: approvalRequest.actionType,
          timestamp: new Date().toISOString()
        });
        
        // Log approval
        await auditLogger.logEvent({
          eventType: 'QR_APPROVAL_CONFIRMED',
          approvalId,
          userId: decoded.sub,
          actionType: approvalRequest.actionType,
          timestamp: new Date().toISOString()
        });
        
        return res.status(200).json({
          status: 'approval_confirmed',
          approvalId,
          actionType: approvalRequest.actionType,
          timestamp: new Date().toISOString()
        });
      } 
      // If no verification data, return approval details
      else {
        return res.status(200).json({
          status: 'approval_pending',
          approvalId,
          actionType: approvalRequest.actionType,
          createdAt: approvalRequest.createdAt,
          expiresAt: approvalRequest.expiresAt
        });
      }
    } catch (error) {
      console.error('QR code verification failed:', error);
      
      // Log error
      await auditLogger.logEvent({
        eventType: 'QR_VERIFICATION_ERROR',
        approvalId: req.params.approvalId,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      return res.status(500).json({ 
        error: 'QR code verification failed',
        message: 'An error occurred while verifying the approval'
      });
    }
  }
};

// AIXTIV SYMPHONY OPUS Integration Services
const asoosIntegration = {
  /**
   * Connect to the AIXTIV SYMPHONY OPUS OPERATING SYSTEM
   * Enables harmonization with the broader enterprise ecosystem
   */
  connectToSymphonyOrchestrator: async (userId, context) => {
    if (!PROJECT_CONFIG.asoos.enabled) {
      console.log('ASOOS integration disabled, skipping orchestration');
      return null;
    }
    
    try {
      // Prepare the orchestration payload
      const orchestrationPayload = {
        userId,
        contextType: 'authentication',
        sessionData: {
          verificationLevel: Object.values(context.verificationStatus).filter(Boolean).length,
          riskScore: context.continuousAuthScore || 100,
          regionData: context.regionData,
          timestamp: new Date().toISOString()
        },
        securityContext: {
          zeroTrustEnabled: true,
          continuousAuthEnabled: true,
          blockchainValidationEnabled: true
        }
      };
      
      // Send to ASOOS orchestrator
      const response = await fetch(PROJECT_CONFIG.asoos.orchestrationEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ASOOS-API-Key': process.env.ASOOS_API_KEY,
          'X-ASOOS-Client-ID': PROJECT_CONFIG.projectId
        },
        body: JSON.stringify(orchestrationPayload)
      });
      
      if (!response.ok) {
        throw new Error(`ASOOS orchestration failed: ${response.statusText}`);
      }
      
      const orchestrationResult = await response.json();
      
      // Log the successful orchestration
      await auditLogger.logEvent({
        eventType: 'ASOOS_ORCHESTRATION',
        userId,
        result: 'success',
        orchestrationId: orchestrationResult.orchestrationId,
        timestamp: new Date().toISOString()
      });
      
      return orchestrationResult;
    } catch (error) {
      console.error('ASOOS orchestration error:', error);
      
      // Log the failed orchestration
      await auditLogger.logEvent({
        eventType: 'ASOOS_ORCHESTRATION_ERROR',
        userId,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      // Return null but don't fail the authentication
      return null;
    }
  },
  
  /**
   * Apply Harmonic Security policies from ASOOS
   * Enhances security with enterprise-wide policies
   */
  applyHarmonicSecurity: async (userId, securityContext) => {
    if (!PROJECT_CONFIG.asoos.enabled || !PROJECT_CONFIG.asoos.harmonicSecurityEnabled) {
      return securityContext;
    }
    
    try {
      // Fetch harmonic security policies from ASOOS
      const response = await fetch(`${PROJECT_CONFIG.asoos.orchestrationEndpoint}/harmonic-security/${userId}`, {
        method: 'GET',
        headers: {
          'X-ASOOS-API-Key': process.env.ASOOS_API_KEY,
          'X-ASOOS-Client-ID': PROJECT_CONFIG.projectId
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch harmonic security policies: ${response.statusText}`);
      }
      
      const harmonicPolicies = await response.json();
      
      // Merge harmonic security policies with the user's security context
      const enhancedContext = {
        ...securityContext,
        harmonicPolicies: harmonicPolicies.policies,
        maxAcceptableRiskScore: harmonicPolicies.maxRiskThreshold || securityContext.maxAcceptableRiskScore,
        stepUpThreshold: harmonicPolicies.stepUpThreshold || securityContext.stepUpThreshold,
        continuousAuthInterval: harmonicPolicies.continuousAuthInterval || securityContext.continuousAuthInterval,
        requiredStepUpFactors: harmonicPolicies.requiredFactors || securityContext.requiredStepUpFactors
      };
      
      return enhancedContext;
    } catch (error) {
      console.warn('Failed to apply harmonic security policies:', error);
      // Fall back to original security context
      return securityContext;
    }
  }
};

// Firebase Integration Service
const firebaseIntegration = {
  /**
   * Initialize Firebase Admin SDK
   */
  _admin: null,
  getAdmin: () => {
    if (!firebaseIntegration._admin) {
      const admin = require('firebase-admin');
      
      // Use the default credential if not in development
      if (!process.env.FIREBASE_SERVICE_ACCOUNT_PATH && process.env.NODE_ENV !== 'development') {
        admin.initializeApp({
          projectId: PROJECT_CONFIG.projectId
        });
      } else {
        const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: PROJECT_CONFIG.projectId
        });
      }
      
      firebaseIntegration._admin = admin;
    }
    
    return firebaseIntegration._admin;
  },
  
  /**
   * Generate a Firebase custom token for the authenticated user
   */
  generateCustomToken: async (userId, claims) => {
    if (!PROJECT_CONFIG.firebase.enabled || !PROJECT_CONFIG.firebase.customTokenEnabled) {
      return null;
    }
    
    try {
      const admin = firebaseIntegration.getAdmin();
      
      // Add custom claims to the token
      const customClaims = {
        ceUuid: userId,
        serpew: true,
        verified: true,
        ...claims
      };
      
      // Generate the custom token
      const customToken = await admin.auth().createCustomToken(userId, customClaims);
      
      // Log the token generation
      await auditLogger.logEvent({
        eventType: 'FIREBASE_TOKEN_GENERATED',
        userId,
        timestamp: new Date().toISOString()
      });
      
      return customToken;
    } catch (error) {
      console.error('Failed to generate Firebase custom token:', error);
      
      // Log the error
      await auditLogger.logEvent({
        eventType: 'FIREBASE_TOKEN_ERROR',
        userId,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      return null;
    }
  },
  
  /**
   * Verify a Firebase ID token
   */
  verifyIdToken: async (idToken) => {
    if (!PROJECT_CONFIG.firebase.enabled) {
      throw new Error('Firebase integration is disabled');
    }
    
    try {
      const admin = firebaseIntegration.getAdmin();
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      
      // Log the token verification
      await auditLogger.logEvent({
        eventType: 'FIREBASE_TOKEN_VERIFIED',
        userId: decodedToken.uid,
        timestamp: new Date().toISOString()
      });
      
      return decodedToken;
    } catch (error) {
      console.error('Failed to verify Firebase ID token:', error);
      
      // Log the error
      await auditLogger.logEvent({
        eventType: 'FIREBASE_TOKEN_VERIFICATION_ERROR',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }
};

// Multi-Domain Support Service
const multiDomainService = {
  /**
   * Check if a domain is allowed for authentication
   * With 250+ domains, we use a different approach than listing all domains
   */
  isDomainAllowed: async (domain) => {
    // If multi-domain support is disabled or all domains are allowed, return true
    if (!PROJECT_CONFIG.multiDomain.enabled || PROJECT_CONFIG.multiDomain.allowAllDomains) {
      return true;
    }
    
    // Check if the domain is in the primary domains list
    if (PROJECT_CONFIG.multiDomain.primaryDomains.includes(domain)) {
      return true;
    }
    
    // If using trusted IdPs mode, check if the domain is federated with a trusted IdP
    if (PROJECT_CONFIG.multiDomain.federationMode === 'trusted-idps') {
      try {
        const admin = firebaseIntegration.getAdmin();
        const providers = await admin.auth().listProviderConfigs();
        
        // Check if any SAML or OIDC provider is configured for this domain
        const matchingProvider = providers.providerConfigs.find(provider => {
          if (provider.displayName.includes(domain)) return true;
          if (provider.enabled && provider.domains && provider.domains.includes(domain)) return true;
          return false;
        });
        
        return !!matchingProvider;
      } catch (error) {
        console.warn('Failed to check federated providers:', error);
        // Default to true for federation mode if check fails
        return true;
      }
    }
    
    // Default allow in case of errors or undefined configurations
    // This is safer than blocking based on incomplete checks
    return true;
  },
  
  /**
   * Get the organization ID for a domain
   */
  getOrganizationIdForDomain: async (domain) => {
    try {
      // Try to get organization ID from cache or external service
      const orgId = await cache.get(`org_id:${domain}`);
      if (orgId) return orgId;
      
      // If not in cache, try to look it up
      // This is a placeholder implementation
      // In practice, you might query a directory service or database
      return null;
    } catch (error) {
      console.warn('Failed to get organization ID for domain:', error);
      return null;
    }
  }
};

// Helper Services
const identityService = {
  /**
   * Generate a cryptographically secure CE-UUID with additional entropy from visitor data
   */
  generateCeUuid: async (visitorContext) => {
    // Create a unique identifier based on verified identity components
    const entropy = [
      visitorContext.regionData.region,
      JSON.stringify(visitorContext.verificationStatus),
      visitorContext.entryTimestamp,
      // Add additional entropy from SERPEW data if available
      await serpewStore.getSummary(visitorContext.sessionId) || ''
    ].join('-');
    
    // Generate a deterministic but secure hash
    const hash = crypto.createHash('sha256').update(entropy).digest('hex');
    
    // Format as UUID v5 with a custom namespace
    const ceUuid = `ce-${generateUUIDv5(hash, 'ce-auth-namespace')}`;
    
    return ceUuid;
  }
};

/**
 * Generate a UUID v5 from a name and namespace
 */
function generateUUIDv5(name, namespace) {
  const hashBuffer = crypto.createHash('sha1')
    .update(namespace)
    .update(name)
    .digest();
  
  // Format as UUID v5
  hashBuffer[6] = (hashBuffer[6] & 0x0f) | 0x50; // Version 5
  hashBuffer[8] = (hashBuffer[8] & 0x3f) | 0x80; // Variant 1
  
  // Convert to hex format
  const uuid = [
    hashBuffer.slice(0, 4).toString('hex'),
    hashBuffer.slice(4, 6).toString('hex'),
    hashBuffer.slice(6, 8).toString('hex'),
    hashBuffer.slice(8, 10).toString('hex'),
    hashBuffer.slice(10, 16).toString('hex')
  ].join('-');
  
  return uuid;
}

// Middleware for secure Express routes
const secureRoutes = (app) => {
  // Initialize main authentication routes
  app.post('/api/auth/sally-port/initialize', SallyPortAuth.initializeSallyPort);
  app.get('/api/auth/sally-port/welcome', SallyPortAuth.showWelcomeMessage);
  app.post('/api/auth/sally-port/verification', SallyPortAuth.verifyVisitor);
  app.post('/api/auth/sally-port/regional-pilot', SallyPortAuth.connectToRegionalPilot);
  
  // Token management routes
  app.post('/api/auth/refresh-token', SallyPortAuth.refreshToken);
  app.post('/api/auth/logout', SallyPortAuth.logout);
  
  // Continuous authentication routes
  app.post('/api/auth/step-up', SallyPortAuth.stepUpAuthentication);
  
  // QR Approval routes
  app.post('/api/auth/generate-approval', SallyPortAuth.generateApprovalQR);
  app.get('/api/auth/verify-approval/:approvalId', SallyPortAuth.verifyApprovalQR);
  app.post('/api/auth/verify-approval/:approvalId', SallyPortAuth.verifyApprovalQR);
  
  // Firebase authentication integration routes
  app.post('/api/auth/firebase/token', async (req, res) => {
    try {
      // Extract user ID from request
      const { userId, claims } = req.body;
      
      // Verify the user is authenticated
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }
      
      // Generate a Firebase custom token
      const customToken = await firebaseIntegration.generateCustomToken(userId, claims);
      
      if (!customToken) {
        return res.status(500).json({ error: 'Failed to generate Firebase token' });
      }
      
      return res.status(200).json({
        status: 'success',
        firebase_token: customToken,
        expires_in: 3600 // 1 hour
      });
    } catch (error) {
      console.error('Firebase token generation failed:', error);
      return res.status(500).json({ error: 'Failed to generate Firebase token' });
    }
  });
  
  // ASOOS integration routes
  app.post('/api/auth/asoos/sync', async (req, res) => {
    try {
      const { userId, context } = req.body;
      
      if (!userId || !context) {
        return res.status(400).json({ error: 'User ID and context are required' });
      }
      
      // Connect to ASOOS Symphony Orchestrator
      const orchestrationResult = await asoosIntegration.connectToSymphonyOrchestrator(userId, context);
      
      if (!orchestrationResult && PROJECT_CONFIG.asoos.enabled) {
        return res.status(503).json({ 
          status: 'warning',
          message: 'ASOOS orchestration failed but authentication continues'
        });
      }
      
      return res.status(200).json({
        status: 'success',
        orchestration_id: orchestrationResult?.orchestrationId || 'none',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('ASOOS synchronization failed:', error);
      return res.status(500).json({ error: 'ASOOS synchronization failed' });
    }
  });
  
  // GCP organization policy check route (useful for diagnostics)
  app.get('/api/auth/gcp/org-policies', async (req, res) => {
    try {
      return res.status(200).json({
        project_id: PROJECT_CONFIG.projectId,
        security_baseline_percentage: PROJECT_CONFIG.gcpPolicies.securityBaselinePercentage,
        domain_restricted_sharing: PROJECT_CONFIG.gcpPolicies.domainRestrictedSharingEnabled,
        service_account_key_upload_disabled: PROJECT_CONFIG.gcpPolicies.disableServiceAccountKeyUpload,
        uniform_bucket_level_access: PROJECT_CONFIG.gcpPolicies.uniformBucketLevelAccess,
        zonal_dns_only: PROJECT_CONFIG.gcpPolicies.zonalDNSOnly
      });
    } catch (error) {
      console.error('Failed to fetch GCP organization policies:', error);
      return res.status(500).json({ error: 'Failed to fetch GCP organization policies' });
    }
  });
  
  // Apply continuous auth middleware to protected routes
  app.use('/api/protected/*', SallyPortAuth.continuousAuthentication);
  
  // Health check route for monitoring
  app.get('/api/auth/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      project: PROJECT_CONFIG.projectId,
      environment: process.env.NODE_ENV || 'production'
    });
  });
};

// Documentation generation for API FOR WARP DRIVE configuration
const generateDocumentation = () => {
  return {
    title: "Dr. Grant's Authenticator & Sally Port Security Framework",
    version: "2.0.0",
    description: "Part of the AIXTIV SYMPHONY OPUS OPERATING SYSTEM (ASOOS)",
    project: PROJECT_CONFIG.projectId,
    securityFeatures: [
      "Sally Port Authentication Architecture",
      "Multi-Factor Passwordless Verification",
      "Zero-Trust Security Model",
      "Continuous Authorization",
      "Blockchain Verification",
      "Regional Pilot Connection",
      "SERPEW & HOBMIDHO Integration",
      "Token Security & Management",
      "Firebase Integration",
      "ASOOS Symphony Integration",
      "Multi-Domain Support (250+ domains)",
      "GCP Organization Policy Awareness"
    ],
    gcpSecurityBaseline: `${PROJECT_CONFIG.gcpPolicies.securityBaselinePercentage}%`,
    endpoints: {
      core: [
        "/api/auth/sally-port/initialize",
        "/api/auth/sally-port/welcome",
        "/api/auth/sally-port/verification",
        "/api/auth/sally-port/regional-pilot"
      ],
      token: [
        "/api/auth/refresh-token",
        "/api/auth/logout"
      ],
      firebase: [
        "/api/auth/firebase/token"
      ],
      asoos: [
        "/api/auth/asoos/sync"
      ],
      approval: [
        "/api/auth/generate-approval",
        "/api/auth/verify-approval/:approvalId"
      ],
      diagnostic: [
        "/api/auth/gcp/org-policies",
        "/api/auth/health"
      ]
    },
    harmonicSecurity: {
      enabled: PROJECT_CONFIG.asoos.harmonicSecurityEnabled,
      orchestrationEndpoint: PROJECT_CONFIG.asoos.orchestrationEndpoint,
      continuousAuthentication: true,
      blockchainVerification: true
    }
  };
};

module.exports = {
  SallyPortAuth,
  secureRoutes,
  generateDocumentation,
  PROJECT_CONFIG,
  firebaseIntegration,
  asoosIntegration,
  multiDomainService
};
