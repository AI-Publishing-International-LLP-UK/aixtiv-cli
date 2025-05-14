import React, { useState, useContext, useEffect } from 'react';
import { Mic, Send, Volume2, Settings, LogOut, Users, BarChart2, Monitor, Database, Camera } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { AgentContext } from '../context/AgentContext';
import { ResourceContext } from '../context/ResourceContext';
import { TelemetryContext } from '../context/TelemetryContext';

const ASOOSNavigationDemo = () => {
  // Set the initial view to 'login' to ensure authentication
  const [viewMode, setViewMode] = useState('login');
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState([]);
  
  // Get contexts
  const { user, login, logout, isAuthenticated } = useContext(AuthContext);
  const { agent, agentPersonality, setAgentPersonality } = useContext(AgentContext);
  const { resources, todos } = useContext(ResourceContext);
  const { recordInteraction } = useContext(TelemetryContext);
  
  // Navigation handler - this will be attached to all navigation elements
  const navigateTo = (view) => {
    setViewMode(view);
    // Record navigation in telemetry
    recordInteraction('navigation', { from: viewMode, to: view });
    // Log navigation for debugging
    console.log(`Navigating to: ${view}`);
  };

  // Effect to check authentication
  useEffect(() => {
    if (isAuthenticated && viewMode === 'login') {
      navigateTo('main');
    }
  }, [isAuthenticated]);

  // Function to handle message sending
  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;
    
    // Add user message to chat
    const userMessage = { text: messageInput, sender: 'user', timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    
    // Record message in telemetry
    recordInteraction('message_sent', { content: messageInput });
    
    // Clear input
    setMessageInput('');
    
    try {
      // Call agent service to process message (implemented in AgentContext)
      const response = await agent.processMessage(messageInput);
      
      // Add agent response to chat
      const agentMessage = { 
        text: response.text, 
        sender: 'agent', 
        timestamp: new Date(),
        emotion: response.emotion,
        tone: response.tone
      };
      
      setMessages(prev => [...prev, agentMessage]);
    } catch (error) {
      console.error('Error processing message:', error);
      // Add error message
      setMessages(prev => [...prev, { 
        text: 'Sorry, I encountered an error processing your request.', 
        sender: 'agent', 
        timestamp: new Date(),
        error: true
      }]);
    }
  };
  
  // Homepage View (Main Dashboard)
  const HomeView = () => (
    <div className="flex-1 flex">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white p-6">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold">ASOOS Dashboard</h1>
          <div className="text-sm text-gray-500">Welcome back, {user?.displayName || 'User'}</div>
        </div>
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-2 border rounded-lg bg-gray-50">
          {messages.length === 0 ? (
            <div className="max-w-[70%] mr-auto">
              <div className="rounded-xl p-3 bg-gray-100">
                Welcome to ASOOS. How can I assist you today, {user?.displayName?.split(' ')[0] || 'User'}?
              </div>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div key={index} className={`max-w-[70%] ${msg.sender === 'user' ? 'ml-auto' : 'mr-auto'}`}>
                <div className={`rounded-xl p-3 ${msg.sender === 'user' ? 'bg-cyan-500 text-white' : 'bg-gray-100'}`}>
                  {msg.text}
                </div>
                {msg.tone && (
                  <div className="text-xs text-gray-400 mt-1 ml-2 italic">
                    {msg.emotion} {msg.tone} tone
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Input Area */}
        <div className="flex items-center space-x-4 pt-4 border-t border-gray-200">
          <button 
            className="p-2 rounded-full transition-colors text-gray-500 hover:text-cyan-500" 
            title="Start voice input"
            onClick={() => recordInteraction('voice_input_click')}
          >
            <Mic className="w-6 h-6" />
          </button>
          
          <input
            type="text"
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:border-cyan-500"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          
          <button 
            className="p-2 text-gray-500 hover:text-cyan-500 transition-colors" 
            title="Enable audio responses"
            onClick={() => recordInteraction('voice_output_toggle')}
          >
            <Volume2 className="w-6 h-6" />
          </button>
          
          <button 
            className="w-10 h-10 bg-cyan-500 rounded-full flex items-center justify-center text-white hover:bg-cyan-600 transition-colors"
            onClick={handleSendMessage}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Right Panel with Collapsible Sections */}
      <div className="w-96 bg-gray-50 flex flex-col">
        {/* Header with QB Lucy */}
        <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4">
          {/* Hexagonal Agent Representation */}
          <div className="relative w-12 h-12" title={`${agent?.name || 'QB Lucy'} - Your AI Copilot`}>
            <svg viewBox="0 0 100 100">
              <defs>
                <linearGradient id="hexAgentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0066cc" stopOpacity={0.8} />
                  <stop offset="50%" stopColor="#3399ff" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#66ccff" stopOpacity={0.8} />
                </linearGradient>
              </defs>
              <path 
                d="M50 0 L95 25 L95 75 L50 100 L5 75 L5 25 Z" 
                stroke="#0066cc" 
                strokeWidth="2" 
                fill="url(#hexAgentGradient)"
              />
              <circle cx="50" cy="35" r="10" fill="white" />
              <path d="M30 70 Q50 90 70 70" stroke="white" strokeWidth="2" fill="none" />
            </svg>
            
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center">
              <div className="text-xs">{agent?.emotion || '😊'}</div>
            </div>
          </div>
          
          {/* Copilot Information */}
          <div className="text-right">
            <div className="font-semibold">{agent?.name || 'QB Lucy'}</div>
            <div className="text-xs text-gray-500">
              {agentPersonality || 'Professional'} Mode
            </div>
          </div>
        </div>
        
        {/* Collapsible Sections */}
        <div className="m-4 bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b cursor-pointer bg-gray-50">
            <h3 className="font-bold text-blue-700">S2DO's</h3>
            <div className="text-gray-500">▼</div>
          </div>
          
          <div className="p-4 overflow-auto max-h-48">
            <div className="space-y-3">
              {todos && todos.length > 0 ? (
                todos.map((todo, index) => (
                  <div key={index} className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                    <span className="text-sm">{todo.content}</span>
                  </div>
                ))
              ) : (
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  <span className="text-sm">No current tasks</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Insights Panel */}
        <div className="m-4 bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b cursor-pointer bg-gray-50">
            <h3 className="font-bold text-blue-700">Insights</h3>
            <div className="text-gray-500">▶</div>
          </div>
        </div>
        
        {/* Resources */}
        <div className="m-4 bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b cursor-pointer bg-gray-50">
            <h3 className="font-bold text-blue-700">Resources</h3>
            <div className="text-gray-500">▶</div>
          </div>
        </div>
      </div>
    </div>
  );
  
  // Login View
  const LoginView = () => (
    <div className="flex-1 flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full relative overflow-hidden">
        {/* Hexagon Background Pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-5">
          <svg className="absolute top-0 right-0 w-96 h-96" viewBox="0 0 100 100">
            <path 
              d="M50 0 L100 25 L100 75 L50 100 L0 75 L0 25 Z" 
              stroke="#0055cc" 
              strokeWidth="1" 
              fill="#0055cc" 
            />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-center mb-6 relative z-10">
          <span className="italic">Aixtiv Symphony</span> <span className="font-bold">Orchestrating OS</span>
        </h1>
        <p className="text-gray-600 mb-8 text-center relative z-10">ASOOS</p>
        
        <div className="relative z-10 flex flex-col space-y-4">
          <button 
            onClick={() => login()}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
          >
            <div className="w-5 h-5">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" stroke="white" strokeWidth="2" fill="none"/>
                <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="white" strokeWidth="2" fill="none"/>
                <path d="M17.97 17.97A8.003 8.003 0 004.03 6.03" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
              </svg>
            </div>
            <span>Authenticate with Sally Port</span>
          </button>
          
          <div className="text-center text-sm text-gray-500">
            Secure password-less authentication
            <br />
            Developed by Dr. Grant's security team
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-200 text-center text-xs text-gray-400 relative z-10">
          <p>Mr. Phillip Corey Roark, CEO • pr@coaching2100.com</p>
        </div>
      </div>
    </div>
  );
  
  // Webinar/Academy View
  const WebinarView = () => (
    <div className="flex-1 flex flex-col bg-white">
      {/* Webinar Header */}
      <div className="bg-gradient-to-r from-blue-800 to-blue-600 text-white p-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Daily Training: Advanced Symphony Integration</h2>
          <p className="text-sm">Presenter: Dr. Alex Morgan • Today, 10:00 AM</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="bg-blue-900 p-2 rounded-full">
            <Users size={20} />
          </div>
          <span className="text-sm">42 Attendees</span>
        </div>
      </div>
      
      {/* Video Display Area */}
      <div className="flex-1 bg-gray-900 flex items-center justify-center relative">
        <div className="text-white text-center">
          <div className="w-24 h-24 rounded-full bg-black bg-opacity-50 flex items-center justify-center mx-auto mb-4">
            <div className="w-0 h-0 border-l-[12px] border-t-[8px] border-b-[8px] border-solid border-l-white border-t-transparent border-b-transparent ml-2"></div>
          </div>
          <p className="text-lg">Live Webinar Content</p>
          <p className="text-sm text-gray-400 mt-2">Click the camera icon below to enable your video</p>
        </div>
        
        {/* Video Controls */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 rounded-full px-4 py-2 flex items-center space-x-4">
          <button 
            className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white hover:bg-gray-600 transition-colors"
            onClick={() => recordInteraction('webinar_camera_toggle')}
          >
            <Camera size={18} />
          </button>
          
          <button 
            className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white hover:bg-gray-600 transition-colors"
            onClick={() => recordInteraction('webinar_audio_toggle')}
          >
            <Volume2 size={18} />
          </button>
          
          <button 
            onClick={() => navigateTo('settings')}
            className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white hover:bg-gray-600 transition-colors"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>
      
      {/* Webinar Controls */}
      <div className="bg-gray-100 border-t border-gray-300 p-3 flex justify-between items-center">
        <button 
          onClick={() => navigateTo('main')}
          className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors"
        >
          Back to Dashboard
        </button>
        
        <div className="text-sm text-gray-500">
          Session time: 24:15
        </div>
        
        <button 
          onClick={() => navigateTo('stats')}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Resources
        </button>
      </div>
    </div>
  );
  
  // Settings View
  const SettingsView = () => (
    <div className="flex-1 bg-gray-50 p-6 overflow-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Settings & Configuration</h1>
          <button 
            onClick={() => navigateTo('main')}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Voice & Language Settings */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-cyan-50">
              <h2 className="text-lg font-semibold flex items-center">
                <Volume2 className="mr-2 h-5 w-5 text-blue-500" />
                Voice & Language
              </h2>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Text-to-Speech</label>
                <div className="flex items-center">
                  <div className="relative inline-flex items-center mr-3">
                    <input 
                      type="checkbox" 
                      checked={agent?.voiceEnabled || false} 
                      onChange={() => agent.toggleVoice()}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </div>
                  <span className="text-sm text-gray-500">Enable voice responses</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Voice Model</label>
                <select 
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={agent?.voiceModel || 'us-female'}
                  onChange={(e) => agent.setVoiceModel(e.target.value)}
                >
                  <option value="us-female">US English (Female)</option>
                  <option value="uk-male">British English (Male)</option>
                  <option value="au-female">Australian English</option>
                  <option value="in-female">Indian English</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">Voice is automatically adapted based on your location.</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                <select 
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={agent?.language || 'en-US'}
                  onChange={(e) => agent.setLanguage(e.target.value)}
                >
                  <option value="en-US">English (US)</option>
                  <option value="en-GB">English (UK)</option>
                  <option value="fr-FR">French</option>
                  <option value="de-DE">German</option>
                  <option value="es-ES">Spanish</option>
                  <option value="ja-JP">Japanese</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* AI Personality Settings */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50">
              <h2 className="text-lg font-semibold flex items-center">
                <Users className="mr-2 h-5 w-5 text-purple-500" />
                AI Personality
              </h2>
            </div>
            <div className="p-4 space-y-3">
              <div 
                className={`flex items-center p-2 rounded-md ${agentPersonality === 'Professional' ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50'}`}
                onClick={() => setAgentPersonality('Professional')}
              >
                <div className="w-4 h-4 rounded-full border border-blue-400 flex items-center justify-center mr-2">
                  {agentPersonality === 'Professional' && <div className="w-2 h-2 rounded-full bg-blue-600"></div>}
                </div>
                <div>
                  <div className="font-medium">Professional</div>
                  <div className="text-xs text-gray-500">Formal, business-focused responses</div>
                </div>
              </div>
              
              <div 
                className={`flex items-center p-2 rounded-md ${agentPersonality === 'Friendly' ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50'}`}
                onClick={() => setAgentPersonality('Friendly')}
              >
                <div className="w-4 h-4 rounded-full border border-blue-400 flex items-center justify-center mr-2">
                  {agentPersonality === 'Friendly' && <div className="w-2 h-2 rounded-full bg-blue-600"></div>}
                </div>
                <div>
                  <div className="font-medium">Friendly</div>
                  <div className="text-xs text-gray-500">Casual, conversational tone</div>
                </div>
              </div>
              
              <div 
                className={`flex items-center p-2 rounded-md ${agentPersonality === 'Technical' ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50'}`}
                onClick={() => setAgentPersonality('Technical')}
              >
                <div className="w-4 h-4 rounded-full border border-blue-400 flex items-center justify-center mr-2">
                  {agentPersonality === 'Technical' && <div className="w-2 h-2 rounded-full bg-blue-600"></div>}
                </div>
                <div>
                  <div className="font-medium">Technical</div>
                  <div className="text-xs text-gray-500">Detailed, technically oriented responses</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button 
            onClick={() => navigateTo('main')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
  
  // Statistics/ROI Dashboard
  const StatsView = () => (
    <div className="flex-1 bg-gray-50 p-6 overflow-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Integration Statistics & ROI Dashboard</h1>
          <button 
            onClick={() => navigateTo('main')}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
        
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
            <div className="text-sm text-gray-500">Total Integrations</div>
            <div className="text-2xl font-bold">42</div>
            <div className="text-xs text-green-500 flex items-center mt-1">
              <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 15l-6-6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              21% increase
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-500">
            <div className="text-sm text-gray-500">Active Users</div>
            <div className="text-2xl font-bold">1,298</div>
            <div className="text-xs text-green-500 flex items-center mt-1">
              <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 15l-6-6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              8% increase
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-purple-500">
            <div className="text-sm text-gray-500">Automation Hours Saved</div>
            <div className="text-2xl font-bold">867</div>
            <div className="text-xs text-green-500 flex items-center mt-1">
              <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 15l-6-6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              32% increase
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-amber-500">
            <div className="text-sm text-gray-500">Est. Monthly ROI</div>
            <div className="text-2xl font-bold">$42,850</div>
            <div className="text-xs text-green-500 flex items-center mt-1">
              <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 15l-6-6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              18% increase
            </div>
          </div>
        </div>
        
        {/* Main Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Integration Usage */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex justify-between items-center">
              <h2 className="text-lg font-semibold flex items-center">
                <Database className="mr-2 h-5 w-5 text-blue-500" />
                Integration Usage
              </h2>
              <select className="text-xs border border-gray-300 rounded px-2 py-1">
                <option>Last 30 Days</option>
                <option>Last Quarter</option>
                <option>Last Year</option>
              </select>
            </div>
            <div className="p-4 h-64 flex items-center justify-center">
              {/* Chart Placeholder */}
              <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0">
                  <svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="none">
                    <path d="M0,150 C50,120 100,170 150,140 C200,110 250,160 300,130 C350,100 400,150 400,120 L400,200 L0,200 Z" fill="rgba(79, 70, 229, 0.1)" />
                    <path d="M0,160 C50,130 100,180 150,150 C200,120 250,170 300,140 C350,110 400,160 400,130" fill="none" stroke="#4F46E5" strokeWidth="2" />
                  </svg>
                </div>
                
                <div className="text-center text-gray-400 text-sm z-10">
                  Usage Chart
                </div>
              </div>
            </div>
          </div>
          
          {/* Monthly ROI Breakdown */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50 flex justify-between items-center">
              <h2 className="text-lg font-semibold flex items-center">
                <BarChart2 className="mr-2 h-5 w-5 text-green-500" />
                ROI Breakdown
              </h2>
              <select className="text-xs border border-gray-300 rounded px-2 py-1">
                <option>By Department</option>
                <option>By Integration</option>
                <option>By Time Period</option>
              </select>
            </div>
            <div className="p-4 h-64 flex items-center justify-center">
              {/* Chart Placeholder */}
              <div className="w-full h-full bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg flex items-center justify-center relative overflow-hidden">
                <div className="w-full h-full flex items-end justify-around p-4">
                  <div className="w-12 bg-green-200 h-20 rounded-t-lg"></div>
                  <div className="w-12 bg-green-300 h-32 rounded-t-lg"></div>
                  <div className="w-12 bg-green-400 h-24 rounded-t-lg"></div>
                  <div className="w-12 bg-green-500 h-16 rounded-t-lg"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-between">
          <button 
            onClick={() => navigateTo('main')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Back to Dashboard
          </button>
          
          <button 
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            onClick={() => recordInteraction('export_report_click')}
          >
            Export Report
          </button>
        </div>
      </div>
    </div>
  );
  
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar */}
      <div className="w-14 bg-black flex flex-col items-center pt-24 pb-6 space-y-6">
        {/* Sidebar Icons with Tooltips */}
        {[
          { id: 1, name: 'Communication', desc: 'Automated Communication', view: 'main' },
          { id: 2, name: 'Growth', desc: 'Growth Revenues', view: 'main' },
          { id: 3, name: 'Services', desc: 'Client Services Innovation', view: 'main' },
          { id: 4, name: 'Automation', desc: 'Organizational Automation', view: 'main' },
          { id: 5, name: 'ROI', desc: 'ROI Dashboard', view: 'stats' },
          { id: 6, name: 'Wish', desc: 'Your Wish', view: 'main' },
          { id: 7, name: 'Academy', desc: 'Learning & Training', view: 'webinar', isTriangle: true }
        ].map((item) => (
          <div
            key={item.id}
            onClick={() => navigateTo(item.view)}
            onMouseEnter={() => setActiveTooltip(item.id)}
            onMouseLeave={() => setActiveTooltip(null)}
            className={`w-8 h-8 flex items-center justify-center cursor-pointer transition-all duration-300 group relative ${
              (viewMode === item.view) ? 'opacity-100 scale-110' : 'opacity-60 hover:opacity-80'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <defs>
                <linearGradient id={`gradient${item.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFD700" stopOpacity={1} />
                  <stop offset="50%" stopColor="#c7b299" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#50C878" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              {item.isTriangle ? (
                <path d="M12 2L22 20H2L12 2z" stroke={`url(#gradient${item.id})`} strokeWidth="2" fill="none"/>
              ) : (
                <circle cx="12" cy="12" r="10" stroke={`url(#gradient${item.id})`} strokeWidth="2" fill="none"/>
              )}
            </svg>
            
            {/* Tooltip that appears on hover */}
            {activeTooltip === item.id && (
              <div className="absolute left-full ml-2 bg-gray-800 text-white text-xs py-1 px-2 rounded-md whitespace-nowrap z-50">
                <div className="font-bold">{item.name}</div>
                <div>{item.desc}</div>
              </div>
            )}
          </div>
        ))}

        {/* Settings Icon */}
        <div
          onClick={() => navigateTo('settings')}
          onMouseEnter={() => setActiveTooltip(8)}
          onMouseLeave={() => setActiveTooltip(null)}
          className={`w-8 h-8 flex items-center justify-center cursor-pointer transition-all duration-300 relative ${
            viewMode === 'settings' ? 'opacity-100 scale-110' : 'opacity-60 hover:opacity-80'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <defs>
              <linearGradient id="gradient8" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00BFFF" stopOpacity={1} />
                <stop offset="50%" stopColor="#87CEEB" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#1E90FF" stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <circle cx="12" cy="12" r="10" stroke="url(#gradient8)" strokeWidth="2" fill="none"/>
          </svg>
          <Settings className="absolute w-4 h-4 text-white" />
          
          {/* Tooltip that appears on hover */}
          {activeTooltip === 8 && (
            <div className="absolute left-full ml-2 bg-gray-800 text-white text-xs py-1 px-2 rounded-md whitespace-nowrap z-50">
              <div className="font-bold">Settings</div>
              <div>System Configuration & Preferences</div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-16 bg-black text-white flex items-center justify-between px-6">
          <div 
            className="font-bold text-cyan-400 text-2xl tracking-wide cursor-pointer"
            onClick={() => navigateTo('main')}
          >
            ASOOS
          </div>
          <div className="flex-1 flex justify-center">
            
          </div>
          <div className="text-right">
            <div className="font-bold text-lg">{user?.displayName || 'Mr. Phillip Corey Roark, CEO'}</div>
            <div className="text-sm text-cyan-400">
              <span className="italic">Aixtiv Symphony</span> <span className="font-bold">Orchestrating OS</span>
            </div>
          </div>
        </div>

        {/* Dynamic Content Area based on viewMode */}
        {viewMode === 'login' && <LoginView />}
        {viewMode === 'main' && <HomeView />}
        {viewMode === 'webinar' && <WebinarView />}
        {viewMode === 'settings' && <SettingsView />}
        {viewMode === 'stats' && <StatsView />}

        {/* Integration Bar */}
        <div className="h-12 bg-gray-100 flex items-center justify-between px-4">
          {/* Settings Icon */}
          <div 
            className="w-8 h-8 flex items-center justify-center cursor-pointer hover:bg-gray-200 rounded-full transition-colors"
            onClick={() => navigateTo('settings')}
          >
            <Settings className="w-5 h-5 text-gray-700" />
          </div>
          
          <div className="flex-1 flex items-center overflow-x-auto justify-center">
            {/* Integration Icons - Horizontal layout */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-gray-600 shadow-sm border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                Z
              </div>
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-gray-600 shadow-sm border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                G
              </div>
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-gray-600 shadow-sm border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                S
              </div>
            </div>
          </div>
          
          {/* User Actions */}
          <div className="flex items-center space-x-2">
            <div className="text-xs text-center">
              <div>Integration</div>
              <div>Gateway</div>
            </div>
            
            <button 
              onClick={() => {
                logout();
                navigateTo('login');
              }}
              className="p-1 text-gray-500 hover:text-gray-700 transition-colors" 
              title="Log out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ASOOSNavigationDemo;