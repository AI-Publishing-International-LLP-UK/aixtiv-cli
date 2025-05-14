import React from 'react';
import ASOOSNavigationDemo from './components/ASOOSNavigationDemo';
import { AuthProvider } from './context/AuthContext';
import { AgentProvider } from './context/AgentContext';
import { ResourceProvider } from './context/ResourceContext';
import { TelemetryProvider } from './context/TelemetryContext';

function App() {
  return (
    <TelemetryProvider>
      <AuthProvider>
        <AgentProvider>
          <ResourceProvider>
            <ASOOSNavigationDemo />
          </ResourceProvider>
        </AgentProvider>
      </AuthProvider>
    </TelemetryProvider>
  );
}

export default App;