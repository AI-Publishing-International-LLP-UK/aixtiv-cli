/**
 * FullWindowWhiteSpaceCopilot Component
 *
 * Provides a full-window video copilot interface with green screen processing
 * and subtle emotion tuning capabilities for VIP users.
 *
 * Features:
 * - Full-window video display with proper scaling
 * - Green screen processing for professional appearance
 * - Speech recognition for voice commands
 * - White space design principles
 * - Hidden emotion tuning capabilities for VIP users only
 * - Keyboard shortcuts for VIPs to change emotional tones
 *
 * (c) 2025 Copyright AI Publishing International LLP All Rights Reserved.
 * Developed with assistance from the Pilots of Vision Lake.
 */

import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import emotionTuningService from '../../services/emotion-tuning';
import videoSystem from '../../services/video-system';

// Style constants for white space design
const COLORS = {
  primary: '#FFFFFF',
  secondary: '#F9F9F9',
  accent: '#E8E8E8',
  text: '#222222',
  subtle: '#888888',
  shadow: 'rgba(0, 0, 0, 0.05)',
};

// Speech recognition configuration
const SPEECH_RECOGNITION_CONFIG = {
  continuous: true,
  interimResults: true,
  lang: 'en-US',
};

// VIP emotion tuning keyboard shortcuts
const EMOTION_SHORTCUTS = {
  'Alt+1': 'formal',
  'Alt+2': 'friendly',
  'Alt+3': 'empathetic',
  'Alt+4': 'confident',
  'Alt+5': 'enthusiastic',
};

// Session data
const SESSION_ID = uuidv4();

const FullWindowWhiteSpaceCopilot = ({
  userConfig = {},
  vipStatus = false,
  onMessage,
  customStyles = {},
}) => {
  // State management
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isVIP, setIsVIP] = useState(vipStatus);
  const [currentEmotion, setCurrentEmotion] = useState('friendly');
  const [emotionIntensity, setEmotionIntensity] = useState(5);
  const [showEmotionControls, setShowEmotionControls] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [videoSession, setVideoSession] = useState(null);
  const [videoSettings, setVideoSettings] = useState({
    resolution: '1080p',
    frameRate: 30,
    greenScreen: true,
    backgroundId: null,
  });
  const [errorMessage, setErrorMessage] = useState('');

  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const outputCanvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const recognitionRef = useRef(null);
  const speechSynthesisRef = useRef(null);

  // Merged styles with customization
  const styles = {
    container: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.primary,
      overflow: 'hidden',
      zIndex: 1000,
      ...customStyles.container,
    },
    videoContainer: {
      position: 'relative',
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      ...customStyles.videoContainer,
    },
    video: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      visibility: 'hidden', // Hidden as we'll draw to canvas
      ...customStyles.video,
    },
    processingCanvas: {
      position: 'absolute',
      width: '1px',
      height: '1px',
      visibility: 'hidden',
      ...customStyles.processingCanvas,
    },
    outputCanvas: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      objectFit: 'contain',
      ...customStyles.outputCanvas,
    },
    responseContainer: {
      position: 'absolute',
      bottom: '40px',
      left: '50%',
      transform: 'translateX(-50%)',
      maxWidth: '90%',
      width: '800px',
      padding: '20px',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderRadius: '12px',
      boxShadow: `0 4px 20px ${COLORS.shadow}`,
      opacity: response ? 1 : 0,
      transition: 'opacity 0.3s ease',
      ...customStyles.responseContainer,
    },
    responseText: {
      fontSize: '18px',
      lineHeight: '1.6',
      color: COLORS.text,
      fontWeight: 400,
      ...customStyles.responseText,
    },
    transcriptContainer: {
      position: 'absolute',
      top: '40px',
      left: '50%',
      transform: 'translateX(-50%)',
      maxWidth: '90%',
      width: '800px',
      padding: '12px 20px',
      backgroundColor: 'rgba(255, 255, 255, 0.7)',
      borderRadius: '12px',
      boxShadow: `0 2px 10px ${COLORS.shadow}`,
      opacity: transcript || interimTranscript ? 1 : 0,
      transition: 'opacity 0.3s ease',
      ...customStyles.transcriptContainer,
    },
    transcriptText: {
      fontSize: '16px',
      lineHeight: '1.4',
      color: COLORS.text,
      fontWeight: 300,
      ...customStyles.transcriptText,
    },
    interimTranscript: {
      color: COLORS.subtle,
      fontStyle: 'italic',
      ...customStyles.interimTranscript,
    },
    emotionControls: {
      position: 'absolute',
      top: '20px',
      right: '20px',
      padding: '15px',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderRadius: '12px',
      boxShadow: `0 2px 15px ${COLORS.shadow}`,
      zIndex: 1001,
      opacity: showEmotionControls ? 1 : 0,
      pointerEvents: showEmotionControls ? 'auto' : 'none',
      transition: 'opacity 0.3s ease',
      ...customStyles.emotionControls,
    },
    emotionButton: {
      padding: '8px 15px',
      margin: '4px',
      backgroundColor: COLORS.secondary,
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px',
      transition: 'background-color 0.2s ease',
      ...customStyles.emotionButton,
    },
    emotionButtonActive: {
      backgroundColor: COLORS.accent,
      fontWeight: 'bold',
      ...customStyles.emotionButtonActive,
    },
    intensitySlider: {
      width: '100%',
      margin: '10px 0',
      ...customStyles.intensitySlider,
    },
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: COLORS.primary,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1002,
      opacity: isLoading ? 1 : 0,
      pointerEvents: isLoading ? 'auto' : 'none',
      transition: 'opacity 0.5s ease',
      ...customStyles.loadingOverlay,
    },
    errorMessage: {
      position: 'absolute',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '12px 20px',
      backgroundColor: 'rgba(255, 80, 80, 0.9)',
      color: 'white',
      borderRadius: '8px',
      zIndex: 1003,
      opacity: errorMessage ? 1 : 0,
      transition: 'opacity 0.3s ease',
      ...customStyles.errorMessage,
    },
  };

  // Initialize the component
  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialize services
        await emotionTuningService.initialize();
        await videoSystem.initialize();

        // Set up video session
        const session = await videoSystem.createSession({
          agentId: 'aixtiv-copilot',
          agentType: 'copilot',
          title: 'Full Window Copilot Session',
          description: 'White space design with video integration',
          resolution: videoSettings.resolution,
          frameRate: videoSettings.frameRate,
          greenScreen: videoSettings.greenScreen,
          interfaceVersion: 'v2',
        });

        setVideoSession(session);

        // Load available backgrounds
        const backgrounds = await videoSystem.listBackgrounds();
        if (backgrounds && backgrounds.length > 0) {
          setVideoSettings((prev) => ({
            ...prev,
            backgroundId: backgrounds[0].id,
          }));
        }

        // Set up speech recognition
        if (window.SpeechRecognition || window.webkitSpeechRecognition) {
          const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
          recognitionRef.current = new SpeechRecognition();
          recognitionRef.current.continuous = SPEECH_RECOGNITION_CONFIG.continuous;
          recognitionRef.current.interimResults = SPEECH_RECOGNITION_CONFIG.interimResults;
          recognitionRef.current.lang = SPEECH_RECOGNITION_CONFIG.lang;

          recognitionRef.current.onresult = handleSpeechResult;
          recognitionRef.current.onerror = handleSpeechError;
          recognitionRef.current.onend = handleSpeechEnd;
        } else {
          console.warn('Speech recognition not supported in this browser');
        }

        // Set up speech synthesis
        if (window.speechSynthesis) {
          speechSynthesisRef.current = window.speechSynthesis;
        } else {
          console.warn('Speech synthesis not supported in this browser');
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('Initialization error:', error);
        setErrorMessage('Failed to initialize copilot: ' + error.message);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();

    // Set up keyboard shortcut listener for VIP users
    const handleKeyDown = (event) => {
      if (!isVIP) return;

      const keyCombo = `${event.altKey ? 'Alt+' : ''}${event.key}`;

      if (keyCombo === 'Alt+0') {
        // Toggle emotion controls
        setShowEmotionControls((prev) => !prev);
        return;
      }

      // Check for emotion shortcuts
      Object.entries(EMOTION_SHORTCUTS).forEach(([shortcut, emotion]) => {
        if (shortcut === keyCombo) {
          setCurrentEmotion(emotion);
          // Flash notification
          setShowEmotionControls(true);
          setTimeout(() => {
            setShowEmotionControls(false);
          }, 2000);
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);

    // Clean up
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      stopVideoProcessing();

      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }

      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel();
      }
    };
  }, [isVIP, videoSettings]);

  // Set up video stream and processing
  useEffect(() => {
    if (!isInitialized) return;

    const setupVideoStream = async () => {
      try {
        // Request user media
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: videoSettings.frameRate },
          },
          audio: false,
        });

        // Set video source
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            startVideoProcessing();
          };
        }
      } catch (error) {
        console.error('Error accessing video stream:', error);
        setErrorMessage('Could not access camera: ' + error.message);
      }
    };

    setupVideoStream();

    return () => {
      // Clean up video stream
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, [isInitialized]);

  // Start video processing
  const startVideoProcessing = () => {
    if (!videoRef.current || !canvasRef.current || !outputCanvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const outputCanvas = outputCanvasRef.current;
    const processingContext = canvas.getContext('2d');
    const outputContext = outputCanvas.getContext('2d');

    // Set canvas dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    outputCanvas.width = window.innerWidth;
    outputCanvas.height = window.innerHeight;

    // Process video frames
    const processFrame = () => {
      if (!video.paused && !video.ended) {
        // Draw video frame to processing canvas
        processingContext.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Apply green screen effect
        if (videoSettings.greenScreen) {
          applyGreenScreenEffect(processingContext, canvas.width, canvas.height);
        }

        // Draw to output canvas with proper scaling
        const outputWidth = outputCanvas.width;
        const outputHeight = outputCanvas.height;

        // Calculate proper scaling to maintain aspect ratio
        const videoAspect = canvas.width / canvas.height;
        const canvasAspect = outputWidth / outputHeight;

        let drawWidth, drawHeight, offsetX, offsetY;

        if (videoAspect > canvasAspect) {
          // Video is wider than canvas
          drawHeight = outputHeight;
          drawWidth = drawHeight * videoAspect;
          offsetX = (outputWidth - drawWidth) / 2;
          offsetY = 0;
        } else {
          // Video is taller than canvas
          drawWidth = outputWidth;
          drawHeight = drawWidth / videoAspect;
          offsetX = 0;
          offsetY = (outputHeight - drawHeight) / 2;
        }

        // Clear output canvas and draw processed frame
        outputContext.clearRect(0, 0, outputWidth, outputHeight);
        outputContext.drawImage(
          canvas,
          0,
          0,
          canvas.width,
          canvas.height,
          offsetX,
          offsetY,
          drawWidth,
          drawHeight
        );
      }

      // Continue processing
      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    // Start processing
    animationFrameRef.current = requestAnimationFrame(processFrame);
  };

  // Apply green screen effect
  const applyGreenScreenEffect = (context, width, height) => {
    const imageData = context.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Green screen settings
    const threshold = 80;
    const greenThreshold = 100;

    // Process each pixel
    for (let i = 0; i < data.length; i += 4) {
      const red = data[i];
      const green = data[i + 1];
      const blue = data[i + 2];

      // Check if pixel is green (green is significantly higher than red and blue)
      const isGreen = green > greenThreshold && green > red + threshold && green > blue + threshold;

      // If it's a green pixel, make it transparent
      if (isGreen) {
        // Calculate transparency based on how "green" it is
        const greenness = Math.min(1.0, (green - Math.max(red, blue)) / threshold);
        data[i + 3] = 255 * (1.0 - greenness); // Alpha channel
      }
    }

    // Put processed image data back
    context.putImageData(imageData, 0, 0);
  };

  // Stop video processing
  const stopVideoProcessing = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  // Handle speech recognition result
  const handleSpeechResult = (event) => {
    let interimText = '';
    let finalText = '';

    for (let i = 0; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        finalText += event.results[i][0].transcript;
      } else {
        interimText += event.results[i][0].transcript;
      }
    }

    setInterimTranscript(interimText);

    if (finalText) {
      setTranscript(finalText);
      processUserInput(finalText);
    }
  };

  // Handle speech recognition error
  const handleSpeechError = (event) => {
    console.error('Speech recognition error:', event.error);
    setErrorMessage(`Speech recognition error: ${event.error}`);
    setIsListening(false);
  };

  // Handle speech recognition end
  const handleSpeechEnd = () => {
    // Auto restart if we were listening
    if (isListening && recognitionRef.current) {
      recognitionRef.current.start();
    }
  };

  // Start listening
  const startListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // Stop listening
  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // Toggle listening
  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Process user input
  const processUserInput = async (input) => {
    try {
      // Reset interim transcript
      setInterimTranscript('');

      // Get suggested tone based on user input
      const toneSuggestion = await emotionTuningService.suggestTone(input);

      // Use VIP preferences if VIP, otherwise use suggested tone
      const toneToUse = isVIP ? currentEmotion : toneSuggestion.tone;
      const intensityToUse = isVIP ? emotionIntensity : toneSuggestion.intensity;

      // Generate response (mock API call for demonstration)
      const mockResponse = `I understand you're asking about "${input}". This is a simulated response from the copilot, which would normally be adjusted using the emotion tuning service with tone: ${toneToUse} and intensity: ${intensityToUse}.`;

      // Adjust response tone
      const adjustedResponse = await emotionTuningService.adjustTone(
        mockResponse,
        toneToUse,
        intensityToUse,
        { userId: 'user-123', conversationId: SESSION_ID }
      );

      // Set response
      setResponse(adjustedResponse.adjustedMessage);

      // Speak response if speech synthesis is available
      if (speechSynthesisRef.current) {
        const utterance = new SpeechSynthesisUtterance(adjustedResponse.adjustedMessage);
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        speechSynthesisRef.current.speak(utterance);
      }

      // Call onMessage callback if provided
      if (onMessage) {
        onMessage({
          input,
          response: adjustedResponse.adjustedMessage,
          emotion: toneToUse,
          intensity: intensityToUse,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error processing input:', error);
      setErrorMessage('Failed to process your request: ' + error.message);
    }
  };

  // Change emotion setting (for VIP users)
  const changeEmotion = (emotion) => {
    if (!isVIP) return;
    setCurrentEmotion(emotion);
  };

  // Change emotion intensity (for VIP users)
  const changeIntensity = (event) => {
    if (!isVIP) return;
    setEmotionIntensity(parseInt(event.target.value, 10));
  };

  // Render the component
  return (
    <div style={styles.container}>
      {/* Video container */}
      <div style={styles.videoContainer}>
        <video ref={videoRef} style={styles.video} autoPlay playsInline muted />

        {/* Processing canvas (hidden) */}
        <canvas ref={canvasRef} style={styles.processingCanvas} />

        {/* Output canvas */}
        <canvas ref={outputCanvasRef} style={styles.outputCanvas} onClick={toggleListening} />
      </div>

      {/* Transcript display */}
      <div style={styles.transcriptContainer}>
        <p style={styles.transcriptText}>
          {transcript}
          <span style={styles.interimTranscript}>{interimTranscript}</span>
        </p>
      </div>

      {/* Response display */}
      <div style={styles.responseContainer}>
        <p style={styles.responseText}>{response}</p>
      </div>

      {/* VIP Emotion controls */}
      {isVIP && (
        <div style={styles.emotionControls}>
          <h3>Emotion Tuning</h3>
          {Object.values(EMOTION_SHORTCUTS).map((emotion) => (
            <button
              key={emotion}
              style={{
                ...styles.emotionButton,
                ...(currentEmotion === emotion ? styles.emotionButtonActive : {}),
              }}
              onClick={() => changeEmotion(emotion)}
            >
              {emotion.charAt(0).toUpperCase() + emotion.slice(1)}
            </button>
          ))}
          <div>
            <label htmlFor="intensity">Intensity: {emotionIntensity}</label>
            <input
              type="range"
              id="intensity"
              name="intensity"
              min="1"
              max="10"
              value={emotionIntensity}
              onChange={changeIntensity}
              style={styles.intensitySlider}
            />
          </div>
        </div>
      )}

      {/* Loading overlay */}
      <div style={styles.loadingOverlay}>
        <div>Loading Copilot...</div>
      </div>

      {/* Error message */}
      {errorMessage && <div style={styles.errorMessage}>{errorMessage}</div>}
    </div>
  );
};

export default FullWindowWhiteSpaceCopilot;
