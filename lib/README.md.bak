# Aixtiv CLI Library Components

This directory contains core library components used by the Aixtiv CLI.

## Code Generator

The Code Generator module provides template-based code generation for different programming languages and common programming tasks.

### Features

- Supports multiple languages (JavaScript, TypeScript, Python)
- Different template types (functions, classes, API endpoints, interfaces)
- Smart task parsing to detect intent and format
- Comprehensive error handling and logging
- Telemetry integration for tracking usage

### Usage

```javascript
const codeGenerator = require('./code-generator');

// Generate JavaScript code
const jsCode = codeGenerator.generateCode(
  'javascript',
  'Create a function to calculate the sum of two numbers'
);

// Generate TypeScript code
const tsCode = codeGenerator.generateCode('typescript', 'Create an interface called UserData');

// Generate Python code
const pyCode = codeGenerator.generateCode('python', 'Create a class called DataProcessor');

// Save to file
const fs = require('fs');
fs.writeFileSync('output.js', jsCode);
```

### Environment Variables

- `USE_LOCAL_GENERATOR`: Set to "true" to force using the local generator instead of the Claude API
- `CODE_GEN_LOG_LEVEL`: Set the logging level (default: "info")
- `NODE_ENV`: Set to "development" to see console logs (default: "production")

### Testing

You can run the test suite with:

```bash
node scripts/test-code-generator.js
```

### Architecture

The code generator consists of the following components:

1. **code-generator.js**: Main module that provides the generation logic
2. **code-generator-logger.js**: Specialized logger for tracking generation events
3. **commands/claude/code/generate.js**: CLI command integration with Claude API fallback

The generator first attempts to parse the task to determine the appropriate template type and extracts key information. It then fills in the template with the extracted data to generate the final code.

### Extending

To add support for a new language or template type:

1. Add a new language section in the `CODE_TEMPLATES` object
2. Implement appropriate parsing functions
3. Add test cases to the test suite

### Integration with Claude API

The code generator is designed to work both independently and as a fallback for the Claude API. When the API is unavailable, the generator can create basic implementations based on the task description.
