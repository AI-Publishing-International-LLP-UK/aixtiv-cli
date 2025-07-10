/**
 * Canva Export Handler for Aixtiv CLI
 *
 * This module provides utilities for handling Canva design exports, including
 * processing exported designs, organizing them into the filesystem, and
 * tracking designs in the database.
 *
 * @module canvaExportHandler
 * @author Aixtiv Symphony Team
 * @copyright 2025 AI Publishing International LLP
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';
import * as admin from 'firebase-admin';

// Type definitions
export interface ExportedDesign {
  url: string;
  format: string;
  width: number;
  height: number;
  pages: number;
  fileName: string;
  size: number;
  metadata: Record<string, any>;
}

export interface ExportOptions {
  saveLocal?: boolean;
  localPath?: string;
  saveToFirebase?: boolean;
  firebaseCollection?: string;
  metadata?: Record<string, any>;
  userId?: string;
  projectId?: string;
  tags?: string[];
}

export interface ExportResult {
  designId: string;
  localPath?: string;
  firebaseRef?: string;
  downloadUrl?: string;
  metadata: Record<string, any>;
  timestamp: string;
  status: 'success' | 'partial_success' | 'failed';
  error?: string;
}

/**
 * Main export handler class
 */
export class CanvaExportHandler {
  private db: FirebaseFirestore.Firestore;
  private storage: admin.storage.Storage;
  private basePath: string;

  /**
   * Initialize the export handler
   * @param basePath - Base local path for storing designs
   * @param firebaseApp - Initialized Firebase admin app
   */
  constructor(basePath: string = './designs', firebaseApp?: admin.app.App) {
    this.basePath = basePath;

    // Ensure base path exists
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }

