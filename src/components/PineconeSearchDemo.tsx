/**
 * Demo component for Pinecone vector search functionality
 * 
 * @module components/PineconeSearchDemo
 * @author Aixtiv Symphony Team
 * @copyright 2025 AI Publishing International LLP
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import usePineconeSearch from '../hooks/usePineconeSearch';

interface PineconeSearchDemoProps {
  defaultQuery?: string;
  indexName?: string;
  maxResults?: number;
}

/**
 * Component for demonstrating Pinecone semantic search capabilities
 */
const PineconeSearchDemo: React.FC<PineconeSearchDemoProps> = ({
  defaultQuery = '',
  indexName = 'aixtiv-default',
  maxResults = 10
}) => {
  const [query, setQuery] = useState<string>(defaultQuery);
  const [searchTrigger, setSearchTrigger] = useState<number>(0);
  const { search, loading, error, results } = usePineconeSearch();
  
  useEffect(() => {
    if (defaultQuery && !searchTrigger) {
      // Perform initial search with default query
      search(defaultQuery, {
        index: indexName,
        topK: maxResults
      });
    }
  }, [defaultQuery, indexName, maxResults, search, searchTrigger]);
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      search(query, {
        index: indexName,
        topK: maxResults
      });
      setSearchTrigger(prev => prev + 1);
    }
  };
  
  return (
    <div className="pinecone-search-demo">
      <h2>Semantic Search Demo</h2>
      <p>Search for semantically similar content in the {indexName} index</p>
      
      <form onSubmit={handleSearch} className="search-form">
        <div className="input-group">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your search query..."
            className="search-input"
          />
          <button 
            type="submit" 
            className="search-button"
            disabled={loading || !query.trim()}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>
      
      {error && (
        <div className="error-message">
          <p>Error: {error.message}</p>
        </div>
      )}
      
      {results.length > 0 ? (
        <div className="search-results">
          <h3>Search Results</h3>
          <ul className="results-list">
            {results.map((result) => (
              <li key={result.id} className="result-item">
                <div className="result-header">
                  <h4 className="result-id">{result.id}</h4>
                  <span className="result-score">Similarity: {(result.score * 100).toFixed(2)}%</span>
                </div>
                {result.metadata && (
                  <div className="result-metadata">
                    {Object.entries(result.metadata).map(([key, value]) => (
                      <div key={key} className="metadata-item">
                        <span className="metadata-key">{key}:</span>
                        <span className="metadata-value">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : searchTrigger > 0 && !loading ? (
        <div className="no-results">
          <p>No results found for your query.</p>
        </div>
      ) : null}
    </div>
  );
};

export default PineconeSearchDemo;