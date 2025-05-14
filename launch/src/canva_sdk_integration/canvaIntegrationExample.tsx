/**
 * Canva SDK Integration for Aixtiv CLI
 *
 * This module provides React components and utilities for integrating with the Canva SDK,
 * enabling automated design creation, template customization, and export capabilities
 * within the Aixtiv CLI Owner-Subscriber V1-V2 Immersive System.
 *
 * @module canvaIntegration
 * @author Aixtiv Symphony Team
 * @copyright 2025 AI Publishing International LLP
 * @version 1.0.0
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import firebase from 'firebase/app';
import 'firebase/firestore';
import 'firebase/storage';

// Type definitions for Canva SDK integration
interface CanvaSDKConfig {
  apiKey: string;
  appId: string;
  environment: 'production' | 'staging' | 'development';
  locale?: string;
  enableConsoleLogging?: boolean;
}

interface CanvaDesignOptions {
  templateId?: string;
  width?: number;
  height?: number;
  designType?: 'presentation' | 'social' | 'print' | 'document' | 'custom';
  colorScheme?: string[];
  fontPairs?: {
    heading: string;
    body: string;
  };
  brandAssets?: {
    logos?: string[];
    images?: string[];
    colors?: string[];
  };
}

interface CanvaElementOptions {
  type: 'text' | 'image' | 'shape' | 'video' | 'audio' | 'background';
  content?: string;
  style?: Record<string, any>;
  position?: {
    x: number;
    y: number;
  };
  dimensions?: {
    width: number;
    height: number;
  };
  properties?: Record<string, any>;
}

interface CanvaExportOptions {
  format: 'png' | 'jpg' | 'pdf' | 'svg' | 'mp4';
  quality?: 'low' | 'medium' | 'high' | 'best';
  pages?: number[] | 'all';
  fileName?: string;
  destination?: 'download' | 'firebase' | 'url';
}

// Main CanvaDesigner component
export const CanvaDesigner: React.FC<{
  config: CanvaSDKConfig;
  designOptions: CanvaDesignOptions;
  onReady?: () => void;
  onError?: (error: Error) => void;
  onSave?: (designId: string) => void;
  onExport?: (exportUrl: string) => void;
  children?: React.ReactNode;
}> = ({ config, designOptions, onReady, onError, onSave, onExport, children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [designId, setDesignId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const canvaContainerRef = useRef<HTMLDivElement>(null);
  const canvaSdkRef = useRef<any>(null);

  // Initialize Canva SDK
  useEffect(() => {
    const initializeCanvaSDK = async () => {
      try {
        setIsLoading(true);

        // Load Canva SDK script if not already loaded
        if (!window.CanvaSDK) {
          const script = document.createElement('script');
          script.src = 'https://sdk.canva.com/designeditor/v1/sdk.js';
          script.async = true;

          // Wait for script to load
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
          });
        }

        // Initialize SDK
        canvaSdkRef.current = await window.CanvaSDK.initialize({
          apiKey: config.apiKey,
          appId: config.appId,
          environment: config.environment,
          locale: config.locale || 'en',
          enableConsoleLogging: config.enableConsoleLogging || false,
          container: canvaContainerRef.current,
        });

        setIsInitialized(true);
        setIsLoading(false);

        if (onReady) {
          onReady();
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to initialize Canva SDK');
        console.error('Canva SDK initialization error:', error);
        setError(error);
        setIsLoading(false);

        if (onError) {
          onError(error);
        }
      }
    };

    initializeCanvaSDK();

    // Cleanup
    return () => {
      if (canvaSdkRef.current && canvaSdkRef.current.destroy) {
        canvaSdkRef.current.destroy();
      }
    };
  }, [config, onReady, onError]);

  // Create new design when designOptions change
  useEffect(() => {
    const createDesign = async () => {
      if (!isInitialized || !canvaSdkRef.current) return;

      try {
        setIsLoading(true);

        // Create new design or use template
        let newDesignId;
        if (designOptions.templateId) {
          newDesignId = await canvaSdkRef.current.loadTemplate(designOptions.templateId);
        } else {
          newDesignId = await canvaSdkRef.current.createDesign({
            width: designOptions.width,
            height: designOptions.height,
            type: designOptions.designType || 'custom',
          });
        }

        // Apply color scheme if provided
        if (designOptions.colorScheme && designOptions.colorScheme.length > 0) {
          await canvaSdkRef.current.setColorPalette(designOptions.colorScheme);
        }

        // Apply font pairs if provided
        if (designOptions.fontPairs) {
          await canvaSdkRef.current.setFonts({
            heading: designOptions.fontPairs.heading,
            body: designOptions.fontPairs.body,
          });
        }

        // Apply brand assets if provided
        if (designOptions.brandAssets) {
          await canvaSdkRef.current.addBrandAssets(designOptions.brandAssets);
        }

        setDesignId(newDesignId);
        setIsLoading(false);

        if (onSave) {
          onSave(newDesignId);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create design');
        console.error('Canva design creation error:', error);
        setError(error);
        setIsLoading(false);

        if (onError) {
          onError(error);
        }
      }
    };

    if (isInitialized) {
      createDesign();
    }
  }, [isInitialized, designOptions, onSave, onError]);

  // Method to add elements to the design
  const addElement = useCallback(
    async (options: CanvaElementOptions) => {
      if (!isInitialized || !canvaSdkRef.current || !designId) {
        throw new Error('Canva SDK not initialized or no active design');
      }

      try {
        switch (options.type) {
          case 'text':
            return await canvaSdkRef.current.addText({
              content: options.content || '',
              style: options.style,
              position: options.position,
              dimensions: options.dimensions,
            });

          case 'image':
            return await canvaSdkRef.current.addImage({
              url: options.content || '',
              position: options.position,
              dimensions: options.dimensions,
              properties: options.properties,
            });

          case 'shape':
            return await canvaSdkRef.current.addShape({
              shapeType: options.content || 'rectangle',
              style: options.style,
              position: options.position,
              dimensions: options.dimensions,
            });

          case 'background':
            return await canvaSdkRef.current.setBackground({
              type: options.content?.includes('://') ? 'image' : 'color',
              value: options.content || '#FFFFFF',
            });

          default:
            throw new Error(`Unsupported element type: ${options.type}`);
        }
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error(`Failed to add ${options.type} element`);
        console.error(`Canva element error (${options.type}):`, error);
        throw error;
      }
    },
    [isInitialized, designId]
  );

  // Method to export the design
  const exportDesign = useCallback(
    async (options: CanvaExportOptions) => {
      if (!isInitialized || !canvaSdkRef.current || !designId) {
        throw new Error('Canva SDK not initialized or no active design');
      }

      try {
        // Generate export
        const exportResult = await canvaSdkRef.current.exportDesign({
          format: options.format,
          quality: options.quality || 'high',
          pages: options.pages || 'all',
          fileName: options.fileName || `aixtiv-design-${uuidv4().substring(0, 8)}`,
        });

        let resultUrl = exportResult.url;

        // Handle different destinations
        if (options.destination === 'firebase') {
          // Upload to Firebase Storage
          const storage = firebase.storage();
          const fileName =
            options.fileName || `${Date.now()}-${uuidv4().substring(0, 8)}.${options.format}`;
          const storageRef = storage.ref(`designs/${fileName}`);

          // Fetch the blob from the export URL
          const response = await fetch(exportResult.url);
          const blob = await response.blob();

          // Upload the blob
          const uploadTask = await storageRef.put(blob);

          // Get the download URL
          resultUrl = await uploadTask.ref.getDownloadURL();

          // Save reference in Firestore
          await firebase.firestore().collection('canva_designs').add({
            fileName,
            fileUrl: resultUrl,
            format: options.format,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            designId,
          });
        }

        if (onExport) {
          onExport(resultUrl);
        }

        return resultUrl;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to export design');
        console.error('Canva export error:', error);

        if (onError) {
          onError(error);
        }

        throw error;
      }
    },
    [isInitialized, designId, onExport, onError]
  );

  // Expose methods via React Context
  const contextValue = {
    isInitialized,
    isLoading,
    error,
    designId,
    addElement,
    exportDesign,
    sdk: canvaSdkRef.current,
  };

  return (
    <CanvaContext.Provider value={contextValue}>
      <div className="canva-designer-container">
        <div
          ref={canvaContainerRef}
          className="canva-editor-container"
          style={{ width: '100%', height: '600px' }}
        ></div>
        {children}
        {isLoading && <div className="canva-loading-overlay">Loading Canva Designer...</div>}
        {error && <div className="canva-error-message">Error: {error.message}</div>}
      </div>
    </CanvaContext.Provider>
  );
};

// Create Canva Context for easier access in child components
export const CanvaContext = React.createContext<{
  isInitialized: boolean;
  isLoading: boolean;
  error: Error | null;
  designId: string | null;
  addElement: (options: CanvaElementOptions) => Promise<any>;
  exportDesign: (options: CanvaExportOptions) => Promise<string>;
  sdk: any;
}>({
  isInitialized: false,
  isLoading: false,
  error: null,
  designId: null,
  addElement: async () => {
    throw new Error('Canva context not initialized');
  },
  exportDesign: async () => {
    throw new Error('Canva context not initialized');
  },
  sdk: null,
});

// Hook for accessing Canva functionality
export const useCanva = () => React.useContext(CanvaContext);

// Pre-configured templates for common use cases
export const CanvaTemplates = {
  socialMedia: {
    instagram: {
      post: {
        width: 1080,
        height: 1080,
        designType: 'social',
      },
      story: {
        width: 1080,
        height: 1920,
        designType: 'social',
      },
    },
    facebook: {
      post: {
        width: 1200,
        height: 630,
        designType: 'social',
      },
      cover: {
        width: 820,
        height: 312,
        designType: 'social',
      },
    },
    twitter: {
      post: {
        width: 1200,
        height: 675,
        designType: 'social',
      },
      header: {
        width: 1500,
        height: 500,
        designType: 'social',
      },
    },
    linkedin: {
      post: {
        width: 1200,
        height: 627,
        designType: 'social',
      },
    },
  },
  presentations: {
    standard: {
      width: 1920,
      height: 1080,
      designType: 'presentation',
    },
    widescreen: {
      width: 1920,
      height: 1080,
      designType: 'presentation',
    },
  },
  documents: {
    letter: {
      width: 816,
      height: 1056,
      designType: 'document',
    },
    a4: {
      width: 794,
      height: 1123,
      designType: 'document',
    },
  },
  marketing: {
    flyer: {
      width: 816,
      height: 1056,
      designType: 'print',
    },
    businessCard: {
      width: 336,
      height: 192,
      designType: 'print',
    },
    postcard: {
      width: 420,
      height: 300,
      designType: 'print',
    },
  },
};
