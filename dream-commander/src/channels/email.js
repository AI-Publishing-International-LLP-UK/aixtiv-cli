/**
 * Dream Commander - Email Channel
 *
 * Email channel implementation for handling incoming messages
 * through IMAP/SMTP protocols. Supports email parsing, attachment
 * handling, and automated responses.
 *
 * (c) 2025 Copyright AI Publishing International LLP All Rights Reserved.
 */

const { ImapFlow } = require('imapflow');
const nodemailer = require('nodemailer');
const simpleParser = require('mailparser').simpleParser;
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const messageProcessor = require('../core/message-processor');
const config = require('../../config/default.json').dreamCommander;

class EmailChannel {
  constructor() {
    this.initialized = false;
    this.polling = false;
    this.imapClient = null;
    this.smtpTransport = null;
    this.pollingInterval = null;
    this.secretManager = new SecretManagerServiceClient();
    this.projectId = process.env.GCP_PROJECT_ID || 'api-for-warp-drive';
    this.attachmentDir = path.join(__dirname, '../../storage/attachments');
    this.stats = {
      received: 0,
      sent: 0,
      errors: 0,
      attachments: 0,
    };
  }

  /**
   * Initialize the Email channel
   */
  async initialize() {
    if (this.initialized) return;

    console.log('Initializing Dream Commander Email Channel...');

    try {
      // Load credentials from Secret Manager
      await this.loadCredentials();

      // Initialize message processor
      await messageProcessor.initialize();

      // Create attachment directory if it doesn't exist
      if (!fs.existsSync(this.attachmentDir)) {
        fs.mkdirSync(this.attachmentDir, { recursive: true });
      }

      // Initialize IMAP client
      await this.initializeImapClient();

      // Initialize SMTP transport
      this.initializeSmtpTransport();

      // Start polling for new emails
      if (config.channels.email.inbound.polling) {
        this.startPolling();
      }

      this.initialized = true;
      console.log('Dream Commander Email Channel initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Email Channel:', error.message);
      throw error;
    }
  }

  /**
   * Load credentials from GCP Secret Manager
   */
  async loadCredentials() {
    console.log('Loading email credentials from GCP Secret Manager...');

    try {
      // Load IMAP credentials
      const [imapVersion] = await this.secretManager.accessSecretVersion({
        name: `projects/${this.projectId}/secrets/email-imap-credentials/versions/latest`,
      });

      // Load SMTP credentials
      const [smtpVersion] = await this.secretManager.accessSecretVersion({
        name: `projects/${this.projectId}/secrets/email-smtp-credentials/versions/latest`,
      });

      this.imapCredentials = JSON.parse(imapVersion.payload.data.toString());
      this.smtpCredentials = JSON.parse(smtpVersion.payload.data.toString());

      console.log('Email credentials loaded successfully');
    } catch (error) {
      console.error('Failed to load email credentials:', error.message);

      // Fallback to environment variables or default test credentials
      console.log('Using fallback/test credentials');

      this.imapCredentials = {
        host: process.env.EMAIL_IMAP_HOST || 'imap.example.com',
        port: parseInt(process.env.EMAIL_IMAP_PORT || '993'),
        secure: process.env.EMAIL_IMAP_SECURE !== 'false',
        auth: {
          user: process.env.EMAIL_IMAP_USER || 'user@example.com',
          pass: process.env.EMAIL_IMAP_PASS || 'password',
        },
      };

      this.smtpCredentials = {
        host: process.env.EMAIL_SMTP_HOST || 'smtp.example.com',
        port: parseInt(process.env.EMAIL_SMTP_PORT || '587'),
        secure: process.env.EMAIL_SMTP_SECURE !== 'false',
        auth: {
          user: process.env.EMAIL_SMTP_USER || 'user@example.com',
          pass: process.env.EMAIL_SMTP_PASS || 'password',
        },
      };
    }
  }

  /**
   * Initialize IMAP client
   */
  async initializeImapClient() {
    console.log('Initializing IMAP client...');

    this.imapClient = new ImapFlow({
      host: this.imapCredentials.host,
      port: this.imapCredentials.port,
      secure: this.imapCredentials.secure,
      auth: this.imapCredentials.auth,
      logger: false,
    });

    try {
      // Test connection
      await this.imapClient.connect();
      console.log('IMAP client connected successfully');
    } catch (error) {
      console.error('Failed to connect IMAP client:', error.message);
      throw error;
    }
  }

  /**
   * Initialize SMTP transport
   */
  initializeSmtpTransport() {
    console.log('Initializing SMTP transport...');

    this.smtpTransport = nodemailer.createTransport({
      host: this.smtpCredentials.host,
      port: this.smtpCredentials.port,
      secure: this.smtpCredentials.secure,
      auth: this.smtpCredentials.auth,
      pool: true,
      maxConnections: 5,
    });

    // Verify connection
    this.smtpTransport.verify((error) => {
      if (error) {
        console.error('Failed to initialize SMTP transport:', error.message);
      } else {
        console.log('SMTP transport initialized successfully');
      }
    });
  }

  /**
   * Start polling for new emails
   */
  startPolling() {
    if (this.polling) return;

    const interval = config.channels.email.inbound.polling * 1000; // Convert to milliseconds
    console.log(`Starting email polling with interval: ${interval}ms`);

    this.polling = true;
    this.pollingInterval = setInterval(async () => {
      try {
        await this.checkNewEmails();
      } catch (error) {
        console.error('Error checking new emails:', error.message);
      }
    }, interval);
  }

  /**
   * Stop polling for new emails
   */
  stopPolling() {
    if (!this.polling) return;

    console.log('Stopping email polling');

    clearInterval(this.pollingInterval);
    this.polling = false;
  }

  /**
   * Check for new emails
   */
  async checkNewEmails() {
    if (!this.imapClient || !this.imapClient.usable) {
      await this.initializeImapClient();
    }

    console.log('Checking for new emails...');

    try {
      // Select inbox
      const lock = await this.imapClient.getMailboxLock('INBOX');

      try {
        // Search for unseen messages
        const messages = await this.imapClient.search({ unseen: true });

        if (messages.length > 0) {
          console.log(`Found ${messages.length} new emails`);

          // Process each message
          for (const seq of messages) {
            try {
              // Fetch message
              const message = await this.imapClient.fetchOne(seq, { source: true });

              // Parse message
              const parsed = await simpleParser(message.source);

              // Process email
              await this.processEmail(parsed);

              // Mark as seen
              await this.imapClient.messageFlagsAdd(seq, ['\\Seen']);
            } catch (messageError) {
              console.error('Error processing email:', messageError.message);
              this.stats.errors++;
            }
          }
        } else {
          console.log('No new emails found');
        }
      } finally {
        // Release lock
        lock.release();
      }
    } catch (error) {
      console.error('Error checking emails:', error.message);
      this.stats.errors++;
      throw error;
    }
  }

  /**
   * Process an email message
   * @param {Object} parsedEmail - Parsed email object
   */
  async processEmail(parsedEmail) {
    console.log(`Processing email: ${parsedEmail.subject}`);
    this.stats.received++;

    try {
      // Extract attachments if any
      const attachments = [];

      if (parsedEmail.attachments && parsedEmail.attachments.length > 0) {
        for (const attachment of parsedEmail.attachments) {
          // Skip attachments that are too large
          const maxSize = config.channels.email.inbound.maxAttachmentSize || '25mb';
          const maxSizeBytes = parseSize(maxSize);

          if (attachment.size > maxSizeBytes) {
            console.warn(
              `Skipping large attachment: ${attachment.filename} (${attachment.size} bytes)`
            );
            continue;
          }

          // Save attachment
          const attachmentId = uuidv4();
          const filename = `${attachmentId}-${attachment.filename}`;
          const filePath = path.join(this.attachmentDir, filename);

          fs.writeFileSync(filePath, attachment.content);

          attachments.push({
            id: attachmentId,
            filename: attachment.filename,
            contentType: attachment.contentType,
            size: attachment.size,
            path: filePath,
          });

          this.stats.attachments++;
        }
      }

      // Create normalized message object
      const message = {
        id: uuidv4(),
        channel: 'email',
        content: {
          subject: parsedEmail.subject || 'No Subject',
          body: parsedEmail.text || parsedEmail.html || '',
          html: parsedEmail.html || null,
        },
        timestamp: parsedEmail.date.toISOString(),
        sender: {
          email: parsedEmail.from.value[0].address,
          name: parsedEmail.from.value[0].name || null,
          replyTo: parsedEmail.replyTo?.value?.[0]?.address || null,
        },
        metadata: {
          priority: parsedEmail.priority || 'normal',
          attachments: attachments,
          cc: parsedEmail.cc?.value.map((cc) => cc.address) || [],
          messageId: parsedEmail.messageId,
        },
      };

      // Submit message to processor
      messageProcessor.emit('message:received', message);

      // Send acknowledgment
      if (config.channels.email.outbound.sendAcknowledgment) {
        await this.sendAcknowledgment(message);
      }
    } catch (error) {
      console.error('Error processing email:', error.message);
      this.stats.errors++;
      throw error;
    }
  }

