// Test script for Firestore functionality
const { verifyAuthentication } = require('./lib/firestore');

async function testFirestore() {
  console.log('Testing Firestore connection and SalleyPort functionality...');
  
  try {
    // Check system status
    const result = await verifyAuthentication();
    console.log('Verification result:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ Firestore connection successful!');
    } else {
      console.log('❌ Firestore verification failed:', result.message);
    }
  } catch (error) {
    console.error('❌ Error testing Firestore:', error);
  }
}

// Run the test
testFirestore();

