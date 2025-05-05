import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const MainPortal = () => {
  // State management for different portal sections
  const [activeSection, setActiveSection] = useState('demo');
  const [integrationStatus, setIntegrationStatus] = useState({});

  // FMS and Anthology integration hooks
  const [fmsData, setFmsData] = useState(null);
  const [anthologySync, setAnthologySync] = useState(false);

  useEffect(() => {
    // Initialize FMS connection
    initializeFMS();
    // Set up Anthology synchronization
    setupAnthologyIntegration();
  }, []);

  const mainSections = [
    {
      id: 'demo',
      title: 'Interactive System Demo',
      description: 'Experience the power of our quantum-secured AI platform',
      features: ['Live AI Interaction', 'Voice Integration Demo', 'Real-time Analytics'],
    },
    {
      id: 'customize',
      title: 'Customize Your Solution',
      description: 'Build your perfect enterprise solution',
      features: ['Industry-Specific Templates', 'Custom Workflow Builder', 'Integration Designer'],
    },
    {
      id: 'training',
      title: 'Advanced Training Portal',
      description: 'Unlock the full potential of your system',
      features: ['Interactive Tutorials', 'Certification Paths', 'Expert Sessions'],
    },
    {
      id: 'integrations',
      title: 'Enterprise Integration Hub',
      description: 'Seamlessly connect your existing systems',
      features: ['FMS Integration Suite', 'Anthology Connector', 'Custom API Builder'],
    },
  ];

  const handleSectionSelect = (sectionId) => {
    setActiveSection(sectionId);
    if (sectionId === 'integrations') {
      // Initialize FMS and Anthology connections
      initializeEnterpriseConnections();
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      <header className="py-8 text-center">
        <h1 className="text-4xl font-bold text-white mb-4">2100.cool Enterprise Portal</h1>
        <p className="text-xl text-cyan-400">Quantum-Secured Intelligence Platform</p>
      </header>

      <main className="flex-grow container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {mainSections.map((section) => (
            <div
              key={section.id}
              className={`p-6 rounded-lg transition-all duration-300 ${
                activeSection === section.id
                  ? 'bg-cyan-600 transform scale-105'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
              onClick={() => handleSectionSelect(section.id)}
            >
              <h2 className="text-2xl font-bold text-white mb-4">{section.title}</h2>
              <p className="text-gray-200 mb-4">{section.description}</p>
              <ul className="space-y-2">
                {section.features.map((feature) => (
                  <li key={feature} className="text-cyan-200">
                    • {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* FMS and Anthology Integration Status */}
        <div className="mt-8 p-6 bg-gray-700 rounded-lg">
          <h3 className="text-xl font-bold text-white mb-4">Enterprise System Status</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-800 rounded">
              <h4 className="text-cyan-400">FMS Status</h4>
              <p className="text-white">{fmsData ? 'Connected' : 'Initializing...'}</p>
            </div>
            <div className="p-4 bg-gray-800 rounded">
              <h4 className="text-cyan-400">Anthology Sync</h4>
              <p className="text-white">{anthologySync ? 'Synchronized' : 'Pending'}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MainPortal;
