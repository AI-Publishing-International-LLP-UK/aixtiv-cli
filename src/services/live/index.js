/**
 * Live Production Integration Service
 * 
 * This service manages all live integrations with production APIs including
 * OAuth2, Pinecone, LinkedIn, GitHub, and Claude Orchestration.
 * 
 * (c) 2025 Copyright AI Publishing International LLP All Rights Reserved.
 * Developed with assistance from the Pilots of Vision Lake.
 * This is Human Driven and 100% Human Project Amplified by attributes of AI Technology.
 */

const axios = require('axios');
const admin = require('firebase-admin');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { PineconeClient } = require('@pinecone-database/pinecone');
const { Anthropic } = require('@anthropic-ai/sdk');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

// Initialize Secret Manager client
const secretManager = new SecretManagerServiceClient();

/**
 * Production service for all live integrations
 */
class LiveProductionService {
  constructor() {
    this.db = admin.firestore();
    this.initialized = false;
    this.credentials = {};
    this.clients = {};
    this.projectId = process.env.GCP_PROJECT_ID || 'api-for-warp-drive';
  }

  /**
   * Initialize the live production service
   */
  async initialize() {
    if (this.initialized) return;

    console.log('Initializing live production service...');
    
    try {
      // Load API keys and credentials
      await this.loadCredentials();
      
      // Initialize service clients
      await this.initializeClients();
      
      this.initialized = true;
      console.log('Live production service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize live production service:', error.message);
      throw error;
    }
  }

  /**
   * Load credentials from GCP Secret Manager
   */
  async loadCredentials() {
    console.log('Loading API credentials from GCP Secret Manager...');
    
    const requiredSecrets = [
      'anthropic-admin',
      'pineconeconnect',
      'linkedin-client-id',
      'linkedin-client-secret',
      'github-oauth-warp-drive',
      'openai-api-key'
    ];
    
    for (const secretName of requiredSecrets) {
      try {
        const [version] = await secretManager.accessSecretVersion({
          name: `projects/${this.projectId}/secrets/${secretName}/versions/latest`
        });
        
        this.credentials[secretName] = version.payload.data.toString();
        console.log(`Loaded credential: ${secretName}`);
      } catch (error) {
        console.error(`Failed to load credential ${secretName}:`, error.message);
        throw error;
      }
    }
  }

