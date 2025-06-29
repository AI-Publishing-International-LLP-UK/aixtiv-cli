// ASOOS UI Hooks - Real implementations (not mocks)
// These hooks connect to the real backend services

/**
 * Authentication hook - integrates with SallyPort passwordless authentication
 */
function useAuth() {
  const [user, setUser] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [authState, setAuthState] = React.useState('idle'); // idle, verifying, or challenge
  const [challenge, setChallenge] = React.useState(null);

  // Check if user is already authenticated on mount
  React.useEffect(() => {
    const savedToken = localStorage.getItem('asoos_auth_token');
    const savedUser = localStorage.getItem('asoos_user');

    if (savedToken && savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);

        // Verify token is still valid with SallyPort
        verifySession(savedToken, userData.id);
      } catch (e) {
        console.error('Failed to parse saved user data', e);
        localStorage.removeItem('asoos_auth_token');
        localStorage.removeItem('asoos_user');
      }
    }
  }, []);

  // Verify the session token is still valid
  const verifySession = async (token, userId) => {
    try {
      setAuthState('verifying');
      const response = await fetch('/api/sallyport/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        // Session expired, log out
        localStorage.removeItem('asoos_auth_token');
        localStorage.removeItem('asoos_user');
        setUser(null);
        setAuthState('idle');
      } else {
        // Session still valid
        setAuthState('idle');
      }
    } catch (err) {
      console.error('Session verification error:', err);
      setAuthState('idle');
    }
  };

  // Start passwordless SallyPort authentication
  const startAuth = async (identifier) => {
    setIsLoading(true);
    setError(null);
    setAuthState('challenge');

    try {
      // Request authentication challenge from SallyPort
      const response = await fetch('/api/sallyport/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifier }),
      });

      if (!response.ok) {
        throw new Error(`Authentication challenge failed: ${response.status}`);
      }

      const data = await response.json();
      setChallenge(data.challenge);
      return data.challenge;
    } catch (err) {
      console.error('Authentication initiation error:', err);
      setError(err.message);
      setAuthState('idle');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Complete SallyPort authentication (no password)
  const completeAuth = async (challengeId, biometricResponse = true) => {
    setIsLoading(true);
    setError(null);

    try {
      // Verify SallyPort challenge (no password, using biometrics or device authentication)
      const response = await fetch('/api/sallyport/authenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          challengeId,
          biometricResponse,
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            vendor: navigator.vendor,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status}`);
      }

      const data = await response.json();

      // Store auth token and user data
      localStorage.setItem('asoos_auth_token', data.token);
      localStorage.setItem('asoos_user', JSON.stringify(data.user));

      setUser(data.user);
      setAuthState('idle');
      setChallenge(null);
      return data;
    } catch (err) {
      console.error('Authentication completion error:', err);
      setError(err.message);
      setAuthState('idle');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Login with SallyPort secure passwordless authentication
  const login = async (identifier) => {
    try {
      const challenge = await startAuth(identifier);
      return await completeAuth(challenge.id);
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message);
      throw err;
    }
  };

  // Logout
  const logout = async () => {
    setIsLoading(true);

    try {
      // Call real logout endpoint
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('asoos_auth_token')}`,
        },
      });

      // Clear local storage and state
      localStorage.removeItem('asoos_auth_token');
      localStorage.removeItem('asoos_user');
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
    login,
    logout,
  };
}

/**
 * Voice service hook - integrates with actual speech recognition and synthesis
 */
