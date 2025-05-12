/**
 * Production-ready Pinecone vector search interface for Aixtiv CLI
 * 
 * @module components/PineconeSearchInterface
 * @author Aixtiv Symphony Team
 * @copyright 2025 AI Publishing International LLP
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import usePineconeSearch from '../hooks/usePineconeSearch';

interface PineconeSearchInterfaceProps {
  initialQuery?: string;
  indexName: string;
  maxResults?: number;
  filters?: Record<string, any>;
  onResultsLoaded?: (results: any[]) => void;
  namespace?: string;
  className?: string;
  includeMetadata?: boolean;
  autoSearch?: boolean;
}

/**
 * Production-ready component for Pinecone semantic search capabilities in Aixtiv Symphony
 */
const PineconeSearchInterface: React.FC<PineconeSearchInterfaceProps> = ({
  initialQuery = '',
  indexName,
  maxResults = 10,
  filters = {},
  onResultsLoaded,
  namespace,
  className = 'pinecone-search-interface',
  includeMetadata = true,
  autoSearch = false
}) => {
  const [query, setQuery] = useState<string>(initialQuery);
  const { search, searchMemories, searchPrompts, loading, error, results } = usePineconeSearch();
  
  const performSearch = useCallback(async () => {
    if (!query.trim()) return;
    
    try {
      await search(query, {
        index: indexName,
        filter: filters,
        topK: maxResults,
        includeMetadata,
        namespace
      });
      
      if (onResultsLoaded && results) {
        onResultsLoaded(results);
      }
    } catch (err) {
      console.error('Search error:', err);
    }
  }, [query, search, indexName, filters, maxResults, includeMetadata, namespace, onResultsLoaded, results]);
  
  // Perform initial search if autoSearch is enabled
  useEffect(() => {
    if (autoSearch && initialQuery) {
      performSearch();
    }
  }, [autoSearch, initialQuery, performSearch]);
  
  // Memory-specific search
  const searchUserMemories = useCallback(async (userId: string) => {
    if (!query.trim()) return;
    return await searchMemories(query, userId, maxResults);
  }, [query, searchMemories, maxResults]);
  
  // Prompt-specific search
  const searchAgentPrompts = useCallback(async (agentId: string) => {
    if (!query.trim()) return;
    return await searchPrompts(query, agentId, maxResults);
  }, [query, searchPrompts, maxResults]);
  
  // Advanced search with combined results
  const performAdvancedSearch = useCallback(async (options: {
    memoryFilter?: Record<string, any>;
    promptFilter?: Record<string, any>;
    combineResults?: boolean;
    weightMemories?: number;
    weightPrompts?: number;
  }) => {
    if (!query.trim()) return;
    
    const { memoryFilter, promptFilter, combineResults = false, weightMemories = 0.5, weightPrompts = 0.5 } = options;
    
    try {
      // Execute both searches in parallel
      const [memoryResults, promptResults] = await Promise.all([
        searchMemories(query, memoryFilter?.userId, maxResults),
        searchPrompts(query, promptFilter?.agentId, maxResults)
      ]);
      
      if (combineResults) {
        // Combine and rerank results based on weights
        const combined = [
          ...memoryResults.map(r => ({ ...r, score: r.score * weightMemories, source: 'memory' })),
          ...promptResults.map(r => ({ ...r, score: r.score * weightPrompts, source: 'prompt' }))
        ].sort((a, b) => b.score - a.score).slice(0, maxResults);
        
        return {
          memories: memoryResults,
          prompts: promptResults,
          combined
        };
      }
      
      return {
        memories: memoryResults,
        prompts: promptResults
      };
    } catch (err) {
      console.error('Advanced search error:', err);
      return { memories: [], prompts: [] };
    }
  }, [query, searchMemories, searchPrompts, maxResults]);
  
  return {
    query,
    setQuery,
    loading,
    error,
    results,
    performSearch,
    searchUserMemories,
    searchAgentPrompts,
    performAdvancedSearch
  };
};

export default PineconeSearchInterface;