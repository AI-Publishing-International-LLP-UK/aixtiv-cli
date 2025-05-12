/**
 * Demo component for Pinecone semantic search functionality
 * 
 * This component demonstrates the use of the usePineconeSearch hook to perform
 * semantic searches across memories and prompts in the system.
 * 
 * @module components/PineconeSearchDemo
 * @author Aixtiv Symphony Team
 * @copyright 2025 AI Publishing International LLP
 * @version 1.0.0
 */

import React, { useState, useCallback } from 'react';
import { usePineconeSearch, PineconeSearchResult } from '../hooks/usePineconeSearch';

interface SearchFilter {
  type?: string;
  category?: string;
  copilotId?: string;
  agentId?: string;
  sessionId?: string;
  minImportance?: number;
}

/**
 * Pinecone Search Demo Component
 */
const PineconeSearchDemo: React.FC = () => {
  // State for search inputs
  const [queryText, setQueryText] = useState<string>('');
  const [searchType, setSearchType] = useState<'memories' | 'prompts' | 'both'>('both');
  const [resultCount, setResultCount] = useState<number>(10);
  const [filter, setFilter] = useState<SearchFilter>({});
  
  // State for filter inputs
  const [filterType, setFilterType] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterCopilotId, setFilterCopilotId] = useState<string>('');
  const [filterAgentId, setFilterAgentId] = useState<string>('');
  const [filterSessionId, setFilterSessionId] = useState<string>('');
  const [filterMinImportance, setFilterMinImportance] = useState<number | undefined>(undefined);
  
  // Pinecone search hook
  const {
    searchMemories,
    searchPrompts,
    findSimilarContent,
    searchResults,
    loading,
    error
  } = usePineconeSearch();
  
  // Results display state
  const [memories, setMemories] = useState<PineconeSearchResult[]>([]);
  const [prompts, setPrompts] = useState<PineconeSearchResult[]>([]);
  const [combined, setCombined] = useState<PineconeSearchResult[]>([]);
  
  /**
   * Handle search form submission
   */
  const handleSearch = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!queryText.trim()) {
      return;
    }
    
    // Build filter object from inputs
    const searchFilter: SearchFilter = {};
    
    if (filterType) searchFilter.type = filterType;
    if (filterCategory) searchFilter.category = filterCategory;
    if (filterCopilotId) searchFilter.copilotId = filterCopilotId;
    if (filterAgentId) searchFilter.agentId = filterAgentId;
    if (filterSessionId) searchFilter.sessionId = filterSessionId;
    if (filterMinImportance !== undefined) searchFilter.minImportance = filterMinImportance;
    
    // Set the filter state
    setFilter(searchFilter);
    
    // Perform the appropriate search based on type
    try {
      if (searchType === 'memories') {
        const results = await searchMemories(queryText, {
          filter: searchFilter,
          topK: resultCount
        });
        setMemories(results);
        setPrompts([]);
        setCombined(results);
      } else if (searchType === 'prompts') {
        const results = await searchPrompts(queryText, {
          filter: searchFilter,
          topK: resultCount
        });
        setMemories([]);
        setPrompts(results);
        setCombined(results);
      } else {
        // Search both
        const results = await findSimilarContent(queryText, {
          filter: searchFilter,
          topK: resultCount
        });
        setMemories(results.memories);
        setPrompts(results.prompts);
        setCombined(results.combined || []);
      }
    } catch (err) {
      console.error('Error performing search:', err);
    }
  }, [
    queryText, 
    searchType, 
    resultCount,
    filterType,
    filterCategory, 
    filterCopilotId,
    filterAgentId,
    filterSessionId,
    filterMinImportance,
    searchMemories,
    searchPrompts,
    findSimilarContent
  ]);
  
  /**
   * Format timestamp for display
   */
  const formatTimestamp = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch (error) {
      return timestamp;
    }
  };
  
  return (
    <div className="pinecone-search-demo">
      <h2>Semantic Search Demo</h2>
      
      <form onSubmit={handleSearch} className="search-form">
        <div className="search-input-group">
          <label htmlFor="query-text">Search Query:</label>
          <input
            id="query-text"
            type="text"
            value={queryText}
            onChange={e => setQueryText(e.target.value)}
            placeholder="Enter search query..."
            required
          />
        </div>
        
        <div className="search-options-group">
          <div className="search-type-group">
            <label>Search Type:</label>
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  name="search-type"
                  value="both"
                  checked={searchType === 'both'}
                  onChange={() => setSearchType('both')}
                />
                Both
              </label>
              <label>
                <input
                  type="radio"
                  name="search-type"
                  value="memories"
                  checked={searchType === 'memories'}
                  onChange={() => setSearchType('memories')}
                />
                Memories
              </label>
              <label>
                <input
                  type="radio"
                  name="search-type"
                  value="prompts"
                  checked={searchType === 'prompts'}
                  onChange={() => setSearchType('prompts')}
                />
                Prompts
              </label>
            </div>
          </div>
          
          <div className="result-count-group">
            <label htmlFor="result-count">Result Count:</label>
            <input
              id="result-count"
              type="number"
              min="1"
              max="100"
              value={resultCount}
              onChange={e => setResultCount(parseInt(e.target.value))}
            />
          </div>
        </div>
        
        <div className="filter-group">
          <h3>Filter Options</h3>
          
          <div className="filter-row">
            <div className="filter-input">
              <label htmlFor="filter-type">Type:</label>
              <input
                id="filter-type"
                type="text"
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                placeholder="e.g., user_input"
              />
            </div>
            
            <div className="filter-input">
              <label htmlFor="filter-category">Category:</label>
              <input
                id="filter-category"
                type="text"
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                placeholder="e.g., general"
              />
            </div>
          </div>
          
          <div className="filter-row">
            <div className="filter-input">
              <label htmlFor="filter-copilot-id">Copilot ID:</label>
              <input
                id="filter-copilot-id"
                type="text"
                value={filterCopilotId}
                onChange={e => setFilterCopilotId(e.target.value)}
                placeholder="e.g., dr-lucy"
              />
            </div>
            
            <div className="filter-input">
              <label htmlFor="filter-agent-id">Agent ID:</label>
              <input
                id="filter-agent-id"
                type="text"
                value={filterAgentId}
                onChange={e => setFilterAgentId(e.target.value)}
                placeholder="e.g., dr-match"
              />
            </div>
          </div>
          
          <div className="filter-row">
            <div className="filter-input">
              <label htmlFor="filter-session-id">Session ID:</label>
              <input
                id="filter-session-id"
                type="text"
                value={filterSessionId}
                onChange={e => setFilterSessionId(e.target.value)}
                placeholder="e.g., session-123"
              />
            </div>
            
            <div className="filter-input">
              <label htmlFor="filter-min-importance">Min Importance:</label>
              <input
                id="filter-min-importance"
                type="number"
                min="1"
                max="10"
                value={filterMinImportance || ''}
                onChange={e => setFilterMinImportance(e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="1-10"
              />
            </div>
          </div>
        </div>
        
        <button type="submit" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>
      
      {error && (
        <div className="error-message">
          <p>Error: {error.message}</p>
        </div>
      )}
      
      <div className="search-results">
        {searchType === 'both' ? (
          <div className="combined-results">
            <h3>Combined Results ({combined.length})</h3>
            
            {combined.length === 0 ? (
              <p>No results found</p>
            ) : (
              <ul className="result-list">
                {combined.map(result => (
                  <li key={result.id} className="result-item">
                    <div className="result-header">
                      <span className="result-type">
                        {result.metadata.type || 'Unknown Type'}
                      </span>
                      <span className="result-score">
                        Score: {result.score.toFixed(4)}
                      </span>
                    </div>
                    
                    <div className="result-metadata">
                      <div className="metadata-item">
                        <span className="metadata-label">ID:</span>
                        <span className="metadata-value">{result.id}</span>
                      </div>
                      
                      {result.metadata.timestamp && (
                        <div className="metadata-item">
                          <span className="metadata-label">Time:</span>
                          <span className="metadata-value">
                            {formatTimestamp(result.metadata.timestamp)}
                          </span>
                        </div>
                      )}
                      
                      {result.metadata.importance !== undefined && (
                        <div className="metadata-item">
                          <span className="metadata-label">Importance:</span>
                          <span className="metadata-value">
                            {result.metadata.importance}
                          </span>
                        </div>
                      )}
                      
                      {result.metadata.category && (
                        <div className="metadata-item">
                          <span className="metadata-label">Category:</span>
                          <span className="metadata-value">
                            {result.metadata.category}
                          </span>
                        </div>
                      )}
                      
                      {result.metadata.copilotId && (
                        <div className="metadata-item">
                          <span className="metadata-label">Copilot:</span>
                          <span className="metadata-value">
                            {result.metadata.copilotId}
                          </span>
                        </div>
                      )}
                      
                      {result.metadata.agentId && (
                        <div className="metadata-item">
                          <span className="metadata-label">Agent:</span>
                          <span className="metadata-value">
                            {result.metadata.agentId}
                          </span>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <>
            {searchType === 'memories' && (
              <div className="memories-results">
                <h3>Memory Results ({memories.length})</h3>
                
                {memories.length === 0 ? (
                  <p>No memory results found</p>
                ) : (
                  <ul className="result-list">
                    {memories.map(result => (
                      <li key={result.id} className="result-item">
                        <div className="result-header">
                          <span className="result-type">
                            {result.metadata.type || 'Unknown Type'}
                          </span>
                          <span className="result-score">
                            Score: {result.score.toFixed(4)}
                          </span>
                        </div>
                        
                        <div className="result-metadata">
                          <div className="metadata-item">
                            <span className="metadata-label">ID:</span>
                            <span className="metadata-value">{result.id}</span>
                          </div>
                          
                          {result.metadata.timestamp && (
                            <div className="metadata-item">
                              <span className="metadata-label">Time:</span>
                              <span className="metadata-value">
                                {formatTimestamp(result.metadata.timestamp)}
                              </span>
                            </div>
                          )}
                          
                          {result.metadata.importance !== undefined && (
                            <div className="metadata-item">
                              <span className="metadata-label">Importance:</span>
                              <span className="metadata-value">
                                {result.metadata.importance}
                              </span>
                            </div>
                          )}
                          
                          {result.metadata.copilotId && (
                            <div className="metadata-item">
                              <span className="metadata-label">Copilot:</span>
                              <span className="metadata-value">
                                {result.metadata.copilotId}
                              </span>
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            
            {searchType === 'prompts' && (
              <div className="prompts-results">
                <h3>Prompt Results ({prompts.length})</h3>
                
                {prompts.length === 0 ? (
                  <p>No prompt results found</p>
                ) : (
                  <ul className="result-list">
                    {prompts.map(result => (
                      <li key={result.id} className="result-item">
                        <div className="result-header">
                          <span className="result-type">
                            {result.metadata.type || 'Unknown Type'}
                          </span>
                          <span className="result-score">
                            Score: {result.score.toFixed(4)}
                          </span>
                        </div>
                        
                        <div className="result-metadata">
                          <div className="metadata-item">
                            <span className="metadata-label">ID:</span>
                            <span className="metadata-value">{result.id}</span>
                          </div>
                          
                          {result.metadata.timestamp && (
                            <div className="metadata-item">
                              <span className="metadata-label">Time:</span>
                              <span className="metadata-value">
                                {formatTimestamp(result.metadata.timestamp)}
                              </span>
                            </div>
                          )}
                          
                          {result.metadata.agentId && (
                            <div className="metadata-item">
                              <span className="metadata-label">Agent:</span>
                              <span className="metadata-value">
                                {result.metadata.agentId}
                              </span>
                            </div>
                          )}
                          
                          {result.metadata.category && (
                            <div className="metadata-item">
                              <span className="metadata-label">Category:</span>
                              <span className="metadata-value">
                                {result.metadata.category}
                              </span>
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </div>
      
      <style jsx>{`
        .pinecone-search-demo {
          padding: 20px;
          max-width: 1000px;
          margin: 0 auto;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        }
        
        h2 {
          margin-bottom: 20px;
          color: #333;
        }
        
        .search-form {
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .search-input-group {
          margin-bottom: 20px;
        }
        
        .search-input-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
        }
        
        .search-input-group input {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 16px;
        }
        
        .search-options-group {
          display: flex;
          margin-bottom: 20px;
        }
        
        .search-type-group {
          flex: 1;
        }
        
        .radio-group {
          display: flex;
          gap: 20px;
        }
        
        .radio-group label {
          display: flex;
          align-items: center;
          gap: 5px;
          cursor: pointer;
        }
        
        .result-count-group {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        
        .result-count-group input {
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 16px;
          width: 80px;
        }
        
        .filter-group {
          border-top: 1px solid #ddd;
          padding-top: 20px;
          margin-bottom: 20px;
        }
        
        .filter-group h3 {
          margin-bottom: 15px;
          font-weight: 500;
          font-size: 18px;
        }
        
        .filter-row {
          display: flex;
          gap: 20px;
          margin-bottom: 15px;
        }
        
        .filter-input {
          flex: 1;
        }
        
        .filter-input label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
        }
        
        .filter-input input {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }
        
        button {
          background-color: #4285f4;
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 4px;
          font-size: 16px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        button:hover {
          background-color: #3367d6;
        }
        
        button:disabled {
          background-color: #a0c3ff;
          cursor: not-allowed;
        }
        
        .error-message {
          background-color: #ffebee;
          color: #c62828;
          padding: 10px 15px;
          border-radius: 4px;
          margin-bottom: 20px;
        }
        
        .search-results {
          margin-top: 30px;
        }
        
        .search-results h3 {
          margin-bottom: 15px;
          padding-bottom: 5px;
          border-bottom: 1px solid #eee;
          font-weight: 500;
        }
        
        .result-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .result-item {
          background-color: #fff;
          border: 1px solid #eee;
          border-radius: 6px;
          padding: 15px;
          margin-bottom: 15px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }
        
        .result-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        
        .result-type {
          font-weight: 500;
          color: #4285f4;
        }
        
        .result-score {
          font-weight: 500;
          color: #5f6368;
        }
        
        .result-metadata {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 10px;
        }
        
        .metadata-item {
          font-size: 14px;
          display: flex;
          flex-direction: column;
        }
        
        .metadata-label {
          font-weight: 500;
          color: #5f6368;
          margin-bottom: 2px;
        }
        
        .metadata-value {
          color: #3c4043;
          word-break: break-word;
        }
      `}</style>
    </div>
  );
};

export default PineconeSearchDemo;