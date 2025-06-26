import React, { useState, useContext, useEffect } from 'react';
import {
  Mic,
  Send,
  Volume2,
  Settings,
  LogOut,
  Users,
  BarChart2,
  Monitor,
  Database,
  Camera,
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { AgentContext } from '../context/AgentContext';
import { ResourceContext } from '../context/ResourceContext';
import { TelemetryContext } from '../context/TelemetryContext';

const ASOOSNavigationDemo = () => {
  // State management
  const [viewMode, setViewMode] = useState('login');
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState([]);

  // Get contexts
  const { user, login, logout, isAuthenticated } = useContext(AuthContext);
  const { agent, agentPersonality, setAgentPersonality } = useContext(AgentContext);
  const { resources, todos } = useContext(ResourceContext);
  const { recordInteraction } = useContext(TelemetryContext);

  // Navigation handler
  const navigateTo = (view) => {
    setViewMode(view);
    recordInteraction('navigation', { from: viewMode, to: view });
  };

  // Effect to check authentication
  useEffect(() => {
    if (isAuthenticated && viewMode === 'login') {
      navigateTo('main');
    }
  }, [isAuthenticated, viewMode]);

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;

    const userMessage = { text: messageInput, sender: 'user', timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    recordInteraction('message_sent', { content: messageInput });
    setMessageInput('');

    try {
      const response = await agent.processMessage(messageInput);
      const agentMessage = {
        text: response.text,
        sender: 'agent',
        timestamp: new Date(),
        emotion: response.emotion,
        tone: response.tone,
      };
      setMessages((prev) => [...prev, agentMessage]);
    } catch (error) {
      console.error('Error processing message:', error);
      setMessages((prev) => [
        ...prev,
        {
          text: 'Sorry, I encountered an error processing your request.',
          sender: 'agent',
          timestamp: new Date(),
          error: true,
        },
      ]);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Navigation Links */}
      <div className="w-14 bg-black flex flex-col items-center pt-24 pb-6 space-y-6">
        {[
          { id: 1, name: 'Communication', desc: 'Automated Communication', view: 'main' },
          { id: 2, name: 'Growth', desc: 'Growth Revenues', view: 'main' },
          { id: 3, name: 'Services', desc: 'Client Services Innovation', view: 'main' },
          { id: 4, name: 'Automation', desc: 'Organizational Automation', view: 'main' },
          { id: 5, name: 'ROI', desc: 'ROI Dashboard', view: 'stats' },
          { id: 6, name: 'Wish', desc: 'Your Wish', view: 'main' },
          { id: 7, name: 'Academy', desc: 'Learning & Training', view: 'webinar' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => navigateTo(item.view)}
            onMouseEnter={() => setActiveTooltip(item.id)}
            onMouseLeave={() => setActiveTooltip(null)}
            className={`w-8 h-8 flex items-center justify-center cursor-pointer transition-all duration-300 text-white relative ${
              viewMode === item.view ? 'opacity-100 scale-110' : 'opacity-60 hover:opacity-80'
            }`}
          >
            {item.name[0]}
            {activeTooltip === item.id && (
              <div className="absolute left-full ml-2 bg-gray-800 text-white text-xs py-1 px-2 rounded-md whitespace-nowrap z-50">
                <div className="font-bold">{item.name}</div>
                <div>{item.desc}</div>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        <div className="h-16 bg-black text-white flex items-center justify-between px-6">
          <button
            className="font-bold text-cyan-400 text-2xl tracking-wide cursor-pointer"
            onClick={() => navigateTo('main')}
          >
            ASOOS
          </button>
        </div>

        {/* Content based on current view */}
        <div className="flex-1">
          {viewMode === 'login' && (
            <div className="flex items-center justify-center h-full">
              <button
                onClick={() => login()}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
              >
                Login
              </button>
            </div>
          )}

          {viewMode === 'main' && (
            <div className="p-6">
              <h1>Main Dashboard</h1>
              {/* Add main dashboard content */}
            </div>
          )}

          {/* Add other view content here */}
        </div>

        {/* Bottom Navigation Bar */}
        <div className="h-12 bg-gray-100 flex items-center justify-between px-4">
          <button
            onClick={() => navigateTo('settings')}
            className="p-2 hover:bg-gray-200 rounded-full"
          >
            <Settings className="w-5 h-5" />
          </button>

          <button
            onClick={() => {
              logout();
              navigateTo('login');
            }}
            className="p-2 hover:bg-gray-200 rounded-full"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ASOOSNavigationDemo;
