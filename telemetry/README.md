# Telemetry Package

This package provides telemetry functionality for the aixtiv-cli application using OpenTelemetry.

## Features

- Request counting
- Error tracking
- Request duration measurement
- Knowledge access tracking

## Integration with Aixtiv CLI

The telemetry package has been set up as follows:

1. **Go Package Implementation**: The core telemetry functionality is implemented in Go with OpenTelemetry.
2. **Command-line Interface**: A command-line tool (`bin/telemetry-agent`) provides a bridge between Node.js and Go.
3. **Node.js Wrapper**: A JavaScript wrapper (`lib/telemetry/index.js`) makes it easy to use from the Aixtiv CLI.

To complete the integration, follow the instructions in the `integration_guide.md` file.

## Usage

```go
// From Go code:
telemetry := telemetry.NewTelemetry("service-name")
ctx := context.Background()
telemetry.RecordRequest(ctx)
telemetry.RecordError(ctx)
telemetry.RecordKnowledgeAccess(ctx)
telemetry.RecordDuration(ctx, durationMs)
```

```javascript
// From Node.js code:
const telemetry = require('../lib/telemetry');

// Initialize telemetry
await telemetry.init();

// Record metrics
telemetry.recordRequest('command-name');
telemetry.recordError('command-name', error);
telemetry.recordKnowledgeAccess('knowledge-type');
telemetry.recordDuration('command-name', durationMs);

// Shutdown telemetry when done
await telemetry.shutdown();
```

## Provider Setup

To initialize OpenTelemetry providers from Go:

```go
// Create a new telemetry provider
provider, err := telemetry.NewProvider()
if err != nil {
    log.Fatalf("Failed to create telemetry provider: %v", err)
}

// Ensure the provider is properly shut down on application exit
ctx := context.Background()
defer provider.Shutdown(ctx)
```

## Configuration

The telemetry package can be configured with environment variables:

- `AIXTIV_TELEMETRY_ENABLED=false` - Disable telemetry collection
- `AIXTIV_TELEMETRY_VERBOSE=true` - Enable verbose logging for telemetry

## Files in this Package

- `telemetry.go` - Core telemetry implementation
- `provider.go` - Provider for managing telemetry resources
- `cmd/main.go` - Command-line interface for Node.js integration
- `bin/telemetry-agent` - Compiled binary for the command-line interface
- `integration_guide.md` - Guide for integrating telemetry into Aixtiv CLI
- `command_example.md` - Example of adding telemetry to a command

## Directory Structure

```
telemetry/
├── bin/
│   └── telemetry-agent   # Compiled binary
├── cmd/
│   └── main.go           # Command-line interface source
├── telemetry.go          # Core telemetry implementation
├── provider.go           # Provider implementation
├── telemetry_test.go     # Tests
├── go.mod                # Go module definition
├── go.sum                # Go module checksums
├── README.md             # This file
├── integration_guide.md  # Integration instructions
└── command_example.md    # Command integration example
```

## Related Node.js Files

```
lib/telemetry/
└── index.js              # Node.js wrapper for telemetry
```