  /**
   * Initialize API clients
   */
  async initializeClients() {
    console.log('Initializing API clients...');
    
    // Initialize Anthropic client for Claude
    this.clients.claude = new Anthropic({
      apiKey: this.credentials['anthropic-admin']
    });
    
    // Initialize Pinecone client
    this.clients.pinecone = new PineconeClient();
    await this.clients.pinecone.init({
      apiKey: this.credentials['pineconeconnect'],
      environment: 'us-west1-gcp'
    });
    
    // Initialize LinkedIn API client (custom axios instance)
    this.clients.linkedin = axios.create({
      baseURL: 'https://api.linkedin.com/v2/',
      headers: {
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });
    
    // Initialize GitHub API client
    this.clients.github = axios.create({
      baseURL: 'https://api.github.com/',
      headers: {
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    console.log('API clients initialized successfully');
  }

  /**
   * Execute a Claude API call
   * @param {string} prompt - Prompt to send to Claude
   * @param {string} model - Claude model to use
   * @returns {Promise<string>} - Claude's response
   */
  async executeClaudeRequest(prompt, model = 'claude-3-opus-20240229') {
    await this.initialize();
    
    console.log(`Executing Claude request with model ${model}...`);
    
    try {
      const response = await this.clients.claude.messages.create({
        model: model,
        max_tokens: 4000,
        messages: [
          { role: 'user', content: prompt }
        ]
      });
      
      return response.content[0].text;
    } catch (error) {
      console.error('Error executing Claude request:', error.message);
      throw error;
    }
  }

  /**
   * Execute a Pinecone query
   * @param {string} indexName - Pinecone index name
   * @param {Array<number>} vector - Query vector
   * @param {Object} filter - Query filter
   * @param {number} topK - Number of results to return
   * @returns {Promise<Array>} - Query results
   */
  async executePineconeQuery(indexName, vector, filter = {}, topK = 10) {
    await this.initialize();
    
    console.log(`Executing Pinecone query on index ${indexName}...`);
    
    try {
      // Get Pinecone index
      const index = this.clients.pinecone.Index(indexName);
      
      // Execute query
      const queryResponse = await index.query({
        vector,
        topK,
        filter,
        includeMetadata: true
      });
      
      return queryResponse.matches;
    } catch (error) {
      console.error('Error executing Pinecone query:', error.message);
      throw error;
    }
  }

  /**
   * Execute a LinkedIn API request
   * @param {string} endpoint - LinkedIn API endpoint
   * @param {string} accessToken - OAuth2 access token
   * @param {string} method - HTTP method (GET, POST, etc.)
   * @param {Object} data - Request data (for POST, PUT, etc.)
   * @returns {Promise<Object>} - API response
   */
  async executeLinkedInRequest(endpoint, accessToken, method = 'GET', data = null) {
    await this.initialize();
    
    console.log(`Executing LinkedIn API request to ${endpoint}...`);
    
    try {
      const response = await this.clients.linkedin.request({
        url: endpoint,
        method: method,
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        data: data ? data : undefined
      });
      
      return response.data;
    } catch (error) {
      console.error('Error executing LinkedIn API request:', error.message);
      throw error;
    }
  }

  /**
   * Execute a GitHub API request
   * @param {string} endpoint - GitHub API endpoint
   * @param {string} accessToken - OAuth2 access token
   * @param {string} method - HTTP method (GET, POST, etc.)
   * @param {Object} data - Request data (for POST, PUT, etc.)
   * @returns {Promise<Object>} - API response
   */
  async executeGitHubRequest(endpoint, accessToken, method = 'GET', data = null) {
    await this.initialize();
    
    console.log(`Executing GitHub API request to ${endpoint}...`);
    
    try {
      const response = await this.clients.github.request({
        url: endpoint,
        method: method,
        headers: {
          'Authorization': `token ${accessToken}`
        },
        data: data ? data : undefined
      });
      
      return response.data;
    } catch (error) {
      console.error('Error executing GitHub API request:', error.message);
      throw error;
    }
  }

  /**
   * Store data in Firestore
   * @param {string} collection - Firestore collection
   * @param {string} documentId - Document ID
   * @param {Object} data - Document data
   * @param {boolean} merge - Whether to merge with existing data
   * @returns {Promise<void>}
   */
  async storeInFirestore(collection, documentId, data, merge = true) {
    await this.initialize();
    
    console.log(`Storing data in Firestore collection ${collection}, document ${documentId}...`);
    
    try {
      await this.db.collection(collection).doc(documentId).set(data, { merge });
      console.log('Data stored successfully in Firestore');
    } catch (error) {
      console.error('Error storing data in Firestore:', error.message);
      throw error;
    }
  }

  /**
   * Get data from Firestore
   * @param {string} collection - Firestore collection
   * @param {string} documentId - Document ID
   * @returns {Promise<Object>} - Document data
   */
  async getFromFirestore(collection, documentId) {
    await this.initialize();
    
    console.log(`Getting data from Firestore collection ${collection}, document ${documentId}...`);
    
    try {
      const doc = await this.db.collection(collection).doc(documentId).get();
      
      if (!doc.exists) {
        console.log(`No document found at ${collection}/${documentId}`);
        return null;
      }
      
      return doc.data();
    } catch (error) {
      console.error('Error getting data from Firestore:', error.message);
      throw error;
    }
  }

  /**
   * Orchestrate a workflow across multiple services
   * @param {string} workflowName - Name of the workflow
   * @param {Object} workflowData - Workflow data
   * @returns {Promise<Object>} - Workflow result
   */
  async orchestrateWorkflow(workflowName, workflowData) {
    await this.initialize();
    
    console.log(`Orchestrating workflow ${workflowName}...`);
    
    // Record workflow start in Firestore
    const workflowId = `${workflowName}-${Date.now()}`;
    await this.storeInFirestore('workflows', workflowId, {
      workflowName,
      startTime: admin.firestore.FieldValue.serverTimestamp(),
      status: 'running',
      data: workflowData
    });
    
    try {
      let result;
      
      // Execute workflow based on name
      switch (workflowName) {
        case 'linkedin-memory-indexing':
          result = await this.executeLinkedInMemoryIndexing(workflowData);
          break;
          
        case 'github-repository-analysis':
          result = await this.executeGitHubRepositoryAnalysis(workflowData);
          break;
          
        case 'claude-content-generation':
          result = await this.executeClaudeContentGeneration(workflowData);
          break;
          
        default:
          throw new Error(`Unknown workflow: ${workflowName}`);
      }
      
      // Record workflow completion in Firestore
      await this.storeInFirestore('workflows', workflowId, {
        status: 'completed',
        completionTime: admin.firestore.FieldValue.serverTimestamp(),
        result
      }, true);
      
      return result;
    } catch (error) {
      // Record workflow failure in Firestore
      await this.storeInFirestore('workflows', workflowId, {
        status: 'failed',
        completionTime: admin.firestore.FieldValue.serverTimestamp(),
        error: error.message
      }, true);
      
      console.error(`Error orchestrating workflow ${workflowName}:`, error.message);
      throw error;
    }
  }

  /**
   * LinkedIn Memory Indexing Workflow
   * @param {Object} data - Workflow data
   * @returns {Promise<Object>} - Workflow result
   */
  async executeLinkedInMemoryIndexing(data) {
    console.log('Executing LinkedIn Memory Indexing workflow...');
    
    const { userId, accessToken } = data;
    
    // Get user profile
    const profile = await this.executeLinkedInRequest('me', accessToken);
    
    // Get user posts
    const posts = await this.executeLinkedInRequest('shares?q=owners&owners=urn:li:person:' + profile.id, accessToken);
    
    // Store profile and posts in Firestore
    await this.storeInFirestore('linkedin_profiles', userId, {
      linkedInId: profile.id,
      firstName: profile.localizedFirstName,
      lastName: profile.localizedLastName,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Process posts for Pinecone indexing
    const indexName = 'memoria-linkedin-content';

    // Generate vector embeddings and store in Pinecone
    const index = this.clients.pinecone.Index(indexName);

    // Track successful embeddings
    let successfulEmbeddings = 0;

    if (posts.elements && posts.elements.length > 0) {
      // Generate embeddings for each post
      const openai = axios.create({
        baseURL: 'https://api.openai.com/v1',
        headers: {
          'Authorization': `Bearer ${this.credentials['openai-api-key']}`,
          'Content-Type': 'application/json'
        }
      });

      // Process posts in batches of 10
      for (let i = 0; i < posts.elements.length; i += 10) {
        const batch = posts.elements.slice(i, i + 10);

        // Prepare batch for embedding
        const embeddingPromises = batch.map(async (post) => {
          try {
            // Extract text content from post
            const postContent = post.text ? post.text.text : 'No content available';

            // Generate embedding using OpenAI API
            const embeddingResponse = await openai.post('/embeddings', {
              input: postContent,
              model: 'text-embedding-ada-002'
            });

            const embedding = embeddingResponse.data.data[0].embedding;

            // Prepare metadata
            const metadata = {
              userId: userId,
              postId: post.id,
              timestamp: post.created.time,
              content: postContent.substring(0, 500), // Limit content length in metadata
              source: 'linkedin'
            };

            // Upsert into Pinecone
            await index.upsert({
              vectors: [{
                id: `linkedin_post_${post.id}`,
                values: embedding,
                metadata
              }]
            });

            successfulEmbeddings++;
            return true;
          } catch (error) {
            console.error(`Error processing post ${post.id}:`, error.message);
            return false;
          }
        });

        // Wait for batch to complete
        await Promise.all(embeddingPromises);
      }
    }

    // Generate embedding for profile data
    try {
      const profileData = `${profile.localizedFirstName} ${profile.localizedLastName} - ${profile.headline || ''} ${profile.summary || ''}`;

      const openai = axios.create({
        baseURL: 'https://api.openai.com/v1',
        headers: {
          'Authorization': `Bearer ${this.credentials['openai-api-key']}`,
          'Content-Type': 'application/json'
        }
      });

      const embeddingResponse = await openai.post('/embeddings', {
        input: profileData,
        model: 'text-embedding-ada-002'
      });

      const embedding = embeddingResponse.data.data[0].embedding;

      // Prepare metadata
      const metadata = {
        userId: userId,
        profileId: profile.id,
        name: `${profile.localizedFirstName} ${profile.localizedLastName}`,
        headline: profile.headline || '',
        source: 'linkedin_profile'
      };

      // Upsert into Pinecone
      await index.upsert({
        vectors: [{
          id: `linkedin_profile_${profile.id}`,
          values: embedding,
          metadata
        }]
      });

      successfulEmbeddings++;
    } catch (error) {
      console.error(`Error processing profile ${profile.id}:`, error.message);
    }

    return {
      profileIndexed: true,
      postsIndexed: posts.elements ? posts.elements.length : 0,
      embeddingsCreated: successfulEmbeddings
    };
  }

  /**
   * GitHub Repository Analysis Workflow
   * @param {Object} data - Workflow data
   * @returns {Promise<Object>} - Workflow result
   */
  async executeGitHubRepositoryAnalysis(data) {
    console.log('Executing GitHub Repository Analysis workflow...');
    
    const { userId, accessToken, repositoryName } = data;
    
    // Get repository details
    const repo = await this.executeGitHubRequest(`repos/${repositoryName}`, accessToken);
    
    // Get repository contents
    const contents = await this.executeGitHubRequest(`repos/${repositoryName}/contents`, accessToken);
    
    // Get repository commits
    const commits = await this.executeGitHubRequest(`repos/${repositoryName}/commits?per_page=100`, accessToken);
    
    // Store repository data in Firestore
    await this.storeInFirestore('github_repositories', `${userId}_${repositoryName.replace('/', '_')}`, {
      repositoryId: repo.id,
      name: repo.name,
      owner: repo.owner.login,
      description: repo.description,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Process repository for Pinecone indexing
    const indexName = 'lucy-github-repos';

    // Generate embeddings for repository and store in Pinecone
    const index = this.clients.pinecone.Index(indexName);

    // Track successful embeddings
    let successfulEmbeddings = 0;

    // Create a combined representation of the repository
    const repoSummary = `
      Repository: ${repo.name}
      Owner: ${repo.owner.login}
      Description: ${repo.description || 'No description available'}
      Language: ${repo.language || 'Not specified'}
      Created: ${repo.created_at}
      Updated: ${repo.updated_at}
      Stars: ${repo.stargazers_count}
      Forks: ${repo.forks_count}
      Open Issues: ${repo.open_issues_count}
      License: ${repo.license ? repo.license.name : 'Not specified'}
    `;

    try {
      // Generate embedding for repository summary
      const openai = axios.create({
        baseURL: 'https://api.openai.com/v1',
        headers: {
          'Authorization': `Bearer ${this.credentials['openai-api-key']}`,
          'Content-Type': 'application/json'
        }
      });

      const embeddingResponse = await openai.post('/embeddings', {
        input: repoSummary,
        model: 'text-embedding-ada-002'
      });

      const embedding = embeddingResponse.data.data[0].embedding;

      // Prepare metadata
      const metadata = {
        userId,
        repositoryId: repo.id,
        owner: repo.owner.login,
        name: repo.name,
        description: repo.description ? repo.description.substring(0, 500) : '',
        language: repo.language || '',
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        source: 'github_repository'
      };

      // Upsert into Pinecone
      await index.upsert({
        vectors: [{
          id: `github_repo_${repo.id}`,
          values: embedding,
          metadata
        }]
      });

      successfulEmbeddings++;
    } catch (error) {
      console.error(`Error processing repository summary:`, error.message);
    }

    // Process file contents for text files only (limit to reasonable size)
    const textFileExtensions = ['.md', '.txt', '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.html', '.css', '.json', '.yml', '.yaml'];

    // Process contents in batches to avoid rate limits
    const textFiles = contents.filter(file => {
      // Only process text files with reasonable size
      const extension = '.' + (file.name.split('.').pop() || '');
      return textFileExtensions.includes(extension) && file.size < 100000; // Limit to 100KB
    });

    // Process files in batches of 5
    for (let i = 0; i < textFiles.length; i += 5) {
      const batch = textFiles.slice(i, i + 5);

      const fileEmbeddingPromises = batch.map(async (file) => {
        try {
          // Get file content
          const fileContentResponse = await this.executeGitHubRequest(
            file.download_url,
            accessToken,
            'GET'
          );

          // Use the file content as string
          let fileContent = '';
          if (typeof fileContentResponse === 'string') {
            fileContent = fileContentResponse;
          } else if (typeof fileContentResponse === 'object') {
            fileContent = JSON.stringify(fileContentResponse);
          } else {
            fileContent = `Unable to process content for ${file.name}`;
          }

          // Limit content size for embedding
          const truncatedContent = fileContent.substring(0, 5000);

          // Generate embedding
          const openai = axios.create({
            baseURL: 'https://api.openai.com/v1',
            headers: {
              'Authorization': `Bearer ${this.credentials['openai-api-key']}`,
              'Content-Type': 'application/json'
            }
          });

          const embeddingResponse = await openai.post('/embeddings', {
            input: truncatedContent,
            model: 'text-embedding-ada-002'
          });

          const embedding = embeddingResponse.data.data[0].embedding;

          // Prepare metadata
          const metadata = {
            userId,
            repositoryId: repo.id,
            repoName: repo.name,
            fileName: file.name,
            filePath: file.path,
            fileSize: file.size,
            source: 'github_file'
          };

          // Upsert into Pinecone
          await index.upsert({
            vectors: [{
              id: `github_file_${repo.id}_${file.sha}`,
              values: embedding,
              metadata
            }]
          });

          successfulEmbeddings++;
          return true;
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error.message);
          return false;
        }
      });

      // Wait for batch to complete
      await Promise.all(fileEmbeddingPromises);
    }

    // Process recent commits (summary only)
    // Get the 10 most recent commits
    const recentCommits = commits.slice(0, 10);

    // Create a combined representation of recent commits
    const commitHistory = recentCommits.map(commit =>
      `Commit: ${commit.sha.substring(0, 7)}
       Author: ${commit.commit.author.name}
       Date: ${commit.commit.author.date}
       Message: ${commit.commit.message}`
    ).join('\n\n');

    try {
      // Generate embedding for commit history
      const openai = axios.create({
        baseURL: 'https://api.openai.com/v1',
        headers: {
          'Authorization': `Bearer ${this.credentials['openai-api-key']}`,
          'Content-Type': 'application/json'
        }
      });

      const embeddingResponse = await openai.post('/embeddings', {
        input: commitHistory,
        model: 'text-embedding-ada-002'
      });

      const embedding = embeddingResponse.data.data[0].embedding;

      // Prepare metadata
      const metadata = {
        userId,
        repositoryId: repo.id,
        repoName: repo.name,
        commitCount: commits.length,
        recentCommitCount: recentCommits.length,
        source: 'github_commits'
      };

      // Upsert into Pinecone
      await index.upsert({
        vectors: [{
          id: `github_commits_${repo.id}`,
          values: embedding,
          metadata
        }]
      });

      successfulEmbeddings++;
    } catch (error) {
      console.error(`Error processing commit history:`, error.message);
    }

    return {
      repositoryAnalyzed: true,
      filesAnalyzed: contents.length,
      filesEmbedded: textFiles.length,
      commitsAnalyzed: commits.length,
      embeddingsCreated: successfulEmbeddings
    };
  }

  /**
   * Claude Content Generation Workflow
   * @param {Object} data - Workflow data
   * @returns {Promise<Object>} - Workflow result
   */
  async executeClaudeContentGeneration(data) {
    console.log('Executing Claude Content Generation workflow...');
    
    const { userId, prompt, format, context } = data;
    
    // Generate content with Claude
    const contentPrompt = `
      Context: ${context || 'No specific context provided.'}
      
      Instructions: Please generate content in the ${format || 'text'} format.
      
      ${prompt}
    `;
    
    const generatedContent = await this.executeClaudeRequest(contentPrompt);
    
    // Store generated content in Firestore
    const contentId = `content_${Date.now()}`;
    await this.storeInFirestore('generated_content', contentId, {
      userId,
      prompt,
      format,
      context,
      content: generatedContent,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return {
      contentGenerated: true,
      contentId,
      contentLength: generatedContent.length
    };
  }
}

// Export singleton instance
module.exports = new LiveProductionService();