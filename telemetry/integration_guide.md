# Telemetry Integration Guide

This guide provides instructions on how to integrate the telemetry package into your Aixtiv CLI application. The Go telemetry package has been implemented and can now be bridged to your Node.js application.

## Quick Integration with Helper Scripts

For faster integration, we've provided helper scripts in the `scripts/telemetry` directory:

1. **Integrate Telemetry into Main CLI**:
   ```bash
   node scripts/telemetry/integrate.js
   ```

2. **Add Knowledge Access Tracking** to specific command files:
   ```bash
   node scripts/telemetry/add-knowledge-tracking.js commands/claude/status.js
   ```

3. **Test Telemetry** to verify it's working:
   ```bash
   node scripts/telemetry/test-telemetry.js
   ```

These scripts automate most of the integration process. For details on what they do, see the [scripts README](../scripts/telemetry/README.md).

## Manual Integration Steps

If you prefer to integrate telemetry manually or need more control over the process, follow these steps:

### Step 1: Build the Telemetry Agent

You've already completed this step. The telemetry agent binary is built and available at `telemetry/bin/telemetry-agent`.

### Step 2: Create Node.js Wrapper

The Node.js wrapper has been created at `lib/telemetry/index.js`. This file provides a JavaScript API for interacting with the Go telemetry package.

### Step 3: Integrate Telemetry into Main Application

To integrate telemetry into your main application, follow these steps:

1. **Initialize telemetry early in application startup**

   Add the following code near the top of your `bin/aixtiv.js` file, after the initial imports but before starting command execution:

   ```javascript
   // Initialize telemetry early
   const telemetry = require('../lib/telemetry');

   // Initialize telemetry and handle any initialization errors
   (async () => {
     try {
       const telemetryEnabled = await telemetry.init();
       if (telemetryEnabled) {
         console.log(chalk.dim('Telemetry initialized'));
       }
     } catch (error) {
       console.error(chalk.dim(`Telemetry initialization failed: ${error.message}`));
     }
     
     // Set up graceful shutdown for telemetry
     process.on('exit', async () => {
       await telemetry.shutdown();
     });
     
     // Handle unhandled errors for telemetry recording
     process.on('uncaughtException', async (error) => {
       telemetry.recordError('uncaught', error);
       console.error(chalk.red('Uncaught exception:'), error);
       await telemetry.shutdown();
       process.exit(1);
     });
   })();
   ```

2. **Create a telemetry middleware wrapper**

   Add the following function to wrap command handlers with telemetry:

   ```javascript
   // Add telemetry middleware to measure command execution time
   const withTelemetry = (command, handler) => {
     return (...args) => {
       const startTime = Date.now();
       telemetry.recordRequest(command);
       
       try {
         // Execute the original handler
         const result = handler(...args);
         
         // If the result is a promise, handle it with telemetry
         if (result && typeof result.then === 'function') {
           return result
             .then((value) => {
               const duration = Date.now() - startTime;
               telemetry.recordDuration(command, duration);
               return value;
             })
             .catch((error) => {
               const duration = Date.now() - startTime;
               telemetry.recordError(command, error);
               telemetry.recordDuration(command, duration);
               throw error;
             });
         }
         
         // For synchronous handlers
         const duration = Date.now() - startTime;
         telemetry.recordDuration(command, duration);
         return result;
       } catch (error) {
         const duration = Date.now() - startTime;
         telemetry.recordError(command, error);
         telemetry.recordDuration(command, duration);
         throw error;
       }
     };
   };
   ```

3. **Wrap command handlers with telemetry**

   For each command in your application, modify the action handler to use the telemetry wrapper:

   ```javascript
   // Before:
   program
     .command('command-name')
     .description('Command description')
     .action(commandHandler);

   // After:
   program
     .command('command-name')
     .description('Command description')
     .action(withTelemetry('command-name', commandHandler));
   ```

## Step 4: Add Knowledge Access Tracking

In commands that access knowledge stores or databases, add telemetry to track these accesses. For example:

```javascript
// Inside a command that accesses Firebase
async function fetchData(collection) {
  telemetry.recordKnowledgeAccess('firebase');
  // ... existing code to fetch data
}
```

## Step 5: Test the Integration

Test the integration by running various commands and checking that telemetry is being recorded. You can use the provided test script:

```bash
node scripts/telemetry/test-telemetry.js
```

## Configuration Options

You can configure telemetry through environment variables:

- `AIXTIV_TELEMETRY_ENABLED=false` - Disable telemetry collection
- `AIXTIV_TELEMETRY_VERBOSE=true` - Enable verbose logging for telemetry

## Troubleshooting

If you encounter issues with the integration:

1. **Check Logs**: Look for telemetry log files in the system temp directory
2. **Enable Verbose Logging**: Set `AIXTIV_TELEMETRY_VERBOSE=true`
3. **Restore Backups**: If needed, restore from backup files (e.g., `bin/aixtiv.js.bak`)
4. **Verify Binary**: Make sure the telemetry agent binary is built correctly:
   ```bash
   cd telemetry && ./build.sh
   ```

## Additional Resources

For more information on OpenTelemetry, see the following resources:
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Go OpenTelemetry SDK](https://github.com/open-telemetry/opentelemetry-go)
