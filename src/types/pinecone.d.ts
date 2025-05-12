/**
 * TypeScript definitions for Pinecone integration
 * 
 * @module types/pinecone
 * @author Aixtiv Symphony Team
 * @copyright 2025 AI Publishing International LLP
 * @version 1.0.0
 */

declare namespace Pinecone {
  /**
   * Filter for Pinecone queries
   */
  interface Filter {
    [key: string]: any;
  }
  
  /**
   * Metadata for Pinecone vectors
   */
  interface Metadata {
    userId?: string;
    sessionId?: string;
    copilotId?: string;
    agentId?: string;
    type?: string;
    category?: string;
    importance?: number;
    timestamp?: string;
    [key: string]: any;
  }
  
  /**
   * Vector for Pinecone storage
   */
  interface Vector {
    id: string;
    values: number[];
    metadata?: Metadata;
  }
  
  /**
   * Match result from Pinecone query
   */
  interface Match {
    id: string;
    score: number;
    values?: number[];
    metadata?: Metadata;
  }
  
  /**
   * Response from Pinecone query
   */
  interface QueryResponse {
    matches: Match[];
    namespace?: string;
  }
  
  /**
   * Index operations for Pinecone
   */
  interface IndexOperations {
    upsert(vectors: Vector[]): Promise<{ upsertedCount: number }>;
    query(
      vector: number[],
      topK?: number,
      includeMetadata?: boolean,
      includeValues?: boolean,
      filter?: Filter
    ): Promise<QueryResponse>;
    fetch(ids: string[]): Promise<{ vectors: Record<string, Vector> }>;
    delete(ids?: string[], filter?: Filter): Promise<{ deletedCount: number }>;
  }
  
  /**
   * Memory item for Pinecone storage
   */
  interface MemoryItem {
    id?: string;
    content: string;
    userId?: string;
    sessionId: string;
    copilotId: string;
    type: string;
    category?: string;
    importance?: number;
    timestamp?: Date | string;
    metadata?: Record<string, any>;
  }
  
  /**
   * Prompt item for Pinecone storage
   */
  interface PromptItem {
    id?: string;
    promptId?: string;
    content: string;
    userId?: string;
    agentId: string;
    type?: string;
    category?: string;
    timestamp?: Date | string;
    metadata?: Record<string, any>;
  }
  
  /**
   * Search options for Pinecone queries
   */
  interface SearchOptions {
    topK?: number;
    filter?: Filter;
  }
  
  /**
   * Combined search results
   */
  interface CombinedSearchResults {
    memories: Match[];
    prompts: Match[];
    combined?: Match[];
  }
  
  /**
   * Pinecone service interface
   */
  interface PineconeService {
    initPinecone(): any;
    generateEmbeddings(texts: string | string[]): Promise<number[][]>;
    createIndexIfNotExists(indexName: string): Promise<boolean>;
    storeInPinecone(indexName: string, items: Array<{ id?: string; text: string; metadata?: Metadata }>): Promise<boolean>;
    searchPinecone(indexName: string, queryText: string, filter?: Filter, topK?: number): Promise<Match[]>;
    deleteFromPinecone(indexName: string, ids: string[]): Promise<boolean>;
    storeMemoryInPinecone(memory: MemoryItem): Promise<boolean>;
    storePromptInPinecone(prompt: PromptItem): Promise<boolean>;
    searchSimilarMemories(queryText: string, filter?: Filter, topK?: number): Promise<Match[]>;
    searchSimilarPrompts(queryText: string, filter?: Filter, topK?: number): Promise<Match[]>;
  }
}