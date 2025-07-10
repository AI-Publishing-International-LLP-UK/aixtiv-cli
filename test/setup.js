/**
 * Test Setup Configuration
 *
 * This file configures the testing environment for the Aixtiv CLI ecosystem,
 * particularly for the DIDC (Dewey Digital Index Cards) and related components.
 */

// Import required testing libraries
const chai = require('chai');
const sinon = require('sinon');
const chaiAsPromised = require('chai-as-promised');
const sinonChai = require('sinon-chai');

// Import Firebase and Firestore
const { initializeApp } = require('firebase/app');
const { getFirestore, connectFirestoreEmulator } = require('@firebase/firestore');

// Configure Chai
chai.use(chaiAsPromised); // Enables handling of promises in assertions
chai.use(sinonChai); // Enables Sinon-specific assertions

// Export globally accessible testing tools
global.expect = chai.expect;
global.assert = chai.assert;
global.sinon = sinon;

// Test environment configuration
process.env.NODE_ENV = 'test';

// Initialize Firebase for testing
const useRealFirestore = process.env.TEST_USE_REAL_FIRESTORE === 'true';

// Firebase configuration for testing
const firebaseConfig = {
  apiKey: 'test-api-key',
  authDomain: 'test-project-id.firebaseapp.com',
  projectId: 'test-project-id',
  storageBucket: 'test-project-id.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abcdef1234567890',
  // Specify us-west1 region
  locationId: 'us-west1',
};

// Initialize real Firestore if enabled
let firestore = null;
if (useRealFirestore) {
  try {
    const app = initializeApp(firebaseConfig);
    firestore = getFirestore(app);

    // Connect to Firestore emulator if FIRESTORE_EMULATOR_HOST is set
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
      connectFirestoreEmulator(firestore, host, parseInt(port, 10));
      console.info(`Connected to Firestore emulator at ${process.env.FIRESTORE_EMULATOR_HOST}`);
    }
    console.info('Using real Firestore for tests');
  } catch (error) {
    console.warn('Failed to initialize real Firestore, falling back to mock:', error);
    useRealFirestore = false;
  }
}

// Silence console logs during tests unless explicitly needed
if (!process.env.DEBUG_TESTS) {
  global.console.log = () => {};
  global.console.info = () => {};
  // Keep warnings and errors for debugging
  // global.console.warn = () => {};
  // global.console.error = () => {};
}

// Firestore mock implementation
const createFirestoreMock = () => ({
  collection: sinon.stub().returnsThis(),
  doc: sinon.stub().returnsThis(),
  set: sinon.stub().resolves(),
  get: sinon.stub().resolves({
    exists: true,
    data: () => ({}),
  }),
  update: sinon.stub().resolves(),
  delete: sinon.stub().resolves(),
  where: sinon.stub().returnsThis(),
  orderBy: sinon.stub().returnsThis(),
  limit: sinon.stub().returnsThis(),
  onSnapshot: sinon.stub().returns(() => {}),
  query: sinon.stub().returnsThis(),
  startAfter: sinon.stub().returnsThis(),
  endBefore: sinon.stub().returnsThis(),
});

// Use real or mock Firestore based on environment setting
global.firestore = useRealFirestore ? firestore : null;
global.firestoreMock = createFirestoreMock();

// Helper function to reset all test stubs/mocks between tests
global.resetTestMocks = () => {
  sinon.restore();

  // Reinitialize mocks if needed after restore
  global.firestoreMock = createFirestoreMock();
};

// Commonly used test fixtures/helpers
global.createTestDocument = (metadata = {}) => ({
  id: 'test-doc-' + Date.now(),
  content: 'This is test document content',
  metadata: {
    title: 'Test Document',
    author: 'Test Author',
    created: new Date().toISOString(),
    ...metadata,
  },
  vectorEmbedding: new Array(128).fill(0).map(() => Math.random()),
});

// Add mock for Flight Memory System
global.fmsMock = {
  storeMemory: sinon.stub().resolves({ id: 'memory-id' }),
  retrieveMemory: sinon.stub().resolves({ data: {} }),
  updateMemory: sinon.stub().resolves(true),
  queryMemories: sinon.stub().resolves([]),
};

// Setup afterEach hook to reset mocks
afterEach(() => {
  resetTestMocks();
});

// Export module for explicit imports if needed
module.exports = {
  chai,
  expect: chai.expect,
  assert: chai.assert,
  sinon,
  firestore: global.firestore,
  firestoreMock: global.firestoreMock,
  fmsMock: global.fmsMock,
  resetTestMocks: global.resetTestMocks,
  createTestDocument: global.createTestDocument,
  isUsingRealFirestore: useRealFirestore,
  getFirestore: () =>
    useRealFirestore && global.firestore ? global.firestore : global.firestoreMock,
};
