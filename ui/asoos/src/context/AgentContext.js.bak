import React, { createContext, useState } from 'react';

export const AgentContext = createContext();

export const AgentProvider = ({ children }) => {
  const [agentPersonality, setAgentPersonality] = useState('Professional');
  const [agent, setAgent] = useState({
    name: 'QB Lucy',
    emotion: '😊',
    processMessage: async (message) => {
      return {
        text: 'I understand your message.',
        emotion: '😊',
        tone: 'Professional',
      };
    },
  });

  return (
    <AgentContext.Provider value={{ agent, agentPersonality, setAgentPersonality }}>
      {children}
    </AgentContext.Provider>
  );
};