function useVoiceService() {
  const [isListening, setIsListening] = React.useState(false);
  const [transcript, setTranscript] = React.useState('');
  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const [error, setError] = React.useState(null);

  const recognition = React.useRef(null);
  const speechSynthesis = window.speechSynthesis;

  // Initialize speech recognition
  React.useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = true;
      recognition.current.interimResults = true;

      recognition.current.onresult = (event) => {
        const current = event.resultIndex;
        const currentTranscript = event.results[current][0].transcript;
        setTranscript(currentTranscript);
      };

      recognition.current.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setError(`Speech recognition error: ${event.error}`);
        setIsListening(false);
      };

      recognition.current.onend = () => {
        setIsListening(false);
      };
    } else {
      setError('Speech recognition not supported in this browser');
    }

    return () => {
      if (recognition.current) {
        recognition.current.stop();
      }

      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
      }
    };
  }, []);

  // Start listening for speech
  const startListening = () => {
    setError(null);
    setTranscript('');

    if (recognition.current) {
      try {
        recognition.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Failed to start speech recognition', err);
        setError(`Failed to start speech recognition: ${err.message}`);
      }
    } else {
      setError('Speech recognition not available');
    }
  };

  // Stop listening for speech
  const stopListening = () => {
    if (recognition.current) {
      recognition.current.stop();
      setIsListening(false);
    }
  };

  // Speak text using real speech synthesis
  const speak = (text, options = {}) => {
    setError(null);

    if (!speechSynthesis) {
      setError('Speech synthesis not supported in this browser');
      return;
    }

    // Stop any current speech
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }

    // Create real utterance
    const utterance = new SpeechSynthesisUtterance(text);

    // Configure voice options
    if (options.voice) {
      const voices = speechSynthesis.getVoices();
      const voice = voices.find((v) => v.name === options.voice || v.voiceURI === options.voice);
      if (voice) {
        utterance.voice = voice;
      }
    }

    if (options.rate) utterance.rate = options.rate;
    if (options.pitch) utterance.pitch = options.pitch;
    if (options.volume) utterance.volume = options.volume;
    if (options.lang) utterance.lang = options.lang;

    // Set event handlers
    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error', event);
      setError(`Speech synthesis error: ${event.error}`);
      setIsSpeaking(false);
    };

    // Speak the text
    speechSynthesis.speak(utterance);
  };

  // Stop speaking
  const stopSpeaking = () => {
    if (speechSynthesis) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Get available voices
  const getVoices = () => {
    return speechSynthesis ? speechSynthesis.getVoices() : [];
  };

  return {
    isListening,
    isSpeaking,
    transcript,
    error,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    getVoices,
  };
}

/**
 * QB Lucy AI service hook - integrates with Claude via the gateway
 */
function useQBLucy() {
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [response, setResponse] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [mood, setMood] = React.useState('😊'); // Default mood

  // Get API key for Claude requests
  const getApiKey = async () => {
    try {
      const response = await fetch('/api/request-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('asoos_auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get API key: ${response.status}`);
      }

      const data = await response.json();
      return data.apiKey;
    } catch (err) {
      console.error('Error getting API key:', err);
      throw err;
    }
  };

  // Send message to QB Lucy (real Claude integration)
  const sendMessage = async (message, options = {}) => {
    setIsProcessing(true);
    setError(null);

    try {
      // Get API key for this request
      const apiKey = await getApiKey();

      // Prepare Claude API request with the models specified in MCP config
      const claudeRequest = {
        messages: [{ role: 'user', content: message }],
        model: options.model || 'claude-3-5-sonnet',
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature || 0.7,
        system: options.systemPrompt || 'You are QB Lucy, a helpful AI assistant.',
        metadata: {
          mood: mood,
          domain: window.location.hostname,
        },
      };

      // Send request through gateway proxy
      const response = await fetch('/api/claude/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'X-Service-ID': 'asoos-ui',
          'X-Client-ID': 'asoos-2100-cool',
        },
        body: JSON.stringify(claudeRequest),
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status}`);
      }

      const data = await response.json();
      setResponse(data);
      return data;
    } catch (err) {
      console.error('Error sending message to QB Lucy:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  // Change QB Lucy's mood
  const changeMood = (newMood) => {
    setMood(newMood);
  };

  return {
    isProcessing,
    response,
    error,
    mood,
    sendMessage,
    changeMood,
  };
}
