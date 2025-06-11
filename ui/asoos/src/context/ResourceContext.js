import React, { createContext, useState } from 'react';

export const ResourceContext = createContext();

export const ResourceProvider = ({ children }) => {
  const [resources, setResources] = useState([]);
  const [todos, setTodos] = useState([]);

  return (
    <ResourceContext.Provider value={{ resources, todos }}>
      {children}
    </ResourceContext.Provider>
  );
};
