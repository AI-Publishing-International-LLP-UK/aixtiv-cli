/**
 * Copilot Memory Hook for Aixtiv CLI
 *
 * This React hook provides a client-side interface for managing memory state
 * in copilot interactions. It handles persistence, retrieval, and contextual
 * memory management for bonded copilot relationships.
 *
 * @module useCopilotMemory
 * @author AI Publishing International LLP
 * @copyright 2025 AI Publishing International LLP
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import firebase from 'firebase/app';
import 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

// Type definitions
export interface MemoryEntry {
  id: string;
  sessionId: string;
  userId: string;
  copilotId: string;
  timestamp: string;
  type: 'user_input' | 'copilot_response' | 'system_event' | 'memory_recall';
  content: string;
  metadata?: Record<string, any>;
  importance?: number; // 1-10 scale for memory importance
  category?: string;
  expiresAt?: string; // ISO date when memory should expire
}

export interface MemoryQuery {
  sessionId?: string;
  userId?: string;
  copilotId?: string;
  type?: 'user_input' | 'copilot_response' | 'system_event' | 'memory_recall';
  category?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  importance?: number; // Minimum importance level
}

export interface CopilotMemoryHook {
  memories: MemoryEntry[];
  isLoading: boolean;
  error: string | null;
  addMemory: (memory: Omit<MemoryEntry, 'id' | 'timestamp'>) => Promise<string>;
  updateMemory: (id: string, updates: Partial<MemoryEntry>) => Promise<boolean>;
  deleteMemory: (id: string) => Promise<boolean>;
  queryMemories: (query: MemoryQuery) => Promise<MemoryEntry[]>;
  clearSessionMemories: (sessionId: string) => Promise<boolean>;
  getRecentMemories: (limit?: number) => Promise<MemoryEntry[]>;
  getImportantMemories: (minImportance?: number, limit?: number) => Promise<MemoryEntry[]>;
}

/**
 * React hook for managing copilot memory
 *
 * @param userId - The user ID to associate memories with
 * @param copilotId - The copilot ID to associate memories with
 * @param sessionId - Optional session ID (defaults to generating a new one)
 * @returns Hook interface for memory management
 */
