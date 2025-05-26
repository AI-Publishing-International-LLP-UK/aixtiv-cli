// Test script for Firestore agent access functionality
const { scanResources } = require('./lib/firestore');

async function testAgentAccess() {
  console.log('Testing Firestore agent access functionality...');
  
  try {
    // Scan resources without filters to get all resources
    const result = await scanResources();
    console.log('Resource scan result:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log(`✅ Successfully scanned ${result.resources.length} resources.`);
      
      // Print a summary of the resources
      console.log('\nResource Summary:');
      result.resources.forEach((resource, index) => {
        console.log(`${index + 1}. ${resource.name} (${resource.resourceId}) - ${resource.authorizedAgents.length} agents`);
      });
    } else {
      console.log('❌ Resource scan failed:', result.message);
    }
  } catch (error) {
    console.error('❌ Error scanning resources:', error);
  }
}

// Run the test
testAgentAccess();