  /**
   * Send acknowledgment email
   * @param {Object} message - Processed message
   */
  async sendAcknowledgment(message) {
    try {
      const subject = `Re: ${message.content.subject}`;
      const text = `Your email has been received and is being processed. Reference ID: ${message.id}`;

      await this.sendEmail({
        to: message.sender.email,
        subject,
        text,
        replyTo: this.smtpCredentials.auth.user,
        inReplyTo: message.metadata.messageId,
      });

      console.log(`Acknowledgment sent to ${message.sender.email}`);
    } catch (error) {
      console.error('Error sending acknowledgment:', error.message);
    }
  }

  /**
   * Send an email
   * @param {Object} options - Email options
   * @returns {Object} - Sending result
   */
  async sendEmail(options) {
    if (!this.smtpTransport) {
      throw new Error('SMTP transport not initialized');
    }

    try {
      const result = await this.smtpTransport.sendMail({
        from: options.from || this.smtpCredentials.auth.user,
        to: options.to,
        cc: options.cc,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
        replyTo: options.replyTo,
        inReplyTo: options.inReplyTo,
        references: options.references,
      });

      this.stats.sent++;
      return result;
    } catch (error) {
      console.error('Error sending email:', error.message);
      this.stats.errors++;

      // Retry if configured
      const maxRetries = config.channels.email.outbound.maxRetries || 3;
      const retryDelay = config.channels.email.outbound.retryDelay || 1000;

      if (options.retryCount < maxRetries) {
        console.log(
          `Retrying send email (${options.retryCount + 1}/${maxRetries}) in ${retryDelay}ms`
        );

        return new Promise((resolve, reject) => {
          setTimeout(async () => {
            try {
              const result = await this.sendEmail({
                ...options,
                retryCount: (options.retryCount || 0) + 1,
              });

              resolve(result);
            } catch (retryError) {
              reject(retryError);
            }
          }, retryDelay);
        });
      }

      throw error;
    }
  }

  /**
   * Get current Email channel statistics
   * @returns {Object} - Channel statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Reset Email channel statistics
   */
  resetStats() {
    this.stats = {
      received: 0,
      sent: 0,
      errors: 0,
      attachments: 0,
    };
  }

  /**
   * Shutdown the Email channel
   */
  async shutdown() {
    console.log('Shutting down Email channel...');

    this.stopPolling();

    if (this.imapClient && this.imapClient.usable) {
      await this.imapClient.logout();
    }

    if (this.smtpTransport) {
      this.smtpTransport.close();
    }

    console.log('Email channel shut down');
  }
}

/**
 * Parse size string (like '10mb') to bytes
 * @param {string} size - Size string
 * @returns {number} - Size in bytes
 */
function parseSize(size) {
  const units = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };

  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([a-z]+)$/);

  if (!match) {
    return parseInt(size, 10) || 0;
  }

  const value = parseFloat(match[1]);
  const unit = match[2];

  if (!units[unit]) {
    return value;
  }

  return Math.floor(value * units[unit]);
}

module.exports = new EmailChannel();
