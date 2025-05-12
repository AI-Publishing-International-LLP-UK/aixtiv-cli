/**
 * Test script for Pinecone integration in Aixtiv CLI Owner-Subscriber V1-V2 Immersive System
 * 
 * This script tests the Pinecone vector database integration functionality,
 * including embedding generation, vector storage, and semantic search.
 * 
 * @module test-pinecone
 * @author Aixtiv Symphony Team
 * @copyright 2025 AI Publishing International LLP
 * @version 1.0.0
 */

require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const {
  initPinecone,
  generateEmbeddings,
  createIndexIfNotExists,
  storeInPinecone,
  searchPinecone,
  deleteFromPinecone,
  storeMemoryInPinecone,
  storePromptInPinecone,
  searchSimilarMemories,
  searchSimilarPrompts
} = require('../src/functions/pineconeIntegration');

// Set environment variables for testing
process.env.PINECONE_API_KEY = process.env.PINECONE_API_KEY || 'your-pinecone-api-key';
process.env.PINECONE_ENVIRONMENT = process.env.PINECONE_ENVIRONMENT || 'us-west1-gcp';
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'your-openai-api-key';

// Test index names
const TEST_MEMORY_INDEX = 'test-aixtiv-memories';
const TEST_PROMPT_INDEX = 'test-aixtiv-prompts';

/**
 * Test embedding generation
 */
async function testEmbeddingGeneration() {
  console.log('\n--- Testing Embedding Generation ---');
  
  try {
    const sampleTexts = [
      'This is a test of the embedding generation functionality.',
      'We need to verify that OpenAI embeddings work correctly.'
    ];
    
    console.log(`Generating embeddings for ${sampleTexts.length} texts...`);
    const embeddings = await generateEmbeddings(sampleTexts);
    
    if (!embeddings || !Array.isArray(embeddings) || embeddings.length !== sampleTexts.length) {
      console.error('❌ Failed to generate embeddings or incorrect number of embeddings returned');
      return false;
    }
    
    // Check embedding dimensions
    const dimensions = embeddings[0].length;
    console.log(`Embeddings generated successfully. Dimension: ${dimensions}`);
    
    if (dimensions !== 1536) {
      console.warn('⚠️ Warning: Embedding dimension is not 1536 as expected for OpenAI ada-002 model');
    }
    
    console.log('✅ Embedding generation test passed');
    return true;
  } catch (error) {
    console.error('❌ Embedding generation test failed:', error);
    return false;
  }
}

/**
 * Test index creation
 */
async function testIndexCreation() {
  console.log('\n--- Testing Index Creation ---');
  
  try {
    console.log(`Creating test memory index: ${TEST_MEMORY_INDEX}...`);
    const memoryIndexCreated = await createIndexIfNotExists(TEST_MEMORY_INDEX);
    
    console.log(`Creating test prompt index: ${TEST_PROMPT_INDEX}...`);
    const promptIndexCreated = await createIndexIfNotExists(TEST_PROMPT_INDEX);
    
    if (!memoryIndexCreated || !promptIndexCreated) {
      console.error('❌ Failed to create one or both test indexes');
      return false;
    }
    
    console.log('✅ Index creation test passed');
    return true;
  } catch (error) {
    console.error('❌ Index creation test failed:', error);
    return false;
  }
}

/**
 * Test storing vectors in Pinecone
 */
async function testVectorStorage() {
  console.log('\n--- Testing Vector Storage ---');
  
  try {
    const testItems = [
      {
        id: `test-memory-${uuidv4()}`,
        text: 'This is a test memory that should be stored in Pinecone.',
        metadata: {
          userId: 'test-user-123',
          sessionId: 'test-session-123',
          copilotId: 'test-copilot-123',
          type: 'user_input',
          category: 'test',
          importance: 7,
          timestamp: new Date().toISOString()
        }
      },
      {
        id: `test-memory-${uuidv4()}`,
        text: 'This is another test memory with different content.',
        metadata: {
          userId: 'test-user-123',
          sessionId: 'test-session-123',
          copilotId: 'test-copilot-456',
          type: 'copilot_response',
          category: 'test',
          importance: 5,
          timestamp: new Date().toISOString()
        }
      }
    ];
    
    console.log(`Storing ${testItems.length} test vectors in ${TEST_MEMORY_INDEX}...`);
    const storageResult = await storeInPinecone(TEST_MEMORY_INDEX, testItems);
    
    if (!storageResult) {
      console.error('❌ Failed to store vectors in Pinecone');
      return false;
    }
    
    // Store the IDs for cleanup later
    const testItemIds = testItems.map(item => item.id);
    console.log(`Stored ${testItems.length} vectors with IDs: ${testItemIds.join(', ')}`);
    
    console.log('✅ Vector storage test passed');
    return testItemIds;
  } catch (error) {
    console.error('❌ Vector storage test failed:', error);
    return false;
  }
}