    // Initialize Firebase references if app provided
    if (firebaseApp) {
      this.db = firebaseApp.firestore();
      this.storage = firebaseApp.storage();
    } else if (admin.apps.length > 0) {
      this.db = admin.firestore();
      this.storage = admin.storage();
    }
  }

  /**
   * Process an exported design
   * @param design - The exported design data
   * @param options - Export handling options
   * @returns Export result details
   */
  public async processExport(
    design: ExportedDesign,
    options: ExportOptions = {}
  ): Promise<ExportResult> {
    const designId = uuidv4();
    const timestamp = new Date().toISOString();
    let error: string | undefined;

    const result: ExportResult = {
      designId,
      metadata: {
        ...design.metadata,
        ...options.metadata,
        format: design.format,
        dimensions: {
          width: design.width,
          height: design.height,
        },
        pages: design.pages,
        size: design.size,
        fileName: design.fileName,
        originalUrl: design.url,
      },
      timestamp,
      status: 'success',
    };

    try {
      // Download the design if we need to save it
      let designBuffer: Buffer | null = null;

      if (options.saveLocal || options.saveToFirebase) {
        const response = await fetch(design.url);
        if (!response.ok) {
          throw new Error(`Failed to download design: ${response.status} ${response.statusText}`);
        }

        designBuffer = Buffer.from(await response.arrayBuffer());
      }

      // Save locally if requested
      if (options.saveLocal) {
        try {
          const localPath =
            options.localPath ??
            path.join(
              this.basePath,
              options.userId ?? 'anonymous',
              options.projectId ?? 'misc',
              `${designId}.${design.format}`
            );

          // Ensure directory exists
          const dir = path.dirname(localPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }

          // Write the file
          fs.writeFileSync(localPath, designBuffer!);
          result.localPath = localPath;
        } catch (err) {
          console.error('Error saving design locally:', err);
          error = `Failed to save design locally: ${err instanceof Error ? err.message : 'Unknown error'}`;
          result.status = 'partial_success';
        }
      }

      // Save to Firebase if requested
      if (options.saveToFirebase && this.db && this.storage) {
        try {
          // Upload to Firebase Storage
          const fileName = `designs/${options.userId ?? 'anonymous'}/${designId}.${design.format}`;
          const fileRef = this.storage.bucket().file(fileName);

          await fileRef.save(designBuffer!, {
            metadata: {
              contentType: this.getContentType(design.format),
              metadata: {
                firebaseStorageDownloadTokens: designId,
              },
            },
          });

          // Get download URL
          const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${
            this.storage.bucket().name
          }/o/${encodeURIComponent(fileName)}?alt=media&token=${designId}`;

          result.downloadUrl = downloadUrl;
          result.firebaseRef = fileName;

          // Save design metadata to Firestore
          const collection = options.firebaseCollection ?? 'canva_designs';
          const docRef = this.db.collection(collection).doc(designId);

          await docRef.set({
            ...result,
            tags: options.tags ?? [],
            userId: options.userId ?? 'anonymous',
            projectId: options.projectId ?? 'misc',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } catch (err) {
          console.error('Error saving design to Firebase:', err);
          error = `Failed to save design to Firebase: ${err instanceof Error ? err.message : 'Unknown error'}`;
          result.status = 'partial_success';
        }
      }

      if (error) {
        result.error = error;
      }

      return result;
    } catch (err) {
      console.error('Error processing exported design:', err);

      return {
        designId,
        metadata: result.metadata,
        timestamp,
        status: 'failed',
        error: `Failed to process design export: ${err instanceof Error ? err.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get content type based on file format
   * @param format - File format extension
   * @returns MIME type
   */
  private getContentType(format: string): string {
    const formatMap: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      pdf: 'application/pdf',
      svg: 'image/svg+xml',
      mp4: 'video/mp4',
      gif: 'image/gif',
    };

    return formatMap[format.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * Get a list of design exports for a user
   * @param userId - User ID to filter designs by
   * @param limit - Maximum number of designs to retrieve
   * @returns List of design exports
   */
  public async getUserDesigns(userId: string, limit: number = 50): Promise<ExportResult[]> {
    if (!this.db) {
      throw new Error('Firebase Firestore not initialized');
    }

    try {
      const snapshot = await this.db
        .collection('canva_designs')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map((doc) => doc.data() as ExportResult);
    } catch (err) {
      console.error('Error getting user designs:', err);
      throw err;
    }
  }

  /**
   * Get a list of design exports for a project
   * @param projectId - Project ID to filter designs by
   * @param limit - Maximum number of designs to retrieve
   * @returns List of design exports
   */
  public async getProjectDesigns(projectId: string, limit: number = 50): Promise<ExportResult[]> {
    if (!this.db) {
      throw new Error('Firebase Firestore not initialized');
    }

    try {
      const snapshot = await this.db
        .collection('canva_designs')
        .where('projectId', '==', projectId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map((doc) => doc.data() as ExportResult);
    } catch (err) {
      console.error('Error getting project designs:', err);
      throw err;
    }
  }

  /**
   * Delete a design export
   * @param designId - ID of the design to delete
   * @returns Success status
   */
  public async deleteDesign(designId: string): Promise<boolean> {
    if (!this.db || !this.storage) {
      throw new Error('Firebase not initialized');
    }

    try {
      // Get design data
      const docRef = this.db.collection('canva_designs').doc(designId);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new Error(`Design with ID ${designId} not found`);
      }

      const design = doc.data() as ExportResult;

      // Delete from Storage if reference exists
      if (design.firebaseRef) {
        await this.storage.bucket().file(design.firebaseRef).delete();
      }

      // Delete from Firestore
      await docRef.delete();

      // Delete local file if exists
      if (design.localPath && fs.existsSync(design.localPath)) {
        fs.unlinkSync(design.localPath);
      }

      return true;
    } catch (err) {
      console.error('Error deleting design:', err);
      throw err;
    }
  }
}

// Export a singleton instance for common use cases
export const canvaExportHandler = new CanvaExportHandler();
