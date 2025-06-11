import React, { useState } from 'react';
import ClaudeInterface from './components/claude/ClaudeInterface';
import AgentManager from './components/agents/AgentManager';
import DeweyCard from './components/dewey/DeweyCard';

/**
 * Main App Component for ASOOS Divinity Wing Interface
 * 
 * Provides navigation and integration of all main components:
 * - Agent Management
 * - Dewey Card System
 * - Claude Interface for interaction
 */
const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Mock data for Dewey Cards
  const mockDeweyCards = [
    {
      id: 'DWC-8F43',
      title: 'Enterprise LMS RFP',
      agentName: 'Dr. Lucy 01',
      agentInstance: '8732',
      task: 'Lead research analysis for EdTech platform evaluation',
      performance: 5,
      nftRef: 'ETH-QMM932',
      timestamp: '2025-05-20T14:22:10Z',
      status: 'Completed'
    },
    {
      id: 'DWC-9A21',
      title: 'Integration Gateway Security',
      agentName: 'Dr. Grant 02',
      agentInstance: '4521',
      task: 'Implement token validation for cross-domain requests',
      performance: 4,
      nftRef: 'ETH-QMM945',
      timestamp: '2025-05-21T09:17:32Z',
      status: 'Completed'
    },
    {
      id: 'DWC-7C92',
      title: 'Agent Lifecycle Management',
      agentName: 'Dr. Claude 01',
      agentInstance: '2234',
      task: 'Design promotion pathway for Tier 03 agents',
      performance: 5,
      nftRef: 'ETH-QMM951',
      timestamp: '2025-05-22T16:45:03Z',
      status: 'Completed'
    },
    {
      id: 'DWC-3D77',
      title: 'S2DO Smart Contract Integration',
      agentName: 'Dr. Burby 02',
      agentInstance: '5133',
      task: 'Develop blockchain verification for completed tasks',
      performance: 0,
      nftRef: '',
      timestamp: '2025-05-23T10:12:45Z',
      status: 'In Progress'
    }
  ];
  
  // Stats for dashboard
  const stats = {
    activeAgents: 92,
    deweyCards: '1.4M',
    smartContracts: 18
  };
  
  return (
    <div className="asoos-app">
      <header>
        <div className="container">
          <div className="header-content">
            <div className="logo">ASOOS <span>Divinity Wing</span></div>
            <div className="user-section">
              <div className="user-avatar">MR</div>
              <div>
                <div>Mr. Phillip Corey Roark</div>
                <small>Commander</small>
              </div>
            </div>
          </div>
          <nav>
            <ul className="nav-list">
              <li className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}>
                <a href="#" onClick={() => setActiveTab('dashboard')}>Dashboard</a>
              </li>
              <li className={`nav-item ${activeTab === 'agents' ? 'active' : ''}`}>
                <a href="#" onClick={() => setActiveTab('agents')}>Agents</a>
              </li>
              <li className={`nav-item ${activeTab === 'dewey' ? 'active' : ''}`}>
                <a href="#" onClick={() => setActiveTab('dewey')}>Dewey Cards</a>
              </li>
              <li className={`nav-item ${activeTab === 's2do' ? 'active' : ''}`}>
                <a href="#" onClick={() => setActiveTab('s2do')}>S2DO Workflow</a>
              </li>
              <li className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`}>
                <a href="#" onClick={() => setActiveTab('analytics')}>Analytics</a>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <main className="container">
        {activeTab === 'dashboard' && (
          <>
            <div className="dashboard-grid">
              <div className="stat-card">
                <h3>Active Agents</h3>
                <div className="value">{stats.activeAgents}</div>
                <div className="description">Across Opus 1: Amplify to Opus 5: Senador</div>
              </div>
              <div className="stat-card">
                <h3>Dewey Cards</h3>
                <div className="value">{stats.deweyCards}</div>
                <div className="description">Task cards with performance history</div>
              </div>
              <div className="stat-card">
                <h3>Smart Contracts</h3>
                <div className="value">{stats.smartContracts}</div>
                <div className="description">Recent blockchain transactions</div>
              </div>
            </div>
            
            <h2 className="section-title">Recent Dewey Cards</h2>
            <div className="dewey-cards">
              {mockDeweyCards.slice(0, 3).map(card => (
                <DeweyCard key={card.id} card={card} />
              ))}
            </div>
            
            <h2 className="section-title">Claude Interface</h2>
            <ClaudeInterface />
          </>
        )}
        
        {activeTab === 'agents' && (
          <>
            <h2 className="section-title">Agent Management</h2>
            <AgentManager />
          </>
        )}
        
        {activeTab === 'dewey' && (
          <>
            <h2 className="section-title">Dewey Digital Cards</h2>
            <div className="dewey-cards">
              {mockDeweyCards.map(card => (
                <DeweyCard key={card.id} card={card} />
              ))}
            </div>
          </>
        )}
        
        {activeTab === 's2do' && (
          <>
            <h2 className="section-title">S2DO Workflow</h2>
            <p>The S2DO (Scan-to-Do) workflow system manages task approvals and blockchain integration.</p>
            <div className="workflow-diagram">
              <div className="workflow-step">
                <div className="step-number">1</div>
                <div className="step-label">Task Created</div>
                <div className="step-agent">Tier 01 Core agent prototypes</div>
              </div>
              <div className="workflow-connector">→</div>
              <div className="workflow-step">
                <div className="step-number">2</div>
                <div className="step-label">Task Assigned</div>
                <div className="step-agent">Tier 02 Deploy agent executes</div>
              </div>
              <div className="workflow-connector">→</div>
              <div className="workflow-step">
                <div className="step-number">3</div>
                <div className="step-label">Task Completed</div>
                <div className="step-agent">Tier 03 Engage agent delivers</div>
              </div>
              <div className="workflow-connector">→</div>
              <div className="workflow-step">
                <div className="step-number">4</div>
                <div className="step-label">Task Archived</div>
                <div className="step-agent">Dewey Card with lifecycle tags</div>
              </div>
            </div>
            <ClaudeInterface />
          </>
        )}
        
        {activeTab === 'analytics' && (
          <>
            <h2 className="section-title">Analytics</h2>
            <p>Performance analytics for the ASOOS Divinity Wing system.</p>
            <div className="coming-soon">Analytics dashboard coming soon</div>
          </>
        )}
      </main>

      <footer>
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h3>About ASOOS</h3>
              <p>ASOOS (Aixtiv Symphony Orchestrating Operating System) is a modular, agent-driven enterprise solution for orchestrating AI workflows and human collaboration.</p>
            </div>
            <div className="footer-section">
              <h3>Quick Links</h3>
              <ul>
                <li><a href="#">Documentation</a></li>
                <li><a href="#">API Reference</a></li>
                <li><a href="#">Support</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h3>Contact</h3>
              <p>For assistance, please contact your agent representative or system administrator.</p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 ASOOS Divinity Wing. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
