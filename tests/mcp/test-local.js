/**
 * Local MCP test - doesn't require deployed functions
 */

const functions = require('../../functions');

// Test Claude code generation
const mockRequest = {
  body: {
    task: "Create a function that calculates factorial",
    language: "javascript"
  }
};

const mockResponse = {
  json: (data) => {
    console.log('Response:', JSON.stringify(data, null, 2));
    return data;
  }
};

// Run the test
console.log('Testing claudeCodeGenerate function locally:');
try {
  functions.claudeCodeGenerate(mockRequest, mockResponse);
  console.log('✅ Local function test successful');
} catch (error) {
  console.error('❌ Local function test failed:', error);
}
