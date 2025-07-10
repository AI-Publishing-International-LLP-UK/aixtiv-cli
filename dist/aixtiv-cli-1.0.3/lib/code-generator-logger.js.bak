/**
 * Code Generator Logger
 * 
 * A specialized logger for the code generation functionality that helps track
 * generator usage, issues, and performance metrics.
 */

const chalk = require('chalk');
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const LOG_DIR = path.join(process.cwd(), 'logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Create the logger
const logger = winston.createLogger({
  level: process.env.CODE_GEN_LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'code-generator' },
  transports: [
    // Write logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...rest }) => {
          const meta = rest.meta ? JSON.stringify(rest.meta, null, 2) : '';
          return `${timestamp} ${level}: ${message} ${meta}`;
        })
      ),
      silent: process.env.NODE_ENV === 'production'
    }),
    // Write error logs to a file
    new winston.transports.File({ 
      filename: path.join(LOG_DIR, 'code-generator-error.log'), 
      level: 'error' 
    }),
    // Write all logs to a file
    new winston.transports.File({ 
      filename: path.join(LOG_DIR, 'code-generator.log') 
    })
  ]
});

/**
 * Log code generation event
 * 
 * @param {string} level - Log level (info, warn, error)
 * @param {string} message - Log message
 * @param {object} meta - Additional metadata
 */
function logCodeGeneration(level, message, meta = {}) {
  logger.log(level, message, { meta });

  // Also output to console for non-production environments
  if (process.env.NODE_ENV !== 'production' && level === 'error') {
    console.error(chalk.red(`Code Generator Error: ${message}`));
  }
}

module.exports = {
  logCodeGeneration,
  
  // Convenience methods
  info: (message, meta) => logCodeGeneration('info', message, meta),
  warn: (message, meta) => logCodeGeneration('warn', message, meta),
  error: (message, meta) => logCodeGeneration('error', message, meta),
  
  // Performance tracking
  startTimer: () => {
    const start = process.hrtime();
    return {
      end: (meta = {}) => {
        const [seconds, nanoseconds] = process.hrtime(start);
        const duration = seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds
        logCodeGeneration('info', 'Code generation completed', { 
          ...meta, 
          duration_ms: duration 
        });
        return duration;
      }
    };
  }
};