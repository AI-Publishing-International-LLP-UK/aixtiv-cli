import React, { createContext, useCallback } from 'react';
import { telemetryService } from '../services/api';

export const TelemetryContext = createContext();

export const TelemetryProvider = ({ children }) => {
  // Function to record user interactions
  const recordInteraction = useCallback(async (interactionType, details = {}) => {
    try {
      // Add telemetry timestamp
      const enrichedDetails = {
        ...details,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        pathname: window.location.pathname
      };
      
      // Record interaction using telemetry service
      await telemetryService.recordInteraction(interactionType, enrichedDetails);
      
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[Telemetry] ${interactionType}`, enrichedDetails);
      }
    } catch (error) {
      // Silently fail - telemetry should never break the application
      if (process.env.NODE_ENV === 'development') {
        console.warn('Telemetry recording failed:', error);
      }
    }
  }, []);

  // Value to be provided to consumers
  const value = {
    recordInteraction
  };

  return (
    <TelemetryContext.Provider value={value}>
      {children}
    </TelemetryContext.Provider>
  );
};