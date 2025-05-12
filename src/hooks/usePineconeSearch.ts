/**
 * React hook for Pinecone semantic search integration
 * 
 * This hook provides client-side access to Pinecone semantic search capabilities
 * for memories, prompts, and other content within the Aixtiv CLI Owner-Subscriber system.
 * 
 * @module usePineconeSearch
 * @author Aixtiv Symphony Team
 * @copyright 2025 AI Publishing International LLP
 * @version 1.0.0
 */

import { useState, useCallback, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from './useAuth'; // Assuming you have an auth hook

// Types for the hook
export interface PineconeSearchFilter {
  userId?: string;
  copilotId?: string;
  agentId?: string;
  sessionId?: string;
  type?: string;
  category?: string;
  minImportance?: number;
  [key: string]: any;
}

export interface PineconeSearchOptions {
  topK?: number;
  filter?: PineconeSearchFilter;
}

export interface PineconeSearchResult {
  id: string;
  score: number;
  metadata: {
    userId: string;
    type: string;
    category: string;
    timestamp: string;
    importance?: number;
    [key: string]: any;
  };
}

export interface PineconeSearchResponse {
  results: PineconeSearchResult[];
}

export interface StoreMemoryParams {
  content: string;
  sessionId: string;
  copilotId: string;
  type: string;
  importance?: number;
  category?: string;
  metadata?: Record<string, any>;
}

export interface StorePromptParams {
  content: string;
  agentId: string;
  type?: string;
  category?: string;
  metadata?: Record<string, any>;
}

/**
 * Hook for Pinecone semantic search functionality
 */
export function usePineconeSearch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [searchResults, setSearchResults] = useState<PineconeSearchResult[]>([]);
  const { user } = useAuth();
  
  // Get Firebase Functions
  const functions = getFunctions();
  
  // Reset state when auth changes
  useEffect(() => {
    setSearchResults([]);
    setError(null);
    setLoading(false);
  }, [user]);
  
  /**
   * Search for similar memories
   */
  const searchMemories = useCallback(async (
    queryText: string,
    options: PineconeSearchOptions = {}
  ) => {
    if (!user) {
      setError(new Error('Authentication required'));
      return [];
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const searchMemoriesFunction = httpsCallable<
        { queryText: string; filter?: PineconeSearchFilter; topK?: number },
        PineconeSearchResponse
      >(functions, 'searchMemories');
      
      const result = await searchMemoriesFunction({
        queryText,
        filter: options.filter || {},
        topK: options.topK || 10
      });
      
      const memories = result.data.results || [];
      setSearchResults(memories);
      return memories;
    } catch (err: any) {
      console.error('Error searching memories:', err);
      setError(err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [functions, user]);
  
  /**
   * Search for similar prompts
   */
  const searchPrompts = useCallback(async (
    queryText: string,
    options: PineconeSearchOptions = {}
  ) => {
    if (!user) {
      setError(new Error('Authentication required'));
      return [];
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const searchPromptsFunction = httpsCallable<
        { queryText: string; filter?: PineconeSearchFilter; topK?: number },
        PineconeSearchResponse
      >(functions, 'searchPrompts');
      
      const result = await searchPromptsFunction({
        queryText,
        filter: options.filter || {},
        topK: options.topK || 10
      });
      
      const prompts = result.data.results || [];
      setSearchResults(prompts);
      return prompts;
    } catch (err: any) {
      console.error('Error searching prompts:', err);
      setError(err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [functions, user]);
  
  /**
   * Store a memory in Pinecone
   */
  const storeMemory = useCallback(async (
    params: StoreMemoryParams
  ) => {
    if (!user) {
      setError(new Error('Authentication required'));
      return null;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const storeMemoryFunction = httpsCallable<
        { memory: StoreMemoryParams & { userId?: string } },
        { success: boolean; memoryId: string }
      >(functions, 'storeMemory');
      
      const result = await storeMemoryFunction({
        memory: {
          ...params,
          userId: user.uid
        }
      });
      
      return result.data;
    } catch (err: any) {
      console.error('Error storing memory:', err);
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [functions, user]);
  
  /**
   * Store a prompt in Pinecone
   */
  const storePrompt = useCallback(async (
    params: StorePromptParams
  ) => {
    if (!user) {
      setError(new Error('Authentication required'));
      return null;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const storePromptFunction = httpsCallable<
        { prompt: StorePromptParams & { userId?: string } },
        { success: boolean; promptId: string }
      >(functions, 'storePrompt');
      
      const result = await storePromptFunction({
        prompt: {
          ...params,
          userId: user.uid
        }
      });
      
      return result.data;
    } catch (err: any) {
      console.error('Error storing prompt:', err);
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [functions, user]);
  
  /**
   * Find similar content across memories and prompts
   */
  const findSimilarContent = useCallback(async (
    queryText: string,
    options: PineconeSearchOptions = {}
  ) => {
    if (!user) {
      setError(new Error('Authentication required'));
      return { memories: [], prompts: [] };
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Search both memories and prompts in parallel
      const [memories, prompts] = await Promise.all([
        searchMemories(queryText, options),
        searchPrompts(queryText, options)
      ]);
      
      // Combine and sort results by score
      const combined = [...memories, ...prompts].sort((a, b) => b.score - a.score);
      
      setSearchResults(combined);
      
      return {
        memories,
        prompts,
        combined
      };
    } catch (err: any) {
      console.error('Error finding similar content:', err);
      setError(err);
      return { memories: [], prompts: [] };
    } finally {
      setLoading(false);
    }
  }, [searchMemories, searchPrompts, user]);
  
  return {
    searchMemories,
    searchPrompts,
    findSimilarContent,
    storeMemory,
    storePrompt,
    searchResults,
    loading,
    error
  };
}