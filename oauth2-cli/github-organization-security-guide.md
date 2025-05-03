# GitHub Organization Security Guide
## For AI Publishing International LLP (UK)

This guide provides step-by-step instructions for implementing comprehensive security measures for your GitHub organization.

## Two-Factor Authentication (2FA)

### Enabling Organization-wide 2FA Requirement

1. **Navigate to the organization settings**:
   - Go to `https://github.com/organizations/AI-Publishing-International-LLP-UK/settings/security`
   - Sign in as an organization owner

2. **Enable 2FA requirement**:
   - Under "Two-factor authentication", click the checkbox for "Require two-factor authentication for everyone in the AI Publishing International LLP (UK) organization"
   - Review the warning about users without 2FA being unable to access resources
   - Click "Save" to confirm

3. **Monitor the transition**:
   - Members without 2FA will receive an email notification
   - They'll have 24 hours to set up 2FA before losing access to repositories
   - They will remain organization members but cannot access resources until 2FA is enabled
   - Outside collaborators without 2FA will be automatically removed

4. **Help users set up 2FA**:
   - Send them to: `https://docs.github.com/en/authentication/securing-your-account-with-two-factor-authentication-2fa`
   - Supported 2FA methods include:
     - TOTP apps (like Microsoft Authenticator, Google Authenticator)
     - SMS authentication
     - Security keys (FIDO U2F)

### Impact Assessment

Before enabling this requirement:
- Review organization membership at: `https://github.com/orgs/AI-Publishing-International-LLP-UK/people`
- Check who doesn't have 2FA enabled (they'll have a "2FA not enabled" label)
- Communicate the change to all organization members with ample time to comply

## SAML Single Sign-On Implementation

### Prerequisites
- GitHub Enterprise Cloud subscription
- Identity Provider (IdP) with SAML 2.0 support
- Administrative access to both GitHub and your IdP

### Setup Process

1. **Configure your Identity Provider (IdP)**:
   - Entity ID/Issuer: `https://github.com/orgs/AI-Publishing-International-LLP-UK`
   - Assertion Consumer Service (ACS) URL: `https://github.com/orgs/AI-Publishing-International-LLP-UK/saml/consume`
   - Audience: `https://github.com/orgs/AI-Publishing-International-LLP-UK`
   - Configure user attribute mappings:
     - NameID: User's email address
     - Email addresses (optional): User's email addresses
   - Generate and download SAML certificate

2. **Configure GitHub**:
   - Navigate to: `https://github.com/organizations/AI-Publishing-International-LLP-UK/settings/security`
   - Click "Enable SAML authentication"
   - Enter the following information from your IdP:
     - Sign on URL: The SSO URL from your IdP
     - Issuer: The Entity ID from your IdP
     - Public certificate: Paste the X.509 certificate from your IdP
   - Click "Test SAML configuration" to verify the settings
   - Once verified, click "Save"

3. **Enforce SAML SSO** (after testing):
   - Return to the security settings
   - Check "Require SAML SSO authentication for all members"
   - Click "Save"

### Integration with IP Allow List

From your settings, we can see you have the Claude for GitHub app installed, which has defined its own IP allow list entries. These entries are currently disabled.

To properly integrate your SAML SSO with the IP allow list:

1. **Review the IP allow list entries**:
   - Go to: `https://github.com/organizations/AI-Publishing-International-LLP-UK/settings/security`
   - Scroll down to "IP allow list"

2. **Enable IP allow list**:
   - Click "Enable IP allow list"
   - Check "Enable IP allow list configuration for installed GitHub Apps"
   - This will allow the Claude for GitHub app to function correctly with your security settings

3. **Activate necessary IPs**:
   - Enable the IP ranges managed by the Claude for GitHub app
   - Consider adding your organization's office IP ranges

## Best Practices for Managing This Setup

### Recovery Planning

1. **Set up recovery codes for SAML SSO**:
   - Store these securely in a password manager or secure physical location
   - Ensure multiple organization owners have access to recovery codes

2. **Establish emergency access procedures**:
   - Document the process for emergency access if SAML authentication fails
   - Assign specific administrators with knowledge of recovery procedures

### Monitoring and Maintenance

1. **Regular review of access**:
   - Monthly audit of organization members and their access levels
   - Quarterly review of outside collaborators

2. **Certificate rotation**:
   - Set calendar reminders for SAML certificate expiration
   - Plan to rotate certificates at least 30 days before expiration

3. **Setting up alerts**:
   - Configure email alerts for authentication failures
   - Monitor login attempts from unauthorized IP addresses

## Implementation Timeline

### Week 1: Preparation
- Communicate upcoming changes to all organization members
- Conduct inventory of users without 2FA
- Prepare documentation for users to set up 2FA

### Week 2: 2FA Implementation
- Enable 2FA requirement
- Provide support to users enabling 2FA
- Monitor compliance and access issues

### Week 3: SAML SSO Setup
- Configure IdP settings
- Set up SAML in GitHub (test mode)
- Test with a small group of users

### Week 4: Full Deployment
- Enable SAML SSO enforcement
- Activate IP allow list
- Document final configuration

## Additional Security Recommendations

### Branch Protection
- Implement branch protection rules for critical repositories
- Require pull request reviews before merging
- Enforce status checks before merging

### Dependency Management
- Enable Dependabot alerts
- Set up automatic security updates
- Regular dependency review

### Secret Scanning
- Enable GitHub secret scanning
- Set up alerts for detected secrets
- Create workflow for rotating exposed secrets

For help implementing these measures, contact GitHub support or your account manager.