/**
 * Test semantic search in Pinecone
 */
async function testSemanticSearch(testItemIds) {
  console.log('\n--- Testing Semantic Search ---');
  
  try {
    if (!testItemIds || testItemIds.length === 0) {
      console.error('❌ No test item IDs provided for search test');
      return false;
    }
    
    const searchQuery = 'Test memory in Pinecone';
    console.log(`Searching for: "${searchQuery}" in ${TEST_MEMORY_INDEX}...`);
    
    const searchResults = await searchPinecone(
      TEST_MEMORY_INDEX, 
      searchQuery,
      { userId: 'test-user-123' },
      10
    );
    
    if (!searchResults || !Array.isArray(searchResults)) {
      console.error('❌ Failed to get search results or invalid results format');
      return false;
    }
    
    console.log(`Search returned ${searchResults.length} results`);
    
    if (searchResults.length === 0) {
      console.warn('⚠️ Warning: No search results returned');
    } else {
      // Print top result
      const topResult = searchResults[0];
      console.log('Top result:');
      console.log(`- ID: ${topResult.id}`);
      console.log(`- Score: ${topResult.score}`);
      console.log(`- Metadata: ${JSON.stringify(topResult.metadata)}`);
    }
    
    console.log('✅ Semantic search test passed');
    return true;
  } catch (error) {
    console.error('❌ Semantic search test failed:', error);
    return false;
  }
}

/**
 * Test storing a memory
 */
async function testStoreMemory() {
  console.log('\n--- Testing Memory Storage ---');
  
  try {
    const testMemory = {
      id: `test-memory-${uuidv4()}`,
      content: 'This is a test memory from the memory-specific storage function.',
      userId: 'test-user-123',
      sessionId: 'test-session-123',
      copilotId: 'test-copilot-123',
      type: 'user_input',
      category: 'test',
      importance: 7,
      timestamp: new Date().toISOString(),
      metadata: {
        testKey: 'testValue',
        source: 'memory-test'
      }
    };
    
    console.log(`Storing test memory with ID: ${testMemory.id}...`);
    const storageResult = await storeMemoryInPinecone(testMemory);
    
    if (!storageResult) {
      console.error('❌ Failed to store memory in Pinecone');
      return false;
    }
    
    console.log('✅ Memory storage test passed');
    return testMemory.id;
  } catch (error) {
    console.error('❌ Memory storage test failed:', error);
    return false;
  }
}

/**
 * Test storing a prompt
 */
async function testStorePrompt() {
  console.log('\n--- Testing Prompt Storage ---');
  
  try {
    const testPrompt = {
      id: `test-prompt-${uuidv4()}`,
      content: 'This is a test prompt from the prompt-specific storage function.',
      userId: 'test-user-123',
      agentId: 'test-agent-123',
      type: 'text_prompt',
      category: 'test',
      timestamp: new Date().toISOString(),
      metadata: {
        testKey: 'testValue',
        source: 'prompt-test'
      }
    };
    
    console.log(`Storing test prompt with ID: ${testPrompt.id}...`);
    const storageResult = await storePromptInPinecone(testPrompt);
    
    if (!storageResult) {
      console.error('❌ Failed to store prompt in Pinecone');
      return false;
    }
    
    console.log('✅ Prompt storage test passed');
    return testPrompt.id;
  } catch (error) {
    console.error('❌ Prompt storage test failed:', error);
    return false;
  }
}

/**
 * Test searching for similar memories
 */
async function testSearchSimilarMemories() {
  console.log('\n--- Testing Similar Memory Search ---');
  
  try {
    const searchQuery = 'User input about testing';
    console.log(`Searching for memories similar to: "${searchQuery}"...`);
    
    const searchResults = await searchSimilarMemories(
      searchQuery,
      { userId: 'test-user-123' },
      5
    );
    
    if (!searchResults || !Array.isArray(searchResults)) {
      console.error('❌ Failed to get similar memory results or invalid results format');
      return false;
    }
    
    console.log(`Search returned ${searchResults.length} similar memories`);
    
    if (searchResults.length === 0) {
      console.warn('⚠️ Warning: No similar memories found');
    } else {
      // Print top result
      const topResult = searchResults[0];
      console.log('Top similar memory:');
      console.log(`- ID: ${topResult.id}`);
      console.log(`- Score: ${topResult.score}`);
      console.log(`- Metadata: ${JSON.stringify(topResult.metadata)}`);
    }
    
    console.log('✅ Similar memory search test passed');
    return true;
  } catch (error) {
    console.error('❌ Similar memory search test failed:', error);
    return false;
  }
}

