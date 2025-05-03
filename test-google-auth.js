const {google} = require('googleapis');

// Create an auth client for your service account
async function authenticate() {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  
  try {
    const client = await auth.getClient();
    const projectId = await auth.getProjectId();
    
    console.log(`Successfully authenticated with service account!`);
    console.log(`Project ID: ${projectId}`);
    
    // Get access token
    const token = await client.getAccessToken();
    console.log(`Access token: ${token.token.substring(0, 15)}...`);
    
    return {client, projectId};
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
}

authenticate().catch(console.error);
