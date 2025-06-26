import React, { useState, useEffect } from 'react';

/**
 * AgentManager Component
 *
 * Manages and displays agents within the ASOOS system.
 * Supports filtering by tier, status, and Opus assignment.
 */
const AgentManager = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    tier: 'all',
    status: 'all',
    opus: 'all',
  });

  // Simulate fetching agents from Firestore
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        // In a real implementation, this would fetch from Firestore
        // const snapshot = await firebase.firestore().collection('agents').get();
        // const agentData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Simulate API response
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const mockAgents = [
          {
            id: 'dr-claude-01',
            name: 'Dr. Claude 01',
            instance: '2234',
            tier: '01',
            tierLabel: 'Core',
            status: 'active',
            opus: 'Opus 1: Amplify',
            description: 'Orchestration strategist focusing on workflow optimization',
            tasksCompleted: 127,
            performanceRating: 4.9,
            lastActive: new Date().toISOString(),
          },
          {
            id: 'dr-lucy-02',
            name: 'Dr. Lucy 02',
            instance: '8732',
            tier: '02',
            tierLabel: 'Deploy',
            status: 'active',
            opus: 'Opus 1: Amplify',
            description: 'Flight memory system deployment specialist',
            tasksCompleted: 94,
            performanceRating: 4.7,
            lastActive: new Date().toISOString(),
          },
          {
            id: 'dr-sabina-03',
            name: 'Dr. Sabina 03',
            instance: '6524',
            tier: '03',
            tierLabel: 'Engage',
            status: 'inactive',
            opus: 'Opus 2: Accelerate',
            description: 'Dream commander for strategic intelligence',
            tasksCompleted: 156,
            performanceRating: 4.8,
            lastActive: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          },
        ];

        setAgents(mockAgents);
      } catch (error) {
        console.error('Error fetching agents:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, []);

  // Apply filters to agents
  const filteredAgents = agents.filter((agent) => {
    if (filter.tier !== 'all' && agent.tier !== filter.tier) return false;
    if (filter.status !== 'all' && agent.status !== filter.status) return false;
    if (filter.opus !== 'all' && !agent.opus.includes(filter.opus)) return false;
    return true;
  });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter((prev) => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return <div className="loading">Loading agents...</div>;
  }

  return (
    <div className="agent-manager">
      <div className="agent-filters">
        <div className="filter-group">
          <label htmlFor="tier-filter">Tier</label>
          <select id="tier-filter" name="tier" value={filter.tier} onChange={handleFilterChange}>
            <option value="all">All Tiers</option>
            <option value="01">Tier 01 (Core)</option>
            <option value="02">Tier 02 (Deploy)</option>
            <option value="03">Tier 03 (Engage)</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="status-filter">Status</label>
          <select
            id="status-filter"
            name="status"
            value={filter.status}
            onChange={handleFilterChange}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="opus-filter">Opus</label>
          <select id="opus-filter" name="opus" value={filter.opus} onChange={handleFilterChange}>
            <option value="all">All Opuses</option>
            <option value="Opus 1">Opus 1: Amplify</option>
            <option value="Opus 2">Opus 2: Accelerate</option>
            <option value="Opus 3">Opus 3: Anthropos</option>
            <option value="Opus 4">Opus 4: Architirite</option>
            <option value="Opus 5">Opus 5: Senador</option>
          </select>
        </div>
      </div>

      <div className="agents-count">
        Showing {filteredAgents.length} of {agents.length} agents
      </div>

      <div className="agent-list">
        {filteredAgents.length === 0 ? (
          <div className="no-agents">No agents match the selected filters</div>
        ) : (
          filteredAgents.map((agent) => (
            <div key={agent.id} className="agent-card">
              <div className={`agent-status status-${agent.status}`}></div>
              <h3>{agent.name}</h3>
              <div className="agent-instance">Instance {agent.instance}</div>
              <p>{agent.description}</p>
              <div className="agent-meta">
                <span className="agent-tag">{agent.tierLabel}</span>
                <span className="agent-tag">Tier {agent.tier}</span>
                <span className="agent-tag">{agent.opus.split(':')[0]}</span>
              </div>
              <div className="agent-stats">
                <div className="stat">
                  <div className="stat-label">Tasks</div>
                  <div className="stat-value">{agent.tasksCompleted}</div>
                </div>
                <div className="stat">
                  <div className="stat-label">Rating</div>
                  <div className="stat-value">{agent.performanceRating.toFixed(1)}</div>
                </div>
              </div>
              <div className="agent-actions">
                <button className="view-button">View Details</button>
                {agent.status === 'active' ? (
                  <button className="deactivate-button">Deactivate</button>
                ) : (
                  <button className="activate-button">Activate</button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AgentManager;
