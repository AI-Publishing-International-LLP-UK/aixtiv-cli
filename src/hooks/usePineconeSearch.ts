/**
 * Custom hook for Pinecone vector search functionality
 * 
 * @module hooks/usePineconeSearch
 * @author Aixtiv Symphony Team
 * @copyright 2025 AI Publishing International LLP
 * @version 1.0.0
 */

import { useState, useCallback } from 'react';
import axios from 'axios';

interface PineconeSearchOptions {
  index?: string;
  filter?: Record<string, any>;
  topK?: number;
  includeMetadata?: boolean;
  namespace?: string;
}

interface PineconeMatch {
  id: string;
  score: number;
  metadata?: Record<string, any>;
}

interface PineconeSearchResult {
  matches: PineconeMatch[];
  namespace?: string;
}

/**
 * Hook for performing semantic searches using Pinecone
 */
export function usePineconeSearch() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [results, setResults] = useState<PineconeMatch[]>([]);
  
  /**
   * Execute semantic search
   */
  const search = useCallback(async (
    query: string,
    options: PineconeSearchOptions = {}
  ): Promise<PineconeMatch[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const {
        index = 'aixtiv-default',
        filter = {},
        topK = 10,
        includeMetadata = true,
        namespace
      } = options;
      
      // Call our API endpoint that interfaces with Pinecone
      const response = await axios.post('/api/search/pinecone', {
        query,
        index,
        filter,
        topK,
        includeMetadata,
        namespace
      });
      
      const searchResults = response.data as PineconeSearchResult;
      setResults(searchResults.matches || []);
      return searchResults.matches || [];
    } catch (err: any) {
      const errorObj = new Error(err.message || 'Error performing Pinecone search');
      setError(errorObj);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * Search for similar memories
   */
  const searchMemories = useCallback(async (
    query: string,
    userId?: string,
    topK: number = 10
  ): Promise<PineconeMatch[]> => {
    const filter = userId ? { userId } : {};
    return search(query, {
      index: 'aixtiv-memories',
      filter,
      topK
    });
  }, [search]);
  
  /**
   * Search for similar prompts
   */
  const searchPrompts = useCallback(async (
    query: string,
    agentId?: string,
    topK: number = 10
  ): Promise<PineconeMatch[]> => {
    const filter = agentId ? { agentId } : {};
    return search(query, {
      index: 'aixtiv-prompts',
      filter,
      topK
    });
  }, [search]);
  
  return {
    search,
    searchMemories,
    searchPrompts,
    loading,
    error,
    results
  };
}

export default usePineconeSearch;