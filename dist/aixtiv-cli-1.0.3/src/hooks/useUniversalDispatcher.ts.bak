/**
 * Universal Dispatcher Hook for Aixtiv CLI
 *
 * This React hook provides a client-side interface to the Universal Dispatcher
 * system, enabling components to easily send prompts, subscribe to responses,
 * and track dispatch status.
 *
 * @module useUniversalDispatcher
 * @author AI Publishing International LLP
 * @copyright 2025 AI Publishing International LLP
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import firebase from 'firebase/app';
import 'firebase/firestore';
import 'firebase/functions';

// Type definitions
export interface PromptData {
  type: string;
  content: string;
  agentId?: string;
  targetId?: string;
  metadata?: Record<string, any>;
}

export interface DispatchOptions {
  timeout?: number;
  priority?: 'low' | 'normal' | 'high';
  dispatchId?: string;
  retainHistory?: boolean;
  sessionId?: string;
  userId?: string;
}

export interface DispatchResult {
  success: boolean;
  dispatchId: string;
  result?: any;
  error?: string;
}

export interface DispatchStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'timeout';
  timestamp: string;
  prompt: PromptData;
  options: DispatchOptions;
  result: any | null;
  error: string | null;
}

export interface UniversalDispatcherHook {
  dispatch: (promptData: PromptData, options?: DispatchOptions) => Promise<DispatchResult>;
  getStatus: (dispatchId: string) => Promise<DispatchStatus | null>;
  cancelDispatch: (dispatchId: string) => Promise<boolean>;
  activeDispatches: Record<string, DispatchStatus>;
  isLoading: boolean;
  error: string | null;
  subscriberId: string;
}

/**
 * React hook for interacting with the Universal Dispatcher
 *
 * @param initialOptions - Default options for all dispatches
 * @returns Hook interface for the dispatcher
 */
export function useUniversalDispatcher(
  initialOptions: DispatchOptions = {}
): UniversalDispatcherHook {
  // State for tracking active dispatches
  const [activeDispatches, setActiveDispatches] = useState<Record<string, DispatchStatus>>({});

  // General loading and error states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Unique subscriber ID for this hook instance
  const subscriberIdRef = useRef<string>(uuidv4());

  // Function references
  const functions = firebase.functions();
  const firestore = firebase.firestore();

  // Collection references
  const promptRunsCollection = firestore.collection('prompt_runs');

  // Subscribe to dispatch updates via Firestore
  useEffect(() => {
    // Create a subscription to active dispatches
    const unsubscribe = promptRunsCollection
      .where('subscriberId', '==', subscriberIdRef.current)
      .where('status', 'in', ['pending', 'processing'])
      .onSnapshot(
        (snapshot) => {
          const dispatches: Record<string, DispatchStatus> = {};

          snapshot.forEach((doc) => {
            const data = doc.data() as DispatchStatus;
            dispatches[doc.id] = data;
          });

          setActiveDispatches(dispatches);
        },
        (err) => {
          console.error('Error subscribing to dispatches:', err);
          setError(`Subscription error: ${err.message}`);
        }
      );

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  /**
   * Dispatch a prompt to the Universal Dispatcher
   *
   * @param promptData - The prompt data to dispatch
   * @param options - Additional options for the dispatch
   * @returns A promise with the dispatch result
   */
  const dispatch = useCallback(
    async (promptData: PromptData, options: DispatchOptions = {}): Promise<DispatchResult> => {
      setIsLoading(true);
      setError(null);

      try {
        // Merge with initial options
        const mergedOptions = {
          ...initialOptions,
          ...options,
          subscriberId: subscriberIdRef.current,
        };

        // Generate a dispatch ID if not provided
        const dispatchId = mergedOptions.dispatchId || uuidv4();

        // Call the dispatch function
        const dispatchFunction = functions.httpsCallable('handleDispatch');
        const response = await dispatchFunction({
          promptData,
          options: mergedOptions,
        });

        const result = response.data as DispatchResult;

        // Update local state with the new dispatch
        setActiveDispatches((prev) => ({
          ...prev,
          [dispatchId]: {
            id: dispatchId,
            status: 'pending',
            timestamp: new Date().toISOString(),
            prompt: promptData,
            options: mergedOptions,
            result: null,
            error: null,
          },
        }));

        setIsLoading(false);
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown dispatch error';
        setError(errorMessage);
        setIsLoading(false);

        return {
          success: false,
          dispatchId: options.dispatchId || 'error',
          error: errorMessage,
        };
      }
    },
    [initialOptions, functions]
  );

  /**
   * Get the status of a specific dispatch
   *
   * @param dispatchId - The ID of the dispatch to check
   * @returns The dispatch status or null if not found
   */
  const getStatus = useCallback(
    async (dispatchId: string): Promise<DispatchStatus | null> => {
      setIsLoading(true);
      setError(null);

      try {
        // Check local state first
        if (activeDispatches[dispatchId]) {
          setIsLoading(false);
          return activeDispatches[dispatchId];
        }

        // Check Firestore
        const docRef = promptRunsCollection.doc(dispatchId);
        const doc = await docRef.get();

        if (doc.exists) {
          const data = doc.data() as DispatchStatus;
          setIsLoading(false);
          return data;
        }

        // If not found in Firestore, try calling the function
        const statusFunction = functions.httpsCallable('getDispatchStatus');
        const response = await statusFunction({ dispatchId });

        setIsLoading(false);
        return response.data as DispatchStatus;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error fetching status';
        setError(errorMessage);
        setIsLoading(false);
        return null;
      }
    },
    [activeDispatches, promptRunsCollection, functions]
  );

  /**
   * Cancel an active dispatch
   *
   * @param dispatchId - The ID of the dispatch to cancel
   * @returns Boolean indicating success
   */
  const cancelDispatch = useCallback(
    async (dispatchId: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        // Call the cancel function
        const cancelFunction = functions.httpsCallable('cancelDispatch');
        const response = await cancelFunction({ dispatchId });

        const success = response.data.success as boolean;

        if (success) {
          // Update local state
          setActiveDispatches((prev) => {
            const updated = { ...prev };
            if (updated[dispatchId]) {
              updated[dispatchId].status = 'failed';
              updated[dispatchId].error = 'Cancelled by user';
            }
            return updated;
          });
        }

        setIsLoading(false);
        return success;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error cancelling dispatch';
        setError(errorMessage);
        setIsLoading(false);
        return false;
      }
    },
    [functions]
  );

  // Return the hook interface
  return {
    dispatch,
    getStatus,
    cancelDispatch,
    activeDispatches,
    isLoading,
    error,
    subscriberId: subscriberIdRef.current,
  };
}

export default useUniversalDispatcher;
