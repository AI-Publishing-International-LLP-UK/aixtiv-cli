import axios from 'axios';

// Create base axios instance with default configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add a request interceptor to attach auth tokens
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sallyport_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Add anthropic-api-key header if it exists in localStorage
    const anthropicKey = localStorage.getItem('anthropic_api_key');
    if (anthropicKey) {
      config.headers['anthropic-api-key'] = anthropicKey;
      config.headers['anthropic-version'] = '2023-06-01';
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Universal Dispatcher API methods
const universalDispatcherService = {
  // Send message to agent via the Universal Dispatcher
  sendMessage: async (message, userId, agentId = 'dr-claude-orchestrator') => {
    try {
      const response = await api.post('/universal-dispatcher/message', {
        message,
        userId,
        agentId,
        operation: 'process-message'
      });
      return response.data;
    } catch (error) {
      console.error('Error sending message to Universal Dispatcher:', error);
      throw error;
    }
  },
  
  // Get agent S2DO tasks
  getTasks: async (userId, agentId = 'dr-claude-orchestrator') => {
    try {
      const response = await api.get('/universal-dispatcher/tasks', {
        params: { userId, agentId }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting tasks from Universal Dispatcher:', error);
      throw error;
    }
  },
  
  // Update task status
  updateTask: async (taskId, status, userId) => {
    try {
      const response = await api.put(`/universal-dispatcher/tasks/${taskId}`, {
        status,
        userId
      });
      return response.data;
    } catch (error) {
      console.error('Error updating task in Universal Dispatcher:', error);
      throw error;
    }
  }
};

// SallyPort authentication API
const sallyPortService = {
  // Authenticate a user with SallyPort
  authenticate: async (email) => {
    try {
      const response = await api.post('/auth/verify', { email });
      return response.data;
    } catch (error) {
      console.error('Error authenticating with SallyPort:', error);
      throw error;
    }
  },
  
  // Check token validity
  validateToken: async (token) => {
    try {
      const response = await api.post('/auth/validate', { token });
      return response.data;
    } catch (error) {
      console.error('Error validating token with SallyPort:', error);
      throw error;
    }
  },
  
  // Log out user
  logout: async () => {
    try {
      const response = await api.post('/auth/logout');
      return response.data;
    } catch (error) {
      console.error('Error logging out from SallyPort:', error);
      throw error;
    }
  }
};

// Agent access APIs
const agentService = {
  // Get available agents for the authenticated user
  getAgents: async (userId) => {
    try {
      const response = await api.get('/agent/list', {
        params: { userId }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching agents:', error);
      throw error;
    }
  },
  
  // Set agent configuration for current session
  configureAgent: async (agentId, config) => {
    try {
      const response = await api.post(`/agent/${agentId}/configure`, config);
      return response.data;
    } catch (error) {
      console.error('Error configuring agent:', error);
      throw error;
    }
  },
  
  // Get agent details
  getAgentDetails: async (agentId) => {
    try {
      const response = await api.get(`/agent/${agentId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching agent details:', error);
      throw error;
    }
  }
};

// Resource access APIs
const resourceService = {
  // Get resources available to the user
  getResources: async (userId) => {
    try {
      const response = await api.get('/resource/scan', {
        params: { userId }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching resources:', error);
      throw error;
    }
  },
  
  // Get a specific resource
  getResource: async (resourceId) => {
    try {
      const response = await api.get(`/resource/${resourceId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching resource:', error);
      throw error;
    }
  },
  
  // Grant access to a resource
  grantAccess: async (userId, agentId, resourceId, accessType = 'readonly') => {
    try {
      const response = await api.post('/agent/grant', {
        email: userId,
        agent: agentId,
        resource: resourceId,
        type: accessType
      });
      return response.data;
    } catch (error) {
      console.error('Error granting resource access:', error);
      throw error;
    }
  }
};

// Telemetry tracking API
const telemetryService = {
  // Record user interaction
  recordInteraction: async (interactionType, details = {}) => {
    try {
      await api.post('/telemetry/record', {
        type: interactionType,
        details,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      // Silently fail telemetry - non-critical
      console.warn('Telemetry recording failed:', error);
    }
  },
  
  // Get system status metrics
  getMetrics: async () => {
    try {
      const response = await api.get('/telemetry/metrics');
      return response.data;
    } catch (error) {
      console.error('Error fetching telemetry metrics:', error);
      throw error;
    }
  }
};

export {
  api,
  universalDispatcherService,
  sallyPortService,
  agentService,
  resourceService,
  telemetryService
};