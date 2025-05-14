import React, { createContext, useState, useEffect, useContext } from 'react';
import { universalDispatcherService, agentService } from '../services/api';
import { AuthContext } from './AuthContext';
import { TelemetryContext } from './TelemetryContext';

export const AgentContext = createContext();

export const AgentProvider = ({ children }) => {
  const { user, isAuthenticated } = useContext(AuthContext);
  const { recordInteraction } = useContext(TelemetryContext);
  
  const [agent, setAgent] = useState({
    id: 'dr-claude-orchestrator',
    name: 'QB Lucy',
    role: 'Assistant',
    emotion: '😊',
    voiceEnabled: false,
    voiceModel: 'us-female',
    language: 'en-US'
  });
  
  const [availableAgents, setAvailableAgents] = useState([]);
  const [agentPersonality, setAgentPersonality] = useState('Professional');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load available agents when user authenticated
  useEffect(() => {
    const loadAgents = async () => {
      if (isAuthenticated && user) {
        try {
          setLoading(true);
          const response = await agentService.getAgents(user.id);
          setAvailableAgents(response.agents || []);
        } catch (err) {
          console.error('Error loading agents:', err);
          setError('Failed to load available agents');
        } finally {
          setLoading(false);
        }
      }
    };

    loadAgents();
  }, [isAuthenticated, user]);

  // Process message through Universal Dispatcher
  const processMessage = async (message) => {
    try {
      setLoading(true);
      
      // Record the interaction
      recordInteraction('agent_message', { 
        agentId: agent.id,
        personality: agentPersonality,
        messageLength: message.length
      });
      
      // Process message with Universal Dispatcher
      const response = await universalDispatcherService.sendMessage(
        message, 
        user?.id || 'pr@coaching2100.com',
        agent.id
      );
      
      // If response was successful
      if (response.success) {
        return {
          text: response.text || response.message || "I'm processing your request",
          emotion: response.emotion || '😊',
          tone: agentPersonality.toLowerCase()
        };
      } else {
        throw new Error(response.message || 'Failed to process message');
      }
    } catch (err) {
      console.error('Error processing message:', err);
      setError('Failed to process your message');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Change the current agent
  const changeAgent = async (agentId) => {
    try {
      setLoading(true);
      setError(null);
      
      // Get agent details
      const agentDetails = await agentService.getAgentDetails(agentId);
      
      if (agentDetails) {
        setAgent({
          ...agent,
          id: agentId,
          name: agentDetails.name || 'QB Lucy',
          role: agentDetails.role || 'Assistant',
          emotion: agentDetails.defaultEmotion || '😊'
        });
        
        // Record agent change
        recordInteraction('agent_change', { 
          previousAgent: agent.id,
          newAgent: agentId
        });
        
        return true;
      } else {
        throw new Error('Agent details not found');
      }
    } catch (err) {
      console.error('Error changing agent:', err);
      setError('Failed to change agent');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Toggle voice responses
  const toggleVoice = () => {
    setAgent(prev => {
      const newState = { ...prev, voiceEnabled: !prev.voiceEnabled };
      
      // Record setting change
      recordInteraction('voice_toggle', { enabled: newState.voiceEnabled });
      
      return newState;
    });
  };

  // Change voice model
  const setVoiceModel = (model) => {
    setAgent(prev => {
      const newState = { ...prev, voiceModel: model };
      
      // Record setting change
      recordInteraction('voice_model_change', { model });
      
      return newState;
    });
  };

  // Change language
  const setLanguage = (language) => {
    setAgent(prev => {
      const newState = { ...prev, language };
      
      // Record setting change
      recordInteraction('language_change', { language });
      
      return newState;
    });
  };

  // Value to be provided to consumers
  const value = {
    agent,
    availableAgents,
    agentPersonality,
    loading,
    error,
    processMessage,
    changeAgent,
    setAgentPersonality,
    toggleVoice,
    setVoiceModel,
    setLanguage
  };

  return (
    <AgentContext.Provider value={value}>
      {children}
    </AgentContext.Provider>
  );
};