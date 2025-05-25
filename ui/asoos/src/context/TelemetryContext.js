import React, { createContext } from 'react';

export const TelemetryContext = createContext();

export const TelemetryProvider = ({ children }) => {
  const recordInteraction = (type, data) => {
    console.log('Interaction recorded:', type, data);
  };

  return (
    <TelemetryContext.Provider value={{ recordInteraction }}>
      {children}
    </TelemetryContext.Provider>
  );
};