export function useCopilotMemory(
  userId: string,
  copilotId: string,
  sessionId: string = uuidv4()
): CopilotMemoryHook {
  // State for memories and status
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Firestore reference
  const firestore = firebase.firestore();
  const memoriesCollection = firestore.collection('chat_history');

  // Subscribe to memories for this session
  useEffect(() => {
    setIsLoading(true);

    const unsubscribe = memoriesCollection
      .where('sessionId', '==', sessionId)
      .where('userId', '==', userId)
      .where('copilotId', '==', copilotId)
      .orderBy('timestamp', 'desc')
      .onSnapshot(
        (snapshot) => {
          const loadedMemories: MemoryEntry[] = [];

          snapshot.forEach((doc) => {
            loadedMemories.push({
              id: doc.id,
              ...(doc.data() as Omit<MemoryEntry, 'id'>),
            });
          });

          setMemories(loadedMemories);
          setIsLoading(false);
        },
        (err) => {
          console.error('Error subscribing to memories:', err);
          setError(`Subscription error: ${err.message}`);
          setIsLoading(false);
        }
      );

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [sessionId, userId, copilotId, memoriesCollection]);

  /**
   * Add a new memory entry
   *
   * @param memory - The memory data to add
   * @returns Promise with the new memory ID
   */
  const addMemory = useCallback(
    async (memory: Omit<MemoryEntry, 'id' | 'timestamp'>): Promise<string> => {
      setIsLoading(true);
      setError(null);

      try {
        // Ensure required fields
        const completeMemory = {
          ...memory,
          userId: memory.userId || userId,
          copilotId: memory.copilotId || copilotId,
          sessionId: memory.sessionId || sessionId,
          timestamp: new Date().toISOString(),
          importance: memory.importance || 5, // Default importance
        };

        // Add to Firestore
        const docRef = await memoriesCollection.add(completeMemory);
        setIsLoading(false);
        return docRef.id;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error adding memory';
        setError(errorMessage);
        setIsLoading(false);
        throw new Error(errorMessage);
      }
    },
    [userId, copilotId, sessionId, memoriesCollection]
  );

  /**
   * Update an existing memory entry
   *
   * @param id - The ID of the memory to update
   * @param updates - The fields to update
   * @returns Promise with success status
   */
  const updateMemory = useCallback(
    async (id: string, updates: Partial<MemoryEntry>): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        // Prevent updating protected fields
        const { id: _, timestamp: __, ...safeUpdates } = updates;

        // Add update timestamp
        const updateData = {
          ...safeUpdates,
          updatedAt: new Date().toISOString(),
        };

        // Update in Firestore
        await memoriesCollection.doc(id).update(updateData);

        setIsLoading(false);
        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error updating memory';
        setError(errorMessage);
        setIsLoading(false);
        return false;
      }
    },
    [memoriesCollection]
  );

  /**
   * Delete a memory entry
   *
   * @param id - The ID of the memory to delete
   * @returns Promise with success status
   */
  const deleteMemory = useCallback(
    async (id: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        // Delete from Firestore
        await memoriesCollection.doc(id).delete();

        setIsLoading(false);
        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error deleting memory';
        setError(errorMessage);
        setIsLoading(false);
        return false;
      }
    },
    [memoriesCollection]
  );

  /**
   * Query memories based on filter criteria
   *
   * @param query - The query parameters
   * @returns Promise with matching memories
   */
  const queryMemories = useCallback(
    async (query: MemoryQuery): Promise<MemoryEntry[]> => {
      setIsLoading(true);
      setError(null);

      try {
        // Start with base query
        let firestoreQuery: firebase.firestore.Query = memoriesCollection;

        // Apply filters based on query parameters
        if (query.sessionId) {
          firestoreQuery = firestoreQuery.where('sessionId', '==', query.sessionId);
        }

        if (query.userId) {
          firestoreQuery = firestoreQuery.where('userId', '==', query.userId);
        } else {
          firestoreQuery = firestoreQuery.where('userId', '==', userId);
        }

        if (query.copilotId) {
          firestoreQuery = firestoreQuery.where('copilotId', '==', query.copilotId);
        } else {
          firestoreQuery = firestoreQuery.where('copilotId', '==', copilotId);
        }

        if (query.type) {
          firestoreQuery = firestoreQuery.where('type', '==', query.type);
        }

        if (query.category) {
          firestoreQuery = firestoreQuery.where('category', '==', query.category);
        }

        if (query.importance) {
          firestoreQuery = firestoreQuery.where('importance', '>=', query.importance);
        }

        // Time-based filters require compound queries
        if (query.fromDate) {
          firestoreQuery = firestoreQuery.where('timestamp', '>=', query.fromDate);
        }

        if (query.toDate) {
          firestoreQuery = firestoreQuery.where('timestamp', '<=', query.toDate);
        }

        // Order by timestamp and apply limit
        firestoreQuery = firestoreQuery.orderBy('timestamp', 'desc');

        if (query.limit) {
          firestoreQuery = firestoreQuery.limit(query.limit);
        }

        // Execute query
        const snapshot = await firestoreQuery.get();

        const results: MemoryEntry[] = [];
        snapshot.forEach((doc) => {
          results.push({
            id: doc.id,
            ...(doc.data() as Omit<MemoryEntry, 'id'>),
          });
        });

        setIsLoading(false);
        return results;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error querying memories';
        setError(errorMessage);
        setIsLoading(false);
        return [];
      }
    },
    [userId, copilotId, memoriesCollection]
  );

  /**
   * Clear all memories for a specific session
   *
   * @param sessionId - The session ID to clear memories for
   * @returns Promise with success status
   */
  const clearSessionMemories = useCallback(
    async (sessionId: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        // Get all memories for this session
        const snapshot = await memoriesCollection
          .where('sessionId', '==', sessionId)
          .where('userId', '==', userId)
          .where('copilotId', '==', copilotId)
          .get();

        // Delete in batches
        const batch = firestore.batch();
        snapshot.forEach((doc) => {
          batch.delete(doc.ref);
        });

        await batch.commit();

        setIsLoading(false);
        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error clearing session memories';
        setError(errorMessage);
        setIsLoading(false);
        return false;
      }
    },
    [userId, copilotId, memoriesCollection, firestore]
  );

  /**
   * Get recent memories across all sessions
   *
   * @param limit - Maximum number of memories to retrieve
   * @returns Promise with recent memories
   */
  const getRecentMemories = useCallback(
    async (limit: number = 10): Promise<MemoryEntry[]> => {
      return queryMemories({
        userId,
        copilotId,
        limit,
      });
    },
    [userId, copilotId, queryMemories]
  );

  /**
   * Get important memories by importance score
   *
   * @param minImportance - Minimum importance score (1-10)
   * @param limit - Maximum number of memories to retrieve
   * @returns Promise with important memories
   */
  const getImportantMemories = useCallback(
    async (minImportance: number = 8, limit: number = 10): Promise<MemoryEntry[]> => {
      return queryMemories({
        userId,
        copilotId,
        importance: minImportance,
        limit,
      });
    },
    [userId, copilotId, queryMemories]
  );

  // Return the hook interface
  return {
    memories,
    isLoading,
    error,
    addMemory,
    updateMemory,
    deleteMemory,
    queryMemories,
    clearSessionMemories,
    getRecentMemories,
    getImportantMemories,
  };
}

export default useCopilotMemory;
