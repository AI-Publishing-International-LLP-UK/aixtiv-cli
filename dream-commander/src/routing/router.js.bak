/**
 * Dream Commander - Router
 *
 * Intelligent routing system for directing classified messages
 * to appropriate agents based on message content, classification,
 * agent capabilities, and current workload.
 *
 * (c) 2025 Copyright AI Publishing International LLP All Rights Reserved.
 */

const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
const config = require('../../config/default.json').dreamCommander;

class Router {
  constructor() {
    this.initialized = false;
    this.agents = {};
    this.loadBalancer = null;
    this.routingStats = {
      routed: 0,
      failed: 0,
      agentCounts: {},
    };

    // Initialize Firestore if not already initialized
    if (!admin.apps.length) {
      admin.initializeApp();
    }

    this.db = admin.firestore();
  }

  /**
   * Initialize the router
   */
  async initialize() {
    if (this.initialized) return;

    console.log('Initializing Dream Commander Router...');

    try {
      // Load agents
      await this.loadAgents();

      // Initialize load balancer
      this.initializeLoadBalancer();

      this.initialized = true;
      console.log('Dream Commander Router initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Router:', error.message);
      throw error;
    }
  }

  /**
   * Load agent configurations
   */
  async loadAgents() {
    console.log('Loading agent configurations...');

    // Load from config
    this.agents = {
      drMatch: {
        id: 'dr-match',
        name: 'Dr. Match',
        enabled: config.routing.agents.drMatch.enabled,
        capabilities: config.routing.agents.drMatch.capabilities,
        currentLoad: 0,
        maxLoad: 1000,
      },
      qbLucy: {
        id: 'qb-lucy',
        name: 'QB Lucy',
        enabled: config.routing.agents.qbLucy.enabled,
        capabilities: config.routing.agents.qbLucy.capabilities,
        currentLoad: 0,
        maxLoad: 1000,
      },
    };

    // Get current agent workloads from database
    try {
      const agentCollection = 'agent_workloads';
      const snapshot = await this.db.collection(agentCollection).get();

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (this.agents[data.id]) {
          this.agents[data.id].currentLoad = data.currentLoad || 0;
        }
      });

      console.log('Agent workloads loaded from database');
    } catch (error) {
      console.warn('Failed to load agent workloads, using defaults:', error.message);
    }
  }

  /**
   * Initialize load balancer
   */
  initializeLoadBalancer() {
    const algorithm = config.routing.loadBalancing.algorithm;

    console.log(`Initializing load balancer with algorithm: ${algorithm}`);

    switch (algorithm) {
      case 'round-robin':
        this.loadBalancer = new RoundRobinLoadBalancer(this.agents);
        break;
      case 'weighted-round-robin':
        this.loadBalancer = new WeightedRoundRobinLoadBalancer(
          this.agents,
          config.routing.loadBalancing.weights
        );
        break;
      case 'least-connections':
        this.loadBalancer = new LeastConnectionsLoadBalancer(this.agents);
        break;
      default:
        console.warn(`Unknown algorithm: ${algorithm}, using weighted-round-robin as default`);
        this.loadBalancer = new WeightedRoundRobinLoadBalancer(
          this.agents,
          config.routing.loadBalancing.weights
        );
    }
  }

  /**
   * Route a message to an appropriate agent
   * @param {Object} message - The classified message
   * @returns {Object} - Routing result
   */
  async routeMessage(message) {
    if (!this.initialized) {
      await this.initialize();
    }

    console.log(`Routing message ${message.id}`);

    try {
      // 1. Find the best agent match based on classification
      const targetAgent = await this.findBestAgent(message);

      // 2. Create routing task
      const routingTask = await this.createRoutingTask(message, targetAgent);

      // 3. Update agent workload
      await this.updateAgentWorkload(targetAgent.id, 1);

      // 4. Update routing stats
      this.updateRoutingStats(targetAgent.id);

      // 5. Return routing result
      return {
        agentId: targetAgent.id,
        agentName: targetAgent.name,
        taskId: routingTask.id,
        routedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`Error routing message ${message.id}:`, error.message);
      this.routingStats.failed++;
      throw error;
    }
  }

  /**
   * Find the best agent for a message
   * @param {Object} message - The classified message
   * @returns {Object} - Selected agent
   */
  async findBestAgent(message) {
    // Get classification
    const classification = message.classification;
    if (!classification) {
      throw new Error('Message has not been classified');
    }

    // Extract key classification elements for routing
    const sector = classification.sector?.primary;
    const intent = classification.intent?.intent;
    const urgency = classification.urgency?.level || 'medium';
    const frameworks = classification.frameworks || {};

    // 1. Check for special routing cases

    // High urgency messages go to QB Lucy if available
    if (urgency === 'high' || urgency === 'critical') {
      if (
        this.agents.qbLucy.enabled &&
        this.agents.qbLucy.currentLoad < this.agents.qbLucy.maxLoad
      ) {
        return this.agents.qbLucy;
      }
    }

    // Personality/preference matching sends to Dr. Match
    if (frameworks.oneT || frameworks.holland) {
      if (
        this.agents.drMatch.enabled &&
        this.agents.drMatch.currentLoad < this.agents.drMatch.maxLoad
      ) {
        return this.agents.drMatch;
      }
    }

    // 2. Use load balancer for general case
    const selectedAgent = this.loadBalancer.getNextAgent();

    // 3. Fallback to any available agent if selected agent is unavailable
    if (!selectedAgent.enabled || selectedAgent.currentLoad >= selectedAgent.maxLoad) {
      // Find any available agent
      for (const [id, agent] of Object.entries(this.agents)) {
        if (agent.enabled && agent.currentLoad < agent.maxLoad) {
          return agent;
        }
      }

      // If no agents available, throw error
      throw new Error('No agents available for routing');
    }

    return selectedAgent;
  }

  /**
   * Create a routing task in the database
   * @param {Object} message - The message being routed
   * @param {Object} agent - The selected agent
   * @returns {Object} - Created task
   */
  async createRoutingTask(message, agent) {
    const taskId = uuidv4();
    const tasksCollection = config.storage.documentDatabase.collections.tasks;

    // Create task object
    const task = {
      id: taskId,
      messageId: message.id,
      agentId: agent.id,
      status: 'pending',
      createdAt: new Date().toISOString(),
      classification: message.classification,
      source: {
        channel: message.channel,
        sender: message.sender || 'unknown',
      },
    };

    // Store task in database
    await this.db.collection(tasksCollection).doc(taskId).set(task);

    return task;
  }

  /**
   * Update agent workload
   * @param {string} agentId - The agent ID
   * @param {number} amount - Amount to adjust workload by
   */
  async updateAgentWorkload(agentId, amount) {
    // Update in-memory workload
    if (this.agents[agentId]) {
      this.agents[agentId].currentLoad += amount;
    }

    // Update in database
    try {
      const agentCollection = 'agent_workloads';
      await this.db.collection(agentCollection).doc(agentId).set(
        {
          id: agentId,
          currentLoad: this.agents[agentId].currentLoad,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (error) {
      console.warn(`Failed to update agent workload in database: ${error.message}`);
    }
  }

  /**
   * Update routing statistics
   * @param {string} agentId - The agent ID
   */
  updateRoutingStats(agentId) {
    this.routingStats.routed++;

    // Update agent counts
    if (!this.routingStats.agentCounts[agentId]) {
      this.routingStats.agentCounts[agentId] = 0;
    }
    this.routingStats.agentCounts[agentId]++;
  }

  /**
   * Get current routing statistics
   * @returns {Object} - Routing statistics
   */
  getStats() {
    return { ...this.routingStats };
  }

  /**
   * Reset routing statistics
   */
  resetStats() {
    this.routingStats = {
      routed: 0,
      failed: 0,
      agentCounts: {},
    };
  }
}

/**
 * Round Robin Load Balancer
 */
class RoundRobinLoadBalancer {
  constructor(agents) {
    this.agents = agents;
    this.agentIds = Object.keys(agents);
    this.currentIndex = 0;
  }

  getNextAgent() {
    // Get next agent ID
    const agentId = this.agentIds[this.currentIndex];

    // Update index for next time
    this.currentIndex = (this.currentIndex + 1) % this.agentIds.length;

    return this.agents[agentId];
  }
}

/**
 * Weighted Round Robin Load Balancer
 */
class WeightedRoundRobinLoadBalancer {
  constructor(agents, weights) {
    this.agents = agents;
    this.weights = weights;
    this.currentIndex = 0;

    // Create weighted list of agent IDs
    this.weightedAgentIds = [];

    for (const [agentId, weight] of Object.entries(this.weights)) {
      if (this.agents[agentId] && this.agents[agentId].enabled) {
        for (let i = 0; i < weight; i++) {
          this.weightedAgentIds.push(agentId);
        }
      }
    }

    // Handle case with no valid agents
    if (this.weightedAgentIds.length === 0) {
      // Add all agents with equal weight
      for (const agentId of Object.keys(this.agents)) {
        if (this.agents[agentId].enabled) {
          this.weightedAgentIds.push(agentId);
        }
      }
    }
  }

  getNextAgent() {
    if (this.weightedAgentIds.length === 0) {
      throw new Error('No enabled agents available');
    }

    // Get next agent ID
    const agentId = this.weightedAgentIds[this.currentIndex];

    // Update index for next time
    this.currentIndex = (this.currentIndex + 1) % this.weightedAgentIds.length;

    return this.agents[agentId];
  }
}

/**
 * Least Connections Load Balancer
 */
class LeastConnectionsLoadBalancer {
  constructor(agents) {
    this.agents = agents;
  }

  getNextAgent() {
    let selectedAgent = null;
    let minLoad = Infinity;

    // Find agent with lowest current load
    for (const [id, agent] of Object.entries(this.agents)) {
      if (agent.enabled && agent.currentLoad < minLoad) {
        selectedAgent = agent;
        minLoad = agent.currentLoad;
      }
    }

    if (!selectedAgent) {
      throw new Error('No enabled agents available');
    }

    return selectedAgent;
  }
}

module.exports = new Router();
