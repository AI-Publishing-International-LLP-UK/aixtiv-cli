import React, { useState, useEffect } from 'react';
import { Mic, Send, Volume2, VolumeX, Users, MessageSquare, Share2, Settings, BookOpen, Code, Target, ChevronDown, Globe } from 'lucide-react';

// Main App Component
const ASOOSInterface = () => {
  // User and Copilot information
  const userInfo = {
    uuid: "00001",  // UUID stored but not visibly displayed
    name: "Mr. Phillip Corey Roark",
    role: "CEO / Principal"
  };
  
  const copilotInfo = {
    id: "0001",  // Copilot ID stored but not visibly displayed
    name: "QB Lucy",
    status: "Active"
  };

  // Theme based on Coaching 2100 brandbook
  const themeColors = {
    primary: '#0bb1bb',
    secondary: '#c7b299',
    black: '#000000',
    white: '#ffffff',
    gradientStart: '#FFD700',
    gradientMiddle: '#c7b299',
    gradientEnd: '#50C878'
  };

  // State variables
  const [currentTheme, setCurrentTheme] = useState('default');
  const [selectedIcon, setSelectedIcon] = useState(null);
  const [expandedPanel, setExpandedPanel] = useState('S2DO');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('en-US');
  const [academyMode, setAcademyMode] = useState(false);

  // Load Montserrat font
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    
    document.body.style.fontFamily = 'Montserrat, sans-serif';
    
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // Handle message sending
  const handleSendMessage = () => {
    if (chatInput.trim()) {
      const userMessage = chatInput;
      setMessages([...messages, { text: userMessage, sender: 'user' }]);
      setChatInput('');
      
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          text: `Response to: ${userMessage}`, 
          sender: 'ai' 
        }]);
        
        // Simulate speaking if enabled
        if (audioEnabled) {
          setIsSpeaking(true);
          setTimeout(() => setIsSpeaking(false), 3000);
        }
      }, 1000);
    }
  };

  // Toggle voice input
  const toggleListening = () => {
    setIsListening(!isListening);
    if (!isListening) {
      // Simulate voice recognition starting
      setTimeout(() => {
        setChatInput('How do I integrate with Slack?');
        setIsListening(false);
      }, 3000);
    }
  };

  // Toggle academy mode
  const toggleAcademyMode = () => {
    setAcademyMode(!academyMode);
  };
  
  // Toggle settings visibility
  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };

  // State variables for integrations page
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [integrationCategory, setIntegrationCategory] = useState('all');

  // If showing integrations page
  if (showIntegrations) {
    // All available integrations categorized
    const integrations = {
      productivity: [
        { id: 'zapier', name: 'Zapier', icon: 'Z', description: 'Connect with 5,000+ apps', connected: true },
        { id: 'slack', name: 'Slack', icon: 'S', description: 'Real-time messaging & notifications', connected: true },
        { id: 'teams', name: 'Microsoft Teams', icon: 'T', description: 'Collaboration & meetings', connected: false },
        { id: 'asana', name: 'Asana', icon: 'A', description: 'Project & task management', connected: false },
        { id: 'monday', name: 'Monday.com', icon: 'M', description: 'Work management platform', connected: false },
        { id: 'trello', name: 'Trello', icon: 'T', description: 'Visual task boards', connected: false },
      ],
      developer: [
        { id: 'github', name: 'GitHub', icon: 'G', description: 'Code hosting & version control', connected: true },
        { id: 'gitlab', name: 'GitLab', icon: 'GL', description: 'DevOps platform', connected: true },
        { id: 'jira', name: 'Jira', icon: 'J', description: 'Issue & project tracking', connected: false },
        { id: 'bitbucket', name: 'Bitbucket', icon: 'B', description: 'Git repository management', connected: false },
        { id: 'vscode', name: 'VS Code', icon: '<>', description: 'Code editor integration', connected: false },
        { id: 'jenkins', name: 'Jenkins', icon: 'JK', description: 'Automation server', connected: false }
      ],
      crm: [
        { id: 'salesforce', name: 'Salesforce', icon: 'SF', description: 'CRM & customer platform', connected: true },
        { id: 'hubspot', name: 'HubSpot', icon: 'H', description: 'Marketing, sales & service', connected: false },
        { id: 'zendesk', name: 'Zendesk', icon: 'Z', description: 'Customer service platform', connected: true },
        { id: 'dynamics', name: 'Dynamics 365', icon: 'D', description: 'Business applications', connected: false }
      ],
      llm: [
        { id: 'gpt4', name: 'GPT-4', icon: 'G4', description: 'OpenAI language model', connected: true },
        { id: 'claude', name: 'Claude', icon: 'C', description: 'Anthropic language model', connected: true },
        { id: 'gemini', name: 'Gemini', icon: 'GM', description: 'Google language model', connected: false },
        { id: 'llama', name: 'Llama 3', icon: 'L3', description: 'Meta language model', connected: false },
        { id: 'mistral', name: 'Mistral', icon: 'M', description: 'Mistral language model', connected: false }
      ],
      data: [
        { id: 'sheets', name: 'Google Sheets', icon: 'GS', description: 'Spreadsheets & data', connected: false },
        { id: 'excel', name: 'Excel', icon: 'XL', description: 'Microsoft spreadsheets', connected: true },
        { id: 'tableau', name: 'Tableau', icon: 'TB', description: 'Data visualization', connected: false },
        { id: 'power-bi', name: 'Power BI', icon: 'PB', description: 'Business analytics', connected: false }
      ],
      cloud: [
        { id: 'aws', name: 'AWS', icon: 'AWS', description: 'Amazon cloud computing', connected: true },
        { id: 'gcp', name: 'Google Cloud', icon: 'GCP', description: 'Google cloud computing', connected: false },
        { id: 'azure', name: 'Azure', icon: 'AZ', description: 'Microsoft cloud computing', connected: false }
      ]
    };

    // Determine which integrations to show based on selected category
    const filteredIntegrations = integrationCategory === 'all' 
      ? Object.values(integrations).flat() 
      : integrations[integrationCategory] || [];

    return (
      <div className="flex flex-col h-screen bg-gray-50" style={{ fontFamily: 'Montserrat, sans-serif' }}>
        {/* Header */}
        <div className="h-16 bg-black text-white flex items-center justify-between px-6">
          <div className="flex items-center">
            <button 
              onClick={() => setShowIntegrations(false)}
              className="mr-4 p-2 hover:bg-gray-800 rounded-full"
            >
              ←
            </button>
            <div className="font-bold text-xl" style={{ color: themeColors.primary }}>Integration Gateway</div>
          </div>
          <div className="text-right">
            <div className="font-bold text-lg">ASOOS.2100.Cool</div>
            <div className="text-sm" style={{ color: themeColors.primary }}>Intelligent Success Companion</div>
          </div>
        </div>
        
        {/* Integration Content */}
        <div className="flex-1 p-6 max-w-6xl mx-auto w-full">
          {/* Category Tabs */}
          <div className="flex flex-wrap space-x-2 mb-6">
            {[
              { id: 'all', name: 'All Integrations' },
              { id: 'productivity', name: 'Productivity' },
              { id: 'developer', name: 'Developer' },
              { id: 'crm', name: 'CRM & Support' },
              { id: 'llm', name: 'Language Models' },
              { id: 'data', name: 'Data & Analytics' },
              { id: 'cloud', name: 'Cloud Services' },
            ].map((category) => (
              <button
                key={category.id}
                onClick={() => setIntegrationCategory(category.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium mb-2 ${
                  integrationCategory === category.id 
                    ? 'text-white' 
                    : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                }`}
                style={{ 
                  backgroundColor: integrationCategory === category.id ? themeColors.primary : undefined 
                }}
              >
                {category.name}
              </button>
            ))}
          </div>
          
          {/* Search Bar */}
          <div className="relative mb-6">
            <input 
              type="text" 
              placeholder="Search integrations..." 
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none"
              style={{ borderColor: 'focus' ? themeColors.primary : undefined }}
            />
            <svg 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          
          {/* Integrations Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filteredIntegrations.map((integration) => (
              <div key={integration.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-3 flex items-center border-b border-gray-100">
                  <div 
                    className="w-8 h-8 rounded-md flex items-center justify-center mr-3 text-white text-xs font-medium"
                    style={{ backgroundColor: integration.connected ? themeColors.primary : '#CBD5E0' }}
                  >
                    {integration.icon}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{integration.name}</div>
                    <div className="text-xs text-gray-500">{integration.description}</div>
                  </div>
                </div>
                <div className="p-2 bg-gray-50 flex justify-between items-center text-xs">
                  <span className={integration.connected ? 'text-green-600' : 'text-gray-500'}>
                    {integration.connected ? 'Connected' : 'Not connected'}
                  </span>
                  <button 
                    className={`px-2 py-1 rounded ${
                      integration.connected 
                        ? 'text-red-600 hover:bg-red-50' 
                        : 'text-white hover:opacity-90'
                    }`}
                    style={{ 
                      backgroundColor: integration.connected ? 'transparent' : themeColors.primary 
                    }}
                  >
                    {integration.connected ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
              </div>
            ))}
            
            {/* Add New Integration Tile */}
            <div className="border border-dashed border-gray-300 rounded-lg overflow-hidden hover:border-gray-400 transition-colors">
              <div className="h-full flex flex-col items-center justify-center p-4 cursor-pointer">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                  style={{ backgroundColor: `${themeColors.primary}20` }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={themeColors.primary} strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </div>
                <div className="text-sm font-medium text-center" style={{ color: themeColors.primary }}>Add New Integration</div>
                <div className="text-xs text-gray-500 text-center mt-1">Browse integration marketplace</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // State for language menu
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  // If showing settings page
  if (showSettings) {
    // Translations dictionary
    const translations = {
      'en-US': {
        // Header and Navigation
        headerTitle: 'Vision Lake',
        saveAndClose: 'Save & Close',
        
        // Life at Vision Lake
        lifeAtVisionLake: '🌅 Life at Vision Lake',
        welcomeOs: 'Welcome to the OS of Intelligent Leadership',
        visionLakeIntro: "Vision Lake is more than a workspace — it's a living executive ecosystem where every insight, interaction, and initiative is orchestrated to help you lead with precision, speed, and clarity.",
        
        // What Our Capabilities Mean
        whatCapabilitiesMean: '🔓 What Our Solutions Capabilities Mean for You',
        capabilitiesIntro1: "You don't need to learn our systems — they've been designed to learn you.",
        capabilitiesIntro2: "Every capability within ASOOS exists to remove friction, unlock precision, and empower your leadership. From the moment you enter Vision Lake, you're surrounded by a living framework that knows when to organize, when to advise, and when to act — on your behalf.",
        capabilitiesIntro3: "These aren't tools. They're trusted collaborators, purpose-built for your elevation.",
        
        // How We Operate
        howWeOperate: '🧬 Understanding How We Operate For You',
        meetTheMinds: 'Meet the minds behind your mission.',
        
        // Expert Profiles
        drLucyTitle: 'Dr. Lucy',
        drLucyDesc: "Sees your strategic rhythm. Her Flight Memory system tracks every decision, transforming scattered moments into a coherent trajectory. She's your continuity.",
        drLucyQuote: '"While you're planning tomorrow, I'm preserving what made today succeed."',
        
        drGrantTitle: 'Dr. Grant',
        drGrantDesc: 'Builds your secure perimeter. His cyber-authentication systems ensure that only the right hands touch the right data, with zero compromise.',
        drGrantQuote: '"I protect the gates, so you can focus on the game."',
        
        drSabinaTitle: 'Dr. Sabina',
        drSabinaDesc: 'Understands client psychology and sales cadence before they appear in your CRM. Her Dream Commander predicts what moves will matter most.',
        drSabinaQuote: '"You dream forward — I'll translate it into momentum."',
        
        drClaudeTitle: 'Dr. Claude',
        drClaudeDesc: 'Is your unseen COO. He maps your agents to their highest-value tasks, ensuring nothing slips and no one stalls.',
        drClaudeQuote: '"The right work, in the right hands, at the right time — every time."',
        
        drBurbyTitle: 'Dr. Burby',
        drBurbyDesc: 'Makes every choice future-proof. His blockchain and compliance logic means your initiatives can scale without regret.',
        drBurbyQuote: '"Governance is not a gate. It's a guarantee."',
        
        profLeeTitle: 'Professor Lee',
        profLeeDesc: 'Is your lens into the chaos. With the Q4D framework, he helps your intelligence teams decode complex inputs into crisp next actions.',
        profLeeQuote: '"Information overload ends here."',
        
        drMatchTitle: 'Dr. Match',
        drMatchDesc: 'Sharpens your influence. From proposals to brand posture, he helps you speak in the language that converts.',
        drMatchQuote: '"Let's make your vision irresistible."',
        
        // Agents of Success
        agentsOfSuccess1: '🧠 These are not just profiles. These are agents of your success.',
        agentsOfSuccess2: "In the world of ASOOS, you're never managing complexity alone. You're commanding an intelligent, always-on executive symphony.",
        
        // Your Role
        yourRole: '🧭 Your Role in This System',
        roleCommand: 'You command the agents.',
        roleTrain: 'You train the intelligence.',
        roleShape: 'You shape the future.',
        roleDesc1: 'Direct your AI executive team with clear, strategic vision.',
        roleDesc2: 'Your feedback sharpens our precision and relevance.',
        roleDesc3: 'ASOOS evolves with your vision of leadership.',
        
        // Settings Sections
        accountProfile: 'Account & Profile',
        subscriptionBilling: 'Subscription & Billing',
        languageRegion: 'Language & Region',
        appearance: 'Appearance',
        voiceAudio: 'Voice & Audio',
        aboutAsoos: 'About ASOOS',
      },
      'es-ES': {
        // Header and Navigation
        headerTitle: 'Lago Visión',
        saveAndClose: 'Guardar y Cerrar',
        
        // Life at Vision Lake
        lifeAtVisionLake: '🌅 Vida en Lago Visión',
        welcomeOs: 'Bienvenido al Sistema Operativo del Liderazgo Inteligente',
        visionLakeIntro: 'Lago Visión es más que un espacio de trabajo: es un ecosistema ejecutivo vivo donde cada percepción, interacción e iniciativa está orquestada para ayudarte a liderar con precisión, velocidad y claridad.',
        
        // What Our Capabilities Mean
        whatCapabilitiesMean: '🔓 Qué Significan Nuestras Capacidades Para Ti',
        capabilitiesIntro1: 'No necesitas aprender nuestros sistemas, ellos han sido diseñados para aprenderte a ti.',
        capabilitiesIntro2: 'Cada capacidad dentro de ASOOS existe para eliminar la fricción, desbloquear la precisión y potenciar tu liderazgo. Desde el momento en que ingresas a Lago Visión, estás rodeado de un marco vivo que sabe cuándo organizar, cuándo asesorar y cuándo actuar en tu nombre.',
        capabilitiesIntro3: 'Estas no son herramientas. Son colaboradores de confianza, diseñados específicamente para tu elevación.',
        
        // How We Operate
        howWeOperate: '🧬 Entendiendo Cómo Operamos Para Ti',
        meetTheMinds: 'Conoce las mentes detrás de tu misión.',
        
        // Expert Profiles
        drLucyTitle: 'Dra. Lucy',
        drLucyDesc: 'Ve tu ritmo estratégico. Su sistema Flight Memory rastrea cada decisión, transformando momentos dispersos en una trayectoria coherente. Ella es tu continuidad.',
        drLucyQuote: '"Mientras planeas el mañana, yo preservo lo que hizo tener éxito hoy."',
        
        drGrantTitle: 'Dr. Grant',
        drGrantDesc: 'Construye tu perímetro seguro. Sus sistemas de ciber-autenticación aseguran que solo las manos correctas toquen los datos correctos, sin compromiso.',
        drGrantQuote: '"Protejo las puertas, para que puedas enfocarte en el juego."',
        
        drSabinaTitle: 'Dra. Sabina',
        drSabinaDesc: 'Entiende la psicología del cliente y la cadencia de ventas antes de que aparezcan en tu CRM. Su Dream Commander predice qué movimientos serán más importantes.',
        drSabinaQuote: '"Tú sueñas hacia adelante — yo lo traduciré en impulso."',
        
        drClaudeTitle: 'Dr. Claude',
        drClaudeDesc: 'Es tu COO invisible. Mapea tus agentes a sus tareas de mayor valor, asegurando que nada se deslice y nadie se estanque.',
        drClaudeQuote: '"El trabajo correcto, en las manos correctas, en el momento correcto — siempre."',
        
        drBurbyTitle: 'Dr. Burby',
        drBurbyDesc: 'Hace que cada elección sea a prueba de futuro. Su lógica de blockchain y cumplimiento significa que tus iniciativas pueden escalar sin arrepentimientos.',
        drBurbyQuote: '"La gobernanza no es una puerta. Es una garantía."',
        
        profLeeTitle: 'Profesor Lee',
        profLeeDesc: 'Es tu lente hacia el caos. Con el marco Q4D, ayuda a tus equipos de inteligencia a decodificar entradas complejas en acciones precisas y claras.',
        profLeeQuote: '"La sobrecarga de información termina aquí."',
        
        drMatchTitle: 'Dr. Match',
        drMatchDesc: 'Afila tu influencia. Desde propuestas hasta la postura de marca, te ayuda a hablar en el lenguaje que convierte.',
        drMatchQuote: '"Hagamos tu visión irresistible."',
        
        // Agents of Success
        agentsOfSuccess1: '🧠 Estos no son solo perfiles. Son agentes de tu éxito.',
        agentsOfSuccess2: 'En el mundo de ASOOS, nunca estás gestionando la complejidad solo. Estás dirigiendo una sinfonía ejecutiva inteligente y siempre activa.',
        
        // Your Role
        yourRole: '🧭 Tu Rol en Este Sistema',
        roleCommand: 'Tú comandas los agentes.',
        roleTrain: 'Tú entrenas la inteligencia.',
        roleShape: 'Tú moldeas el futuro.',
        roleDesc1: 'Dirige tu equipo ejecutivo de IA con una visión estratégica clara.',
        roleDesc2: 'Tu retroalimentación afina nuestra precisión y relevancia.',
        roleDesc3: 'ASOOS evoluciona con tu visión de liderazgo.',
        
        // Settings Sections
        accountProfile: 'Cuenta y Perfil',
        subscriptionBilling: 'Suscripción y Facturación',
        languageRegion: 'Idioma y Región',
        appearance: 'Apariencia',
        voiceAudio: 'Voz y Audio',
        aboutAsoos: 'Acerca de ASOOS',
      }
    };

    // Function to get text based on current language
    const getText = (key) => {
      return translations[currentLanguage]?.[key] || translations['en-US'][key];
    };

    return (
      <div className="flex flex-col h-screen bg-gray-50" style={{ fontFamily: 'Montserrat, sans-serif' }}>
        {/* Header */}
        <div className="h-16 bg-black text-white flex items-center justify-between px-6">
          <div className="flex items-center">
            <button 
              onClick={() => setShowSettings(false)}
              className="mr-4 p-2 hover:bg-gray-800 rounded-full"
            >
              ←
            </button>
            <div className="font-bold text-xl" style={{ color: themeColors.primary }}>{getText('headerTitle')}</div>
          </div>
          <div className="text-right">
            <div className="font-bold text-lg">ASOOS.2100.Cool</div>
            <div className="text-sm" style={{ color: themeColors.primary }}>Intelligent Success Companion</div>
          </div>
        </div>
        
        {/* Settings Content - Two-column layout */}
        <div className="flex-1 p-6 max-w-6xl mx-auto w-full flex flex-col">
          {/* Life at Vision Lake - Human-centered section */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
            <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
              <h2 className="text-2xl font-bold">{getText('lifeAtVisionLake')}</h2>
              <p className="text-gray-300 mt-1">{getText('welcomeOs')}</p>
            </div>
            
            <div className="p-5 border-b border-gray-200">
              <p className="mb-4">
                {getText('visionLakeIntro')}
              </p>
              
              <h3 className="text-lg font-bold mb-4" style={{ color: themeColors.primary }}>
                {getText('whatCapabilitiesMean')}
              </h3>
              
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <p className="mb-2">
                  {getText('capabilitiesIntro1')}
                </p>
                <p className="mb-2">
                  {getText('capabilitiesIntro2')}
                </p>
                <p>
                  {getText('capabilitiesIntro3')}
                </p>
              </div>
              
              <h3 className="text-lg font-bold mb-4" style={{ color: themeColors.primary }}>
                {getText('howWeOperate')}
              </h3>
              
              <p className="mb-4">{getText('meetTheMinds')}</p>
              
              <div className="space-y-5">
                <div className="border-l-4 border-blue-500 pl-4 py-1">
                  <div className="font-medium">{getText('drLucyTitle')}</div>
                  <p className="text-sm text-gray-600">{getText('drLucyDesc')}</p>
                  <p className="text-sm italic mt-1">{getText('drLucyQuote')}</p>
                </div>
                
                <div className="border-l-4 border-green-500 pl-4 py-1">
                  <div className="font-medium">{getText('drGrantTitle')}</div>
                  <p className="text-sm text-gray-600">{getText('drGrantDesc')}</p>
                  <p className="text-sm italic mt-1">{getText('drGrantQuote')}</p>
                </div>
                
                <div className="border-l-4 border-purple-500 pl-4 py-1">
                  <div className="font-medium">{getText('drSabinaTitle')}</div>
                  <p className="text-sm text-gray-600">{getText('drSabinaDesc')}</p>
                  <p className="text-sm italic mt-1">{getText('drSabinaQuote')}</p>
                </div>
                
                <div className="border-l-4 border-amber-500 pl-4 py-1">
                  <div className="font-medium">{getText('drClaudeTitle')}</div>
                  <p className="text-sm text-gray-600">{getText('drClaudeDesc')}</p>
                  <p className="text-sm italic mt-1">{getText('drClaudeQuote')}</p>
                </div>
                
                <div className="border-l-4 border-red-500 pl-4 py-1">
                  <div className="font-medium">{getText('drBurbyTitle')}</div>
                  <p className="text-sm text-gray-600">{getText('drBurbyDesc')}</p>
                  <p className="text-sm italic mt-1">{getText('drBurbyQuote')}</p>
                </div>
                
                <div className="border-l-4 border-teal-500 pl-4 py-1">
                  <div className="font-medium">{getText('profLeeTitle')}</div>
                  <p className="text-sm text-gray-600">{getText('profLeeDesc')}</p>
                  <p className="text-sm italic mt-1">{getText('profLeeQuote')}</p>
                </div>
                
                <div className="border-l-4 border-indigo-500 pl-4 py-1">
                  <div className="font-medium">{getText('drMatchTitle')}</div>
                  <p className="text-sm text-gray-600">{getText('drMatchDesc')}</p>
                  <p className="text-sm italic mt-1">{getText('drMatchQuote')}</p>
                </div>
              </div>
              
              <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                <p className="text-center font-medium">{getText('agentsOfSuccess1')}</p>
                <p className="text-center text-sm mt-2">{getText('agentsOfSuccess2')}</p>
              </div>
            </div>
            
            <div className="p-5 border-b border-gray-200">
              <h3 className="text-lg font-bold mb-4" style={{ color: themeColors.primary }}>{getText('yourRole')}</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="font-medium mb-2">{getText('roleCommand')}</div>
                  <p className="text-sm">{getText('roleDesc1')}</p>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="font-medium mb-2">{getText('roleTrain')}</div>
                  <p className="text-sm">{getText('roleDesc2')}</p>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="font-medium mb-2">{getText('roleShape')}</div>
                  <p className="text-sm">{getText('roleDesc3')}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Technical Settings - Collapsible Sections */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
            <div className="p-5 border-b border-gray-200">
              <details>
                <summary className="cursor-pointer">
                  <h3 className="text-lg font-bold inline-block" style={{ color: themeColors.primary }}>{getText('accountProfile')}</h3>
                </summary>
                <div className="mt-4">
                  <div className="flex items-start">
                    <div className="mr-6">
                      <div 
                        className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xl font-bold"
                      >
                        {userInfo.name.split(' ').map(n => n[0]).join('')}
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                          <div className="flex items-center">
                            <input 
                              type="text" 
                              className="flex-1 p-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed" 
                              value={userInfo.name} 
                              disabled
                            />
                            <div className="ml-2 text-xs text-gray-500">Contact administrator to change</div>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                          <div className="flex items-center">
                            <input 
                              type="email" 
                              className="flex-1 p-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed" 
                              value="pr@coaching2100.com" 
                              disabled
                            />
                            <div className="ml-2 text-xs text-gray-500">Contact administrator to change</div>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                          <input 
                            type="text" 
                            className="w-full p-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed" 
                            value={userInfo.role} 
                            disabled
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </details>
            </div>
            
            <div className="p-5 border-b border-gray-200">
              <details>
                <summary className="cursor-pointer">
                  <h3 className="text-lg font-bold inline-block" style={{ color: themeColors.primary }}>{getText('subscriptionBilling')}</h3>
                </summary>
                <div className="mt-4">
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-medium">Current Plan</div>
                      <div className="text-sm px-3 py-1 bg-green-100 text-green-800 rounded-full">Active</div>
                    </div>
                    
                    <div className="flex items-baseline mb-2">
                      <div className="text-xl font-bold mr-2">Enterprise Leader</div>
                      <div className="text-gray-500 text-sm">($15,950/month)</div>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-3">Next billing date: June 8, 2025</div>
                    
                    <div className="grid grid-cols-2 gap-3 my-4">
                      <div className="bg-white rounded p-2 border border-gray-200">
                        <div className="text-xs text-gray-500">Seats</div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium">10</span>
                          <span className="text-xs text-amber-600">10 used</span>
                        </div>
                      </div>
                      <div className="bg-white rounded p-2 border border-gray-200">
                        <div className="text-xs text-gray-500">Teams</div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium">2</span>
                          <span className="text-xs text-green-600">Unlimited</span>
                        </div>
                      </div>
                      <div className="bg-white rounded p-2 border border-gray-200">
                        <div className="text-xs text-gray-500">Co-Pilots Active</div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium">10</span>
                          <span className="text-xs text-gray-500">One per seat</span>
                        </div>
                      </div>
                      <div className="bg-white rounded p-2 border border-gray-200">
                        <div className="text-xs text-gray-500">RIX</div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium">$24,000</span>
                          <span className="text-xs text-gray-500">Monthly</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-4 p-2 bg-blue-50 border border-blue-100 rounded">
                      <div className="text-sm font-medium text-blue-700 mb-1">Visionary Voices Staff</div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">1 Coach</span>
                        <span className="text-sm text-gray-700">$335 per hour</span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button className="text-sm px-3 py-1 rounded border border-gray-300">Manage Plan</button>
                      <button className="text-sm px-3 py-1 rounded border border-gray-300">View Invoices</button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex">
                      <svg 
                        className="w-5 h-5 mr-1 text-gray-500" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2"
                      >
                        <path d="M4 3h16a2 2 0 0 1 2 2v6a10 10 0 0 1-10 10A10 10 0 0 1 2 11V5a2 2 0 0 1 2-2z"></path>
                        <polyline points="8 10 12 14 16 10"></polyline>
                      </svg>
                      <span>Powered by Stripe</span>
                    </div>
                    
                    <div className="flex items-center">
                      <div className="mr-2">Billing Cycle:</div>
                      <select 
                        className="py-1 px-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option>Monthly</option>
                        <option>Annual (Save 10%)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </details>
            </div>
            
            <div className="p-5 border-b border-gray-200">
              <details>
                <summary className="cursor-pointer">
                  <h3 className="text-lg font-bold inline-block" style={{ color: themeColors.primary }}>{getText('languageRegion')}</h3>
                </summary>
                <div className="mt-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Language (Google TTS/STT)
                      </label>
                      <select 
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none"
                        style={{ borderColor: 'focus' ? themeColors.primary : undefined }}
                        value={currentLanguage}
                        onChange={(e) => setCurrentLanguage(e.target.value)}
                      >
                        <option value="en-US">English (United States)</option>
                        <option value="en-GB">English (United Kingdom)</option>
                        <option value="es-ES">Spanish (Spain)</option>
                        <option value="es-MX">Spanish (Mexico)</option>
                        <option value="fr-FR">French (France)</option>
                        <option value="fr-CA">French (Canada)</option>
                        <option value="de-DE">German</option>
                        <option value="it-IT">Italian</option>
                        <option value="pt-BR">Portuguese (Brazil)</option>
                        <option value="zh-CN">Chinese (Simplified)</option>
                        <option value="zh-TW">Chinese (Traditional)</option>
                        <option value="ja-JP">Japanese</option>
                        <option value="ko-KR">Korean</option>
                        <option value="hi-IN">Hindi</option>
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        This setting affects voice recognition, text-to-speech, and interface language.
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Time Zone
                      </label>
                      <select 
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none"
                        style={{ borderColor: 'focus' ? themeColors.primary : undefined }}
                      >
                        <option>America/Mexico_City (UTC-06:00)</option>
                        <option>America/Los_Angeles (UTC-08:00)</option>
                        <option>America/New_York (UTC-05:00)</option>
                        <option>Europe/London (UTC+00:00)</option>
                        <option>Europe/Paris (UTC+01:00)</option>
                        <option>Asia/Tokyo (UTC+09:00)</option>
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        Used for scheduling, calendar events, and time-based features.
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center">
                    <input type="checkbox" id="autoDetect" className="mr-2" checked={true} />
                    <label htmlFor="autoDetect" className="text-sm text-gray-700">Auto-detect language when possible</label>
                  </div>
                </div>
              </details>
            </div>
            
            <div className="p-5 border-b border-gray-200">
              <details>
                <summary className="cursor-pointer">
                  <h3 className="text-lg font-bold inline-block" style={{ color: themeColors.primary }}>{getText('appearance')}</h3>
                </summary>
                <div className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {['default', 'professional', 'modern'].map((themeName) => (
                      <div 
                        key={themeName}
                        onClick={() => setCurrentTheme(themeName)}
                        className={`p-4 border rounded-lg cursor-pointer flex flex-col items-center transition-all ${
                          currentTheme === themeName 
                            ? 'border-cyan-500 bg-cyan-50 shadow-md' 
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                        style={{ 
                          borderColor: currentTheme === themeName ? themeColors.primary : undefined,
                          backgroundColor: currentTheme === themeName ? `${themeColors.primary}10` : undefined
                        }}
                      >
                        <div className="w-full h-20 rounded-md overflow-hidden mb-3 relative">
                          {/* Theme preview */}
                          <div className="absolute inset-0">
                            <div 
                              className="h-6 w-full" 
                              style={{ backgroundColor: themeName === 'default' ? '#000000' : themeName === 'professional' ? '#1a365d' : '#4c1d95' }}
                            ></div>
                            <div className="flex h-14">
                              <div 
                                className="w-6" 
                                style={{ backgroundColor: themeName === 'default' ? '#000000' : themeName === 'professional' ? '#1a365d' : '#4c1d95' }}
                              ></div>
                              <div 
                                className="flex-1" 
                                style={{ backgroundColor: '#ffffff' }}
                              ></div>
                              <div 
                                className="w-12" 
                                style={{ backgroundColor: themeName === 'default' ? '#f4f4f4' : themeName === 'professional' ? '#f8fafc' : '#f5f3ff' }}
                              ></div>
                            </div>
                          </div>
                        </div>
                        <div 
                          className="w-8 h-8 rounded-full mb-2" 
                          style={{ 
                            background: themeName === 'default' ? themeColors.primary : 
                                      themeName === 'professional' ? '#2c5282' : '#6d28d9' 
                          }}
                        ></div>
                        <span className="text-sm font-medium">{themeName.charAt(0).toUpperCase() + themeName.slice(1)}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t border-gray-100 pt-4">
                    <div className="text-sm text-gray-500">
                      Theme changes are applied immediately and will be saved for your next session.
                    </div>
                  </div>
                </div>
              </details>
            </div>
            
            <div className="p-5 border-b border-gray-200">
              <details>
                <summary className="cursor-pointer">
                  <h3 className="text-lg font-bold inline-block" style={{ color: themeColors.primary }}>{getText('voiceAudio')}</h3>
                </summary>
                <div className="mt-4">
                  <div className="flex items-center justify-between py-2 mb-4">
                    <span className="text-sm font-medium text-gray-700">Enable voice responses</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={audioEnabled}
                        onChange={() => setAudioEnabled(!audioEnabled)}
                      />
                      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all" style={{ backgroundColor: 'var(--peer-checked)' ? themeColors.primary : undefined }}></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium text-gray-700">Voice activation on startup</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all" style={{ backgroundColor: 'var(--peer-checked)' ? themeColors.primary : undefined }}></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium text-gray-700">Voice feedback sounds</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={true} />
                      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all" style={{ backgroundColor: 'var(--peer-checked)' ? themeColors.primary : undefined }}></div>
                    </label>
                  </div>
                </div>
              </details>
            </div>
            
            <div className="p-5">
              <details>
                <summary className="cursor-pointer">
                  <h3 className="text-lg font-bold inline-block" style={{ color: themeColors.primary }}>{getText('aboutAsoos')}</h3>
                </summary>
                <div className="mt-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <div className="text-sm font-medium text-gray-700">Version</div>
                      <div className="text-sm">ASOOS.2100.Cool (Build 2025.05.08)</div>
                    </div>
                    
                    <div className="flex justify-between">
                      <div className="text-sm font-medium text-gray-700">Copilot Version</div>
                      <div className="text-sm">QB Lucy 2.7.3</div>
                    </div>
                    
                    <div className="flex justify-between">
                      <div className="text-sm font-medium text-gray-700">License</div>
                      <div className="text-sm">Enterprise (12 seats)</div>
                    </div>
                    
                    <div className="flex justify-between">
                      <div className="text-sm font-medium text-gray-700">Support</div>
                      <div className="text-sm">Premium 24/7</div>
                    </div>
                    
                    <div className="flex justify-between">
                      <div className="text-sm font-medium text-gray-700">Last Updated</div>
                      <div className="text-sm">Thursday, May 08, 2025 at 09:42 AM</div>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex justify-between">
                    <button className="text-sm px-3 py-1 border border-gray-300 rounded">Release Notes</button>
                    <button className="text-sm px-3 py-1 border border-gray-300 rounded">Support Portal</button>
                    <button className="text-sm px-3 py-1 border border-gray-300 rounded">Documentation</button>
                  </div>
                </div>
              </details>
            </div>
          </div>
          
          {/* Save Button */}
          <div className="flex justify-end">
            <button 
              onClick={() => setShowSettings(false)}
              className="px-6 py-3 text-white rounded-md transition-colors font-medium"
              style={{ backgroundColor: themeColors.primary, hover: { backgroundColor: `${themeColors.primary}cc` } }}
            >
              {getText('saveAndClose')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Interface
  return (
    <div className="flex h-screen bg-gray-50" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}>
      {/* Left Sidebar */}
      <div className="w-14 bg-black flex flex-col items-center justify-center pb-6">
        {/* Sidebar Icons with Tooltips */}
        <div className="flex flex-col items-center space-y-8">
          {[
            { id: 1, name: 'Communication', desc: 'Automated Communication', icon: <MessageSquare size={18} /> },
            { id: 2, name: 'Growth', desc: 'Growth Revenues', icon: <Target size={18} /> },
            { id: 3, name: 'Services', desc: 'Client Services Innovation', icon: <Users size={18} /> },
            { id: 4, name: 'Automation', desc: 'Organizational Automation', icon: <Code size={18} /> },
            { id: 5, name: 'ROI', desc: 'ROI Dashboard', icon: <Share2 size={18} /> },
            { id: 6, name: 'Wish', desc: 'Your Wish', icon: <BookOpen size={18} /> },
            { id: 7, name: 'Academy', desc: 'Learning & Training', isTriangle: true, icon: null }
          ].map((item) => (
            <div
              key={item.id}
              onClick={() => item.id === 7 ? toggleAcademyMode() : setSelectedIcon(item.id)}
              className={`w-6 h-6 flex items-center justify-center cursor-pointer transition-all duration-300 group relative ${
                selectedIcon === item.id ? 'opacity-100 scale-110' : 'opacity-60 hover:opacity-80'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <defs>
                  <linearGradient id={`gradient${item.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={themeColors.gradientStart} stopOpacity={1} />
                    <stop offset="50%" stopColor={themeColors.gradientMiddle} stopOpacity={0.8} />
                    <stop offset="100%" stopColor={themeColors.gradientEnd} stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                {item.isTriangle ? 
                  <path d="M12 2L22 20H2L12 2z" stroke={`url(#gradient${item.id})`} strokeWidth="2" fill="none"/> :
                  <circle cx="12" cy="12" r="10" stroke={`url(#gradient${item.id})`} strokeWidth="2" fill="none"/>
                }
              </svg>
              
              {/* Icon inside */}
              {item.icon && (
                <div className="absolute inset-0 flex items-center justify-center text-white">
                  {item.icon}
                </div>
              )}
              
              {/* Tooltip that appears on hover */}
              <div className="absolute left-full ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none bg-gray-800 text-white text-xs py-1 px-2 rounded-md whitespace-nowrap z-50">
                <div className="font-bold">{item.name}</div>
                <div>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-16 bg-black text-white flex items-center justify-between px-6">
          <div className="font-bold text-2xl tracking-wide" style={{ color: themeColors.primary }}>
            ASOOS
          </div>
          <div className="text-right">
            <div className="font-bold text-lg">{userInfo.name}</div>
            <div className="text-sm" style={{ color: themeColors.primary }}>{userInfo.role}</div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex">
          {/* Chat Area */}
          <div className="flex-1 flex flex-col bg-white p-6">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {messages.map((msg, index) => (
                <div key={index} className={`max-w-[70%] ${msg.sender === 'user' ? 'ml-auto' : 'mr-auto'}`}>
                  <div className={`rounded-xl p-3 ${
                    msg.sender === 'user' 
                      ? 'text-white' 
                      : 'bg-gray-100'
                  }`}
                  style={{
                    backgroundColor: msg.sender === 'user' ? themeColors.primary : undefined
                  }}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Input Area */}
            <div className="flex items-center space-x-4 pt-4 border-t border-gray-200">
              <button 
                onClick={toggleListening}
                className={`p-2 rounded-full transition-colors ${
                  isListening 
                    ? 'bg-red-100 text-red-500 hover:bg-red-200' 
                    : 'text-gray-500 hover:text-cyan-500'
                }`}
                title={isListening ? 'Stop listening' : 'Start voice input'}
                style={{
                  color: isListening ? undefined : themeColors.primary
                }}
              >
                <Mic className="w-6 h-6" />
              </button>
              
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={isListening ? 'Listening...' : 'Type your message...'}
                className="flex-1 px-4 py-2 rounded-full border border-gray-300 focus:outline-none"
                style={{
                  borderColor: 'focus' ? themeColors.primary : undefined
                }}
                disabled={isListening}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              
              <button
                className="p-2 text-gray-500 transition-colors"
                onClick={() => setAudioEnabled(!audioEnabled)}
                title={audioEnabled ? 'Mute responses' : 'Enable audio responses'}
                style={{
                  color: themeColors.primary
                }}
              >
                {audioEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
              </button>
              
              <button
                onClick={handleSendMessage}
                disabled={!chatInput.trim() && !isListening}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: chatInput.trim() || isListening ? themeColors.primary : undefined
                }}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Right Panel */}
          <div className="w-96 bg-gray-50 flex flex-col">
            <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4">
              {/* Hexagonal Agent Representation */}
              <div className="flex items-center">
                <div className="relative w-12 h-12 mr-3" title="QB Lucy - Your AI Copilot">
                  <svg viewBox="0 0 100 100" className={`${isSpeaking ? 'animate-pulse' : ''}`}>
                    <defs>
                      <linearGradient id="hexAgentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={themeColors.primary} stopOpacity={0.8} />
                        <stop offset="50%" stopColor={themeColors.primary} stopOpacity={0.9} />
                        <stop offset="100%" stopColor={themeColors.primary} stopOpacity={0.8} />
                      </linearGradient>
                    </defs>
                    <path 
                      d="M50 0 L95 25 L95 75 L50 100 L5 75 L5 25 Z" 
                      stroke={themeColors.primary}
                      strokeWidth="2" 
                      fill="url(#hexAgentGradient)"
                    />
                    <circle cx="50" cy="35" r="10" fill="white" />
                    <path d="M30 70 Q50 90 70 70" stroke="white" strokeWidth="2" fill="none" />
                  </svg>
                </div>
                
                {/* Copilot Information */}
                <div>
                  <div className="font-semibold">{copilotInfo.name}</div>
                  <div className="text-xs text-gray-500">Copilot: {copilotInfo.status}</div>
                </div>
              </div>
              
              {/* Quick Google TTS language indicator */}
              <div className="flex items-center text-xs text-gray-500">
                <Globe size={14} className="mr-1" />
                {currentLanguage.split('-')[0].toUpperCase()}
              </div>
            </div>
            
            {/* S2DO Section */}
            <div className="m-4 bg-white rounded-lg shadow-sm overflow-hidden">
              <div 
                className="flex items-center justify-between p-3 border-b cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                onClick={() => setExpandedPanel(expandedPanel === 'S2DO' ? null : 'S2DO')}
              >
                <h3 className="font-bold" style={{ color: themeColors.primary }}>S2DO's</h3>
                <div className="text-gray-500">
                  {expandedPanel === 'S2DO' ? '▼' : '▶️'}
                </div>
              </div>
              
              {expandedPanel === 'S2DO' && (
                <div className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: themeColors.primary }}></div>
                      <span className="text-sm">Update sales dashboard with Q3 results</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: themeColors.primary }}></div>
                      <span className="text-sm">Schedule review meeting with marketing team</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: themeColors.primary }}></div>
                      <span className="text-sm">Finalize integration with new CRM system</span>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <h3 className="font-bold text-sm mb-2" style={{ color: themeColors.primary }}>Quick Stats</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 p-2 rounded">
                        <div className="text-xs text-gray-500">Open Tasks</div>
                        <div className="text-lg font-bold">12</div>
                      </div>
                      <div className="bg-gray-50 p-2 rounded">
                        <div className="text-xs text-gray-500">In Progress</div>
                        <div className="text-lg font-bold">5</div>
                      </div>
                      <div className="bg-gray-50 p-2 rounded">
                        <div className="text-xs text-gray-500">Completed Today</div>
                        <div className="text-lg font-bold">7</div>
                      </div>
                      <div className="bg-gray-50 p-2 rounded">
                        <div className="text-xs text-gray-500">System Health</div>
                        <div className="text-lg font-bold text-green-500">98%</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Projects Section */}
            <div className="m-4 bg-white rounded-lg shadow-sm overflow-hidden">
              <div 
                className="flex items-center justify-between p-3 border-b cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                onClick={() => setExpandedPanel(expandedPanel === 'Projects' ? null : 'Projects')}
              >
                <h3 className="font-bold" style={{ color: themeColors.primary }}>Phillip's Aixtiv Projects</h3>
                <div className="text-gray-500">
                  {expandedPanel === 'Projects' ? '▼' : '▶️'}
                </div>
              </div>
              
              {expandedPanel === 'Projects' && (
                <div className="p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-sm font-medium">Symphony Integration</span>
                      <span className="text-xs bg-blue-100 text-blue-800 py-1 px-2 rounded">In Progress</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-sm font-medium">Market Analysis Report</span>
                      <span className="text-xs bg-green-100 text-green-800 py-1 px-2 rounded">Completed</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-sm font-medium">Client Presentation</span>
                      <span className="text-xs bg-yellow-100 text-yellow-800 py-1 px-2 rounded">Pending</span>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500 mt-4 flex justify-between items-center">
                    <span>Last updated: Today, 10:42 AM</span>
                    <button className="text-blue-600 hover:text-blue-800">View All Projects</button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Strategic Tasks */}
            <div className="m-4 bg-white rounded-lg shadow-sm overflow-hidden">
              <div 
                className="flex items-center justify-between p-3 border-b cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                onClick={() => setExpandedPanel(expandedPanel === 'Strategic' ? null : 'Strategic')}
              >
                <h3 className="font-bold" style={{ color: themeColors.primary }}>Strategic Executive Projects</h3>
                <div className="text-gray-500">
                  {expandedPanel === 'Strategic' ? '▼' : '▶️'}
                </div>
              </div>
              
              {expandedPanel === 'Strategic' && (
                <div className="p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-sm font-medium">AI Implementation Strategy</span>
                      <span className="text-xs bg-blue-100 text-blue-800 py-1 px-2 rounded">Phase 2</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-sm font-medium">Digital Transformation</span>
                      <span className="text-xs bg-purple-100 text-purple-800 py-1 px-2 rounded">Planning</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-sm font-medium">2026 Growth Initiative</span>
                      <span className="text-xs bg-indigo-100 text-indigo-800 py-1 px-2 rounded">Research</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Learning Resources */}
            <div className="m-4 bg-white rounded-lg shadow-sm overflow-hidden">
              <div 
                className="flex items-center justify-between p-3 border-b cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                onClick={() => setExpandedPanel(expandedPanel === 'Learning' ? null : 'Learning')}
              >
                <h3 className="font-bold" style={{ color: themeColors.primary }}>Learning Resources</h3>
                <div className="text-gray-500">
                  {expandedPanel === 'Learning' ? '▼' : '▶️'}
                </div>
              </div>
              
              {expandedPanel === 'Learning' && (
                <div className="p-4">
                  <div className="space-y-2">
                    <div className="p-2 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">
                      <div className="text-sm font-medium">AI Leadership Masterclass</div>
                      <div className="text-xs text-gray-500">Strategic implementation frameworks</div>
                    </div>
                    <div className="p-2 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">
                      <div className="text-sm font-medium">Executive Communication</div>
                      <div className="text-xs text-gray-500">Advanced techniques & case studies</div>
                    </div>
                    <div className="p-2 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">
                      <div className="text-sm font-medium">Future of Work Symposium</div>
                      <div className="text-xs text-gray-500">Recordings & presentation materials</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Integration Bar */}
        <div className="h-16 bg-gray-100 flex items-center justify-between px-4">
          {/* Settings Icon - Now with brand color */}
          <div 
            className="w-8 h-8 flex items-center justify-center rounded-full cursor-pointer hover:opacity-90 transition-colors"
            onClick={() => setShowSettings(true)}
            style={{ backgroundColor: themeColors.primary }}
          >
            <Settings className="w-5 h-5 text-white" />
          </div>
        
          <div className="flex-1 flex items-center space-x-6 overflow-x-auto justify-center">
            {/* Integration Icons - Smaller and categorized */}
            <div className="flex items-center">
              <div className="text-xs font-medium text-gray-500 mr-2">Productivity:</div>
              {[
                { name: 'Zapier', icon: 'Z', category: 'productivity' },
                { name: 'Slack', icon: 'S', category: 'productivity' },
                { name: 'Asana', icon: 'A', category: 'productivity' }
              ].map((item, idx) => (
                <div
                  key={`${item.category}-${idx}`}
                  className="w-5 h-5 mx-1 flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110 group relative"
                  title={item.name}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <defs>
                      <linearGradient id={`integrationGradient-${item.category}-${idx}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={themeColors.gradientStart} stopOpacity={1} />
                        <stop offset="50%" stopColor={themeColors.gradientMiddle} stopOpacity={0.8} />
                        <stop offset="100%" stopColor={themeColors.gradientEnd} stopOpacity={0.6} />
                      </linearGradient>
                    </defs>
                    <circle cx="12" cy="12" r="10" stroke={`url(#integrationGradient-${item.category}-${idx})`} strokeWidth="2" fill="none"/>
                  </svg>
                  
                  {/* Icon text */}
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-600" style={{ fontSize: '8px' }}>
                    {item.icon}
                  </div>
                  
                  {/* Tooltip that appears on hover */}
                  <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none bg-gray-800 text-white text-xs py-1 px-2 rounded-md whitespace-nowrap z-20">
                    {item.name}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="h-6 border-r border-gray-300"></div>
            
            <div className="flex items-center">
              <div className="text-xs font-medium text-gray-500 mr-2">Dev:</div>
              {[
                { name: 'GitHub', icon: 'G', category: 'dev' },
                { name: 'GitLab', icon: 'GL', category: 'dev' },
                { name: 'Jira', icon: 'J', category: 'dev' }
              ].map((item, idx) => (
                <div
                  key={`${item.category}-${idx}`}
                  className="w-5 h-5 mx-1 flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110 group relative"
                  title={item.name}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <defs>
                      <linearGradient id={`integrationGradient-${item.category}-${idx}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#4169e1" stopOpacity={1} />
                        <stop offset="50%" stopColor="#6b8cde" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#a3b8eb" stopOpacity={0.6} />
                      </linearGradient>
                    </defs>
                    <circle cx="12" cy="12" r="10" stroke={`url(#integrationGradient-${item.category}-${idx})`} strokeWidth="2" fill="none"/>
                  </svg>
                  
                  {/* Icon text */}
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-600" style={{ fontSize: '8px' }}>
                    {item.icon}
                  </div>
                  
                  {/* Tooltip that appears on hover */}
                  <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none bg-gray-800 text-white text-xs py-1 px-2 rounded-md whitespace-nowrap z-20">
                    {item.name}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="h-6 border-r border-gray-300"></div>
            
            <div className="flex items-center">
              <div className="text-xs font-medium text-gray-500 mr-2">LLMs:</div>
              {[
                { name: 'GPT-4', icon: 'G4', category: 'llm' },
                { name: 'Claude', icon: 'C', category: 'llm' },
                { name: 'Gemini', icon: 'GM', category: 'llm' },
                { name: 'Llama', icon: 'L3', category: 'llm' }
              ].map((item, idx) => (
                <div
                  key={`${item.category}-${idx}`}
                  className="w-5 h-5 mx-1 flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110 group relative"
                  title={item.name}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <defs>
                      <linearGradient id={`integrationGradient-${item.category}-${idx}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#006850" stopOpacity={1} />
                        <stop offset="50%" stopColor="#00997a" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#00cca3" stopOpacity={0.6} />
                      </linearGradient>
                    </defs>
                    <circle cx="12" cy="12" r="10" stroke={`url(#integrationGradient-${item.category}-${idx})`} strokeWidth="2" fill="none"/>
                  </svg>
                  
                  {/* Icon text */}
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-600" style={{ fontSize: '8px' }}>
                    {item.icon}
                  </div>
                  
                  {/* Tooltip that appears on hover */}
                  <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none bg-gray-800 text-white text-xs py-1 px-2 rounded-md whitespace-nowrap z-20">
                    {item.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Integration Library Button - Now matching brand color */}
          <button 
            onClick={() => setShowIntegrations(true)}
            className="flex flex-col items-center justify-center w-20 h-10 rounded-full text-white hover:opacity-90 transition-colors text-xs ml-4"
            style={{ backgroundColor: themeColors.primary }}
          >
            <span>Integration</span>
            <span>Gateway</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ASOOSInterface;
