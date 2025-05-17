#!/usr/bin/env node
/**
 * Agent Log Cleanup Utility
 * Cleans up old agent tracking logs
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { program } = require('commander');

// Parse command line arguments
program
  .option('--days <days>', 'Number of days of logs to keep', '30')
  .option('--dry-run', 'Show what would be deleted without actually deleting')
  .parse(process.argv);

const options = program.opts();
const daysToKeep = parseInt(options.days, 10);
const dryRun = options.dryRun || false;

// Setup paths
const CONFIG_DIR = path.join(os.homedir(), '.aixtiv');
const LOG_DIR = path.join(CONFIG_DIR, 'logs');
const REPORT_DIR = path.join(CONFIG_DIR, 'reports');

// Calculate cutoff date
const cutoffDate = new Date();
cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

// Delete old files from a directory
function cleanupDirectory(directory, filePattern) {
  if (!fs.existsSync(directory)) {
    console.log(`Directory ${directory} does not exist, skipping.`);
    return 0;
  }
  
  let deletedCount = 0;
  const files = fs.readdirSync(directory)
    .filter(f => filePattern.test(f))
    .map(f => ({
      name: f,
      path: path.join(directory, f),
      date: extractDateFromFilename(f)
    }))
    .filter(f => f.date && f.date < cutoffDate);
  
  for (const file of files) {
    if (dryRun) {
      console.log(`Would delete: ${file.path}`);
    } else {
      try {
        fs.unlinkSync(file.path);
        console.log(`Deleted: ${file.path}`);
        deletedCount++;
      } catch (error) {
        console.error(`Error deleting ${file.path}:`, error.message);
      }
    }
  }
  
  return deletedCount;
}

// Extract date from filename
function extractDateFromFilename(filename) {
  const match = filename.match(/.*?(\d{4}-\d{2}-\d{2})/);
  if (match) {
    return new Date(match[1]);
  }
  return null;
}

// Main function
function main() {
  console.log(`Cleaning up agent logs older than ${daysToKeep} days...`);
  
  if (dryRun) {
    console.log('Dry run mode: no files will be deleted');
  }
  
  // Cleanup log files
  const logFilesDeleted = cleanupDirectory(LOG_DIR, /agent-actions-.*\.log/);
  
  // Cleanup report files
  const reportFilesDeleted = cleanupDirectory(REPORT_DIR, /agent-summary-.*\.txt/);
  
  console.log(`Cleanup complete: ${logFilesDeleted} log files and ${reportFilesDeleted} report files removed.`);
}

main();
