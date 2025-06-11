# Telemetry Integration Scripts

This directory contains scripts to help integrate the telemetry package into the Aixtiv CLI.

## Available Scripts

1. **integrate.js** - Integrates telemetry into the main CLI application
   - Adds telemetry initialization to the main application
   - Wraps all command handlers with telemetry middleware
   - Creates backups of modified files

2. **add-knowledge-tracking.js** - Adds knowledge access tracking to command files
   - Identifies appropriate places to add telemetry calls
   - Adds telemetry import if needed
   - Automatically determines the access type based on the command

3. **test-telemetry.js** - Tests if telemetry is working correctly
   - Records sample metrics
   - Verifies the telemetry interface is working

## Usage

### Integrate Telemetry into Main CLI

```bash
node scripts/telemetry/integrate.js
```

This will:
- Backup the main CLI file
- Add telemetry initialization code
- Add a telemetry wrapper for all commands
- Wrap all action handlers with the telemetry wrapper

### Add Knowledge Access Tracking to a Command

```bash
node scripts/telemetry/add-knowledge-tracking.js <command-file-path>
```

Example:
```bash
node scripts/telemetry/add-knowledge-tracking.js commands/claude/status.js
```

This will:
- Backup the command file
- Add telemetry import if needed
- Add knowledge access tracking at appropriate points

### Test Telemetry

```bash
node scripts/telemetry/test-telemetry.js
```

This will:
- Initialize telemetry
- Record sample metrics
- Log the results

## Troubleshooting

If you encounter issues with the integration:

1. Restore from backup:
   ```bash
   cp bin/aixtiv.js.bak bin/aixtiv.js
   ```

2. Check the telemetry logs:
   - Look for log files in the system temp directory
   - Enable verbose logging: `AIXTIV_TELEMETRY_VERBOSE=true`

3. Verify the telemetry agent binary is built:
   ```bash
   cd telemetry && ./build.sh
   ```