/**
 * Test searching for similar prompts
 */
async function testSearchSimilarPrompts() {
  console.log('\n--- Testing Similar Prompt Search ---');
  
  try {
    const searchQuery = 'Text prompt for testing';
    console.log(`Searching for prompts similar to: "${searchQuery}"...`);
    
    const searchResults = await searchSimilarPrompts(
      searchQuery,
      { userId: 'test-user-123' },
      5
    );
    
    if (!searchResults || !Array.isArray(searchResults)) {
      console.error('❌ Failed to get similar prompt results or invalid results format');
      return false;
    }
    
    console.log(`Search returned ${searchResults.length} similar prompts`);
    
    if (searchResults.length === 0) {
      console.warn('⚠️ Warning: No similar prompts found');
    } else {
      // Print top result
      const topResult = searchResults[0];
      console.log('Top similar prompt:');
      console.log(`- ID: ${topResult.id}`);
      console.log(`- Score: ${topResult.score}`);
      console.log(`- Metadata: ${JSON.stringify(topResult.metadata)}`);
    }
    
    console.log('✅ Similar prompt search test passed');
    return true;
  } catch (error) {
    console.error('❌ Similar prompt search test failed:', error);
    return false;
  }
}

/**
 * Test deleting vectors from Pinecone
 */
async function testDeletion(ids, indexName) {
  console.log(`\n--- Testing Vector Deletion from ${indexName} ---`);
  
  try {
    if (!ids || ids.length === 0) {
      console.error('❌ No IDs provided for deletion test');
      return false;
    }
    
    console.log(`Deleting ${ids.length} vectors with IDs: ${ids.join(', ')}...`);
    const deletionResult = await deleteFromPinecone(indexName, ids);
    
    if (!deletionResult) {
      console.error(`❌ Failed to delete vectors from ${indexName}`);
      return false;
    }
    
    console.log('✅ Vector deletion test passed');
    return true;
  } catch (error) {
    console.error('❌ Vector deletion test failed:', error);
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('=== Starting Pinecone Integration Tests ===');
  
  // Test embedding generation
  const embeddingsResult = await testEmbeddingGeneration();
  if (!embeddingsResult) {
    console.error('❌ Embedding generation failed, stopping tests');
    return;
  }
  
  // Test index creation
  const indexResult = await testIndexCreation();
  if (!indexResult) {
    console.error('❌ Index creation failed, stopping tests');
    return;
  }
  
  // Test vector storage
  const storageIds = await testVectorStorage();
  if (!storageIds) {
    console.error('❌ Vector storage failed, stopping tests');
    return;
  }
  
  // Test semantic search
  const searchResult = await testSemanticSearch(storageIds);
  if (!searchResult) {
    console.error('❌ Semantic search failed, continuing with other tests');
  }
  
  // Test memory storage
  const memoryId = await testStoreMemory();
  if (!memoryId) {
    console.error('❌ Memory storage failed, continuing with other tests');
  }
  
  // Test prompt storage
  const promptId = await testStorePrompt();
  if (!promptId) {
    console.error('❌ Prompt storage failed, continuing with other tests');
  }
  
  // Test similar memory search
  const similarMemoriesResult = await testSearchSimilarMemories();
  if (!similarMemoriesResult) {
    console.error('❌ Similar memory search failed, continuing with other tests');
  }
  
  // Test similar prompt search
  const similarPromptsResult = await testSearchSimilarPrompts();
  if (!similarPromptsResult) {
    console.error('❌ Similar prompt search failed, continuing with other tests');
  }
  
  // Clean up test data
  const memoryCleanupResult = await testDeletion(storageIds, TEST_MEMORY_INDEX);
  if (!memoryCleanupResult) {
    console.error('❌ Memory vector deletion failed');
  }
  
  if (memoryId) {
    const singleMemoryCleanupResult = await testDeletion([memoryId], 'aixtiv-memories');
    if (!singleMemoryCleanupResult) {
      console.error('❌ Single memory deletion failed');
    }
  }
  
  if (promptId) {
    const singlePromptCleanupResult = await testDeletion([promptId], 'aixtiv-prompts');
    if (!singlePromptCleanupResult) {
      console.error('❌ Single prompt deletion failed');
    }
  }
  
  console.log('\n=== Pinecone Integration Tests Completed ===');
}

// Run the tests
runTests().catch(console.error);