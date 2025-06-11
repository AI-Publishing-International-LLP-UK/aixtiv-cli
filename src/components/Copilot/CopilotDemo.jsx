/**
 * Copilot Demo Component
 * 
 * Showcases the FullWindowWhiteSpaceCopilot component in action with
 * controls to toggle between different modes and settings.
 * 
 * (c) 2025 Copyright AI Publishing International LLP All Rights Reserved.
 * Developed with assistance from the Pilots of Vision Lake.
 */

import React, { useState } from 'react';
import FullWindowWhiteSpaceCopilot from './FullWindowWhiteSpaceCopilot';

const CopilotDemo = () => {
  // State
  const [showCopilot, setShowCopilot] = useState(false);
  const [isVIP, setIsVIP] = useState(false);
  const [messages, setMessages] = useState([]);
  const [customStyles, setCustomStyles] = useState({});
  
  // Toggle copilot visibility
  const toggleCopilot = () => {
    setShowCopilot(!showCopilot);
  };
  
  // Toggle VIP status
  const toggleVIP = () => {
    setIsVIP(!isVIP);
  };
  
  // Handle messages from copilot
  const handleMessage = (message) => {
    setMessages([message, ...messages]);
  };
  
  // Apply white label styling
  const applyWhiteLabel = (theme) => {
    switch(theme) {
      case 'coaching2100':
        setCustomStyles({
          container: {
            backgroundColor: '#f5f7fa',
          },
          responseContainer: {
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '8px',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.08)',
          },
          responseText: {
            color: '#2c3e50',
            fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
          }
        });
        break;
        
      case 'anthology':
        setCustomStyles({
          container: {
            backgroundColor: '#f9f7f4',
          },
          responseContainer: {
            backgroundColor: 'rgba(249, 246, 240, 0.95)',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(30, 30, 30, 0.07)',
          },
          responseText: {
            color: '#333333',
            fontFamily: '"Georgia", serif',
          }
        });
        break;
        
      case 'vision-lake':
        setCustomStyles({
          container: {
            backgroundColor: '#f0f6ff',
          },
          responseContainer: {
            backgroundColor: 'rgba(240, 248, 255, 0.95)',
            borderRadius: '10px',
            boxShadow: '0 4px 15px rgba(20, 80, 220, 0.08)',
          },
          responseText: {
            color: '#1a365d',
            fontFamily: '"Inter", sans-serif',
          }
        });
        break;
        
      default:
        // Default white space style
        setCustomStyles({});
    }
  };
  
  // Render the demo
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>ASOOS Copilot Demo</h1>
      
      <div style={styles.controls}>
        <button 
          style={styles.button} 
          onClick={toggleCopilot}
        >
          {showCopilot ? 'Hide Copilot' : 'Show Copilot'}
        </button>
        
        <div style={styles.vipToggle}>
          <label style={styles.label}>
            <input 
              type="checkbox" 
              checked={isVIP} 
              onChange={toggleVIP}
              style={styles.checkbox}
            />
            VIP Mode (Alt+0 to toggle emotion controls)
          </label>
        </div>
        
        <div style={styles.styleSwitcher}>
          <p style={styles.label}>White Label Themes:</p>
          <button 
            style={styles.styleButton} 
            onClick={() => applyWhiteLabel('default')}
          >
            Default
          </button>
          <button 
            style={styles.styleButton} 
            onClick={() => applyWhiteLabel('coaching2100')}
          >
            COACHING2100
          </button>
          <button 
            style={styles.styleButton} 
            onClick={() => applyWhiteLabel('anthology')}
          >
            Anthology
          </button>
          <button 
            style={styles.styleButton} 
            onClick={() => applyWhiteLabel('vision-lake')}
          >
            Vision Lake
          </button>
        </div>
      </div>
      
      <div style={styles.instructions}>
        <h2>Instructions:</h2>
        <ul>
          <li>Click "Show Copilot" to launch the full-window copilot interface</li>
          <li>Click anywhere on the video to toggle speech recognition</li>
          <li>Speak to interact with the copilot</li>
          <li>If VIP Mode is enabled, use Alt+0 to toggle emotion controls</li>
          <li>Use Alt+1 through Alt+5 to quickly switch emotions (VIP only)</li>
        </ul>
      </div>
      
      <div style={styles.messageLog}>
        <h2>Message Log:</h2>
        {messages.length === 0 ? (
          <p style={styles.noMessages}>No messages yet</p>
        ) : (
          <ul style={styles.messageList}>
            {messages.map((msg, index) => (
              <li key={index} style={styles.messageItem}>
                <div style={styles.messageHeader}>
                  <span style={styles.emotionBadge}>
                    {msg.emotion} ({msg.intensity})
                  </span>
                  <span style={styles.timestamp}>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                </div>
                <div style={styles.messageInput}>You: {msg.input}</div>
                <div style={styles.messageResponse}>Copilot: {msg.response}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {showCopilot && (
        <FullWindowWhiteSpaceCopilot 
          vipStatus={isVIP}
          onMessage={handleMessage}
          customStyles={customStyles}
        />
      )}
    </div>
  );
};

// Styles
const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'sans-serif',
  },
  title: {
    fontSize: '32px',
    marginBottom: '30px',
    color: '#333',
  },
  controls: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    marginBottom: '30px',
    padding: '20px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
  },
  button: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 'bold',
    backgroundColor: '#4a90e2',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  vipToggle: {
    display: 'flex',
    alignItems: 'center',
    marginTop: '10px',
  },
  label: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginRight: '10px',
  },
  checkbox: {
    marginRight: '8px',
    transform: 'scale(1.2)',
  },
  styleSwitcher: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '10px',
  },
  styleButton: {
    padding: '8px 16px',
    fontSize: '14px',
    backgroundColor: '#e0e0e0',
    color: '#333',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  instructions: {
    marginBottom: '30px',
    padding: '20px',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    lineHeight: 1.6,
  },
  messageLog: {
    marginTop: '30px',
    padding: '20px',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    maxHeight: '400px',
    overflowY: 'auto',
  },
  noMessages: {
    fontStyle: 'italic',
    color: '#888',
  },
  messageList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  messageItem: {
    marginBottom: '15px',
    padding: '15px',
    backgroundColor: 'white',
    borderRadius: '6px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  messageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '10px',
  },
  emotionBadge: {
    padding: '3px 8px',
    backgroundColor: '#e1f5fe',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  timestamp: {
    fontSize: '12px',
    color: '#888',
  },
  messageInput: {
    marginBottom: '8px',
    fontWeight: 'bold',
  },
  messageResponse: {
    color: '#444',
  },
};

export default CopilotDemo;