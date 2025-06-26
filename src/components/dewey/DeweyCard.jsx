import React from 'react';

/**
 * DeweyCard Component
 *
 * Displays a Dewey Digital Card which represents a task assigned to an agent.
 * These cards include performance history, task details, and blockchain links.
 */
const DeweyCard = ({ card }) => {
  const { id, title, agentName, agentInstance, task, performance, nftRef, timestamp, status } =
    card;

  // Calculate time since creation
  const getTimeSince = (timestamp) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffInSeconds = Math.floor((now - then) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  };

  // Render star rating
  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={i <= rating ? 'star filled' : 'star'}>
          ★
        </span>
      );
    }
    return stars;
  };

  return (
    <div className={`dewey-card ${status.toLowerCase()}`}>
      <div className="card-header">
        <h3>{title}</h3>
        <span className={`status ${status.toLowerCase()}`}>{status}</span>
      </div>

      <div className="agent-info">
        <div className="agent">{agentName}</div>
        <div className="instance">Instance {agentInstance}</div>
      </div>

      <div className="task-description">
        <p>{task}</p>
      </div>

      <div className="card-meta">
        <div className="performance">{renderStars(performance)}</div>

        <div className="blockchain-ref">
          <a
            href={`https://deweychain.com/nft/${nftRef}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            NFT: {nftRef}
          </a>
        </div>
      </div>

      <div className="card-footer">
        <div className="timestamp">{getTimeSince(timestamp)}</div>
        <div className="card-id">Card #{id}</div>
      </div>
    </div>
  );
};

export default DeweyCard;
