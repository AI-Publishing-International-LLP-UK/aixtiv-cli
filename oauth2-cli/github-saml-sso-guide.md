# GitHub SAML SSO Setup Guide

## Prerequisites

- **GitHub Enterprise Cloud** or **GitHub Enterprise Server** subscription
- A SAML 2.0 compatible identity provider (IdP) like Okta, Azure AD, OneLogin, etc.

## Step 1: Configure Your Identity Provider

### For Any IdP, Use These Settings:

- **Entity ID/Issuer**: `https://github.com/orgs/{your_organization}`
- **ACS/Reply URL**: `https://github.com/orgs/{your_organization}/saml/consume`
- **Attribute Statements**: 
  - `NameID`: User's username or email
  - `emails`: User's email addresses

## Step 2: Configure GitHub Organization

1. Go to your organization's settings: `https://github.com/organizations/{your_organization}/settings`
2. Navigate to Security → SAML single sign-on
3. Configure using info from your IdP:
   - Sign on URL
   - Issuer
   - Public Certificate
4. Test the configuration before enabling

## Step 3: Link Visualization

Create a simple visualization dashboard to monitor your SAML links:

```html
<!DOCTYPE html>
<html>
<head>
    <title>SAML Link Visualization</title>
    <style>
        body { font-family: Arial; margin: 20px; }
        .card { border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 4px; }
        .success { border-left: 4px solid green; }
        .pending { border-left: 4px solid orange; }
        .dashboard { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; }
        .flow-diagram { width: 100%; height: auto; margin: 20px 0; }
    </style>
</head>
<body>
    <h1>SAML SSO Status Dashboard</h1>
    
    <div class="dashboard">
        <div class="card">
            <h3>Active SAML Sessions</h3>
            <p id="active-count">14</p>
        </div>
        <div class="card">
            <h3>Users Pending SSO</h3>
            <p id="pending-count">3</p>
        </div>
    </div>

    <h2>Authentication Flow</h2>
    <img class="flow-diagram" src="https://mermaid.ink/img/pako:eNp1kcFqwzAQRH9F7CmFQP7AhxQa6KGUQi499LRIq7UtiC2hldKE4H-v5LhO2tLVzs68ZdidaMkU0gEfxPBmnZwoPsZ7YYzlIMaXl81-ow-gDw_QTDM49quLd0dWYPYIeQlnEOt3EHJd9S26UJ2Cr5KuwfVlsV1fYHl-4eCuVj5S3GgozxOFoT5XDdLnC_5wtgNtvEzc9YPi4GJGhWOqiZNQ1lUW5S-F5eIdGBcTa8mFYVc-GnW8eTJu29RtT8fh3LuGTuLvF0zEtYOvE_VCG7wUqRO5oiikaEMWtOBJn6QdpUEqSLyUl0rkKM0FnX0bGqQZBP7G40BhOEj4PqLQRy81Bvat9CWHf5GYp1U?type=png" alt="SAML Flow Diagram">
</body>
</html>
```

## Monitoring Your SAML SSO Setup

1. Create a GitHub OAuth App for API access
2. Use the following API endpoint to monitor SSO status:
   ```
   GET /orgs/{org}/team-synchronization
   ```
3. Set up automated health checks for your SSO connection

## Troubleshooting Common Issues

- **Certificate Expiration**: SAML certificates typically expire annually
- **Clock Skew**: Ensure time synchronization between GitHub and your IdP
- **Attribute Mapping**: Verify correct mapping of user attributes

## Additional Resources

- [GitHub SAML Documentation](https://docs.github.com/en/enterprise-cloud@latest/organizations/managing-saml-single-sign-on-for-your-organization)
- [SAML Test Validator](https://www.samltool.com/validate_response.php)
- [GitHub REST API Documentation](https://docs.github.com/en/rest/reference)
