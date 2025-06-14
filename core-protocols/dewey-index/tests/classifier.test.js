/**
 * DI:DC (Dewey Digital Index Cards) Solution - Classifier Tests
 * 
 * This test file validates the core functionality of the DI:DC classifier:
 * 1. Basic classification test
 * 2. Tag extraction test
 * 3. Taxonomy management test
 * 4. Integration with FMS test
 */

const { expect } = require('chai');
const sinon = require('sinon');
const path = require('path');

// Import the classifier module
// Adjust path if needed based on actual implementation
const { DeweyClassifier } = require('../classifier');

// Mock the FMS (Flight Memory System)
const mockFMS = {
  storeMemory: sinon.stub().returns({ id: 'mock-memory-id', timestamp: new Date().toISOString() }),
  retrieveMemory: sinon.stub().returns({ id: 'mock-memory-id', found: true, data: {} })
};

describe('DI:DC - Classifier Tests', () => {
  let classifier;

  beforeEach(() => {
    // Create a fresh classifier instance before each test
    classifier = new DeweyClassifier({ fms: mockFMS });
    
    // Reset the FMS mock calls between tests
    mockFMS.storeMemory.resetHistory();
    mockFMS.retrieveMemory.resetHistory();
  });

  describe('1. Basic Classification Tests', () => {
    it('should classify a technology document correctly', async () => {
      const document = {
        id: 'tech-doc-123',
        content: 'This document discusses JavaScript frameworks like React and Angular, as well as backend technologies like Node.js and Express.',
        metadata: {
          title: 'Modern Web Development',
          author: 'Jane Developer',
          createdAt: new Date().toISOString()
        }
      };

      const result = await classifier.classify(document);

      expect(result).to.be.an('object');
      expect(result.primaryCategory).to.equal('Technology/Web Development');
      expect(result.confidence).to.be.above(0.7);
      expect(result.secondaryCategories).to.be.an('array');
      expect(result.processingTime).to.be.a('number');
    });

    it('should classify a business document correctly', async () => {
      const document = {
        id: 'biz-doc-456',
        content: 'This quarterly report outlines our financial performance, market strategy, and revenue projections for the next fiscal year.',
        metadata: {
          title: 'Q2 2025 Financial Report',
          author: 'Finance Team',
          createdAt: new Date().toISOString()
        }
      };

      const result = await classifier.classify(document);

      expect(result).to.be.an('object');
      expect(result.primaryCategory).to.equal('Business/Financial');
      expect(result.confidence).to.be.above(0.7);
      expect(result.secondaryCategories).to.be.an('array');
    });

    it('should handle documents with mixed content appropriately', async () => {
      const document = {
        id: 'mixed-doc-789',
        content: 'This technical whitepaper discusses the business implications of implementing AI solutions in healthcare organizations.',
        metadata: {
          title: 'AI in Healthcare: Technical and Business Perspectives',
          author: 'Research Team',
          createdAt: new Date().toISOString()
        }
      };

      const result = await classifier.classify(document);

      expect(result).to.be.an('object');
      expect(result.primaryCategory).to.be.a('string');
      expect(result.secondaryCategories).to.be.an('array');
      expect(result.secondaryCategories.length).to.be.at.least(2);
    });
  });

  describe('2. Tag Extraction Tests', () => {
    it('should extract relevant tags from document content', async () => {
      const document = {
        id: 'tag-test-123',
        content: 'Machine learning models can be used for natural language processing tasks like sentiment analysis and text classification.',
        metadata: {
          title: 'Introduction to NLP',
          author: 'AI Researcher',
          createdAt: new Date().toISOString()
        }
      };

      const result = await classifier.extractTags(document);

      expect(result).to.be.an('object');
      expect(result.tags).to.be.an('array');
      expect(result.tags).to.include.members(['machine learning', 'nlp', 'natural language processing', 'sentiment analysis', 'classification']);
      expect(result.tagScores).to.be.an('object');
      expect(Object.keys(result.tagScores)).to.have.lengthOf.at.least(3);
    });

    it('should score tags based on relevance to the document', async () => {
      const document = {
        id: 'tag-score-test-456',
        content: 'React is a JavaScript library for building user interfaces. React makes it painless to create interactive UIs.',
        metadata: {
          title: 'Introduction to React',
          author: 'Web Developer',
          createdAt: new Date().toISOString()
        }
      };

      const result = await classifier.extractTags(document);

      expect(result.tagScores).to.be.an('object');
      expect(result.tagScores['react']).to.be.above(0.8);
      expect(result.tagScores['javascript']).to.be.above(0.5);
      expect(result.tags).to.include.members(['react', 'javascript', 'ui', 'user interface']);
    });

    it('should associate tags with the correct categories', async () => {
      const document = {
        id: 'tag-category-test-789',
        content: 'Python is widely used in data science for its simplicity and powerful libraries like pandas and scikit-learn.',
        metadata: {
          title: 'Python for Data Science',
          author: 'Data Scientist',
          createdAt: new Date().toISOString()
        }
      };

      // First classify the document
      const classifyResult = await classifier.classify(document);
      // Then extract tags
      const tagResult = await classifier.extractTags(document);

      expect(classifyResult.primaryCategory).to.include('Technology');
      expect(tagResult.categoryTags).to.be.an('object');
      expect(tagResult.categoryTags[classifyResult.primaryCategory]).to.include.members(['python', 'data science']);
    });
  });

  describe('3. Taxonomy Management Tests', () => {
    it('should create a new taxonomy successfully', () => {
      const taxonomyConfig = {
        name: 'Marketing',
        description: 'Marketing related categories',
        categories: [
          {
            name: 'Digital Marketing',
            keywords: ['seo', 'ppc', 'social media', 'email marketing']
          },
          {
            name: 'Content Marketing',
            keywords: ['blog', 'whitepaper', 'case study', 'ebook']
          }
        ]
      };

      const result = classifier.createTaxonomy(taxonomyConfig);

      expect(result).to.be.an('object');
      expect(result.success).to.be.true;
      expect(result.taxonomyId).to.be.a('string');
      expect(mockFMS.storeMemory.calledOnce).to.be.true;
    });

    it('should update an existing taxonomy', () => {
      // First create a taxonomy
      const taxonomyConfig = {
        name: 'Test Taxonomy',
        description: 'Test description',
        categories: [{ name: 'Category 1', keywords: ['test'] }]
      };
      const createResult = classifier.createTaxonomy(taxonomyConfig);
      
      // Then update it
      const updateResult = classifier.updateTaxonomy({
        taxonomyId: createResult.taxonomyId,
        name: 'Updated Test Taxonomy',
        description: 'Updated description',
        categories: [
          { name: 'Category 1', keywords: ['test', 'updated'] },
          { name: 'New Category', keywords: ['new'] }
        ]
      });

      expect(updateResult).to.be.an('object');
      expect(updateResult.success).to.be.true;
      expect(mockFMS.storeMemory.calledTwice).to.be.true;
    });

    it('should add a category to a taxonomy', () => {
      // Create a taxonomy
      const taxonomyConfig = {
        name: 'Category Test',
        description: 'Testing category management',
        categories: [{ name: 'Initial Category', keywords: ['initial'] }]
      };
      const createResult = classifier.createTaxonomy(taxonomyConfig);
      
      // Add a new category
      const result = classifier.addCategory({
        taxonomyId: createResult.taxonomyId,
        name: 'New Category',
        path: 'Category Test',
        keywords: ['new', 'category', 'test']
      });

      expect(result).to.be.an('object');
      expect(result.success).to.be.true;
      expect(result.categoryId).to.be.a('string');
    });

    it('should find categories in a hierarchical taxonomy', () => {
      // Create a taxonomy with nested categories
      const taxonomyConfig = {
        name: 'Hierarchical Test',
        description: 'Testing hierarchical categories',
        categories: [
          { 
            name: 'Parent Category', 
            keywords: ['parent'],
            subcategories: [
              { name: 'Child Category 1', keywords: ['child1'] },
              { name: 'Child Category 2', keywords: ['child2'] }
            ]
          }
        ]
      };
      const createResult = classifier.createTaxonomy(taxonomyConfig);
      
      // Find a child category
      const result = classifier.findCategory({
        taxonomyId: createResult.taxonomyId,
        path: 'Parent Category/Child Category 1'
      });

      expect(result).to.be.an('object');
      expect(result.found).to.be.true;
      expect(result.category).to.be.an('object');
      expect(result.category.name).to.equal('Child Category 1');
      expect(result.category.keywords).to.include('child1');
    });
  });

  describe('4. Integration with FMS Tests', () => {
    it('should store classification results in FMS', async () => {
      const document = {
        id: 'fms-test-123',
        content: 'This is a test document for FMS integration.',
        metadata: {
          title: 'FMS Test',
          author: 'Test User',
          createdAt: new Date().toISOString()
        }
      };

      await classifier.classify(document, { storeTofms: true });

      expect(mockFMS.storeMemory.calledOnce).to.be.true;
      const fmsCallArg = mockFMS.storeMemory.firstCall.args[0];
      expect(fmsCallArg).to.be.an('object');
      expect(fmsCallArg.type).to.equal('classification');
      expect(fmsCallArg.documentId).to.equal('fms-test-123');
    });

    it('should retrieve taxonomy definitions from FMS', async () => {
      // Mock the FMS to return a taxonomy definition
      mockFMS.retrieveMemory.returns({
        id: 'taxonomy-123',
        found: true,
        data: {
          type: 'taxonomy',
          name: 'Retrieved Taxonomy',
          categories: [
            { name: 'Retrieved Category', keywords: ['retrieved'] }
          ]
        }
      });

      const result = await classifier.loadTaxonomy('taxonomy-123');

      expect(mockFMS.retrieveMemory.calledOnce).to.be.true;
      expect(result).to.be.an('object');
      expect(result.name).to.equal('Retrieved Taxonomy');
      expect(result.categories).to.be.an('array');
      expect(result.categories[0].name).to.equal('Retrieved Category');
    });

    it('should store classification metrics to FMS', async () => {
      // Enable metrics collection
      classifier.enableMetrics();
      
      // Classify several documents
      const documents = [
        { id: 'metrics-1', content: 'Technology focused document about programming languages.' },
        { id: 'metrics-2', content: 'Business focused document about financial reports.' },
        { id: 'metrics-3', content: 'Science focused document about quantum physics.' }
      ];
      
      for (const doc of documents) {
        await classifier.classify(doc);
      }
      
      // Store metrics
      const result = await classifier.storeMetrics();
      
      expect(mockFMS.storeMemory.called).to.be.true;
      expect(result).to.be.an('object');
      expect(result.success).to.be.true;
      expect(result.metricsId).to.be.a('string');
      
      // Check the metrics data
      const metricsData = mockFMS.storeMemory.lastCall.args[0];
      expect(metricsData.type).to.equal('classifier_metrics');
      expect(metricsData.metrics).to.be.an('object');
      expect(metricsData.metrics.totalDocumentsClassified).to.equal(3);
    });
  });
});

