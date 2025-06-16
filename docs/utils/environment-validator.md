# Environment Variable Validator

The Environment Variable Validator is a utility that checks for the presence and validity of critical environment variables required by the Aixtiv CLI. This helps ensure that all necessary configurations are in place before running the application.

## Overview

The validator performs the following checks:

- **Presence**: Verifies that all required environment variables are set
- **Format**: Validates that values match expected formats (API keys, URLs, etc.)
- **Cross-validation**: Ensures related variables are compatible with each other
- **Region Compliance**: Checks that configurations align with the us-west1 region

## Required Environment Variables

| Variable | Type | Description |
|----------|------|-------------|
| `ANTHROPIC_API_KEY` | Critical | API key for Claude services |
| `CLAUDE_API_ENDPOINT` | Critical | Endpoint URL for Claude API |
| `FIREBASE_CONFIG` | Critical | Firebase configuration JSON |
| `SALLYPORT_AUTH_TOKEN` | Critical | Authentication token for SallyPort |
| `AGENT_TRACKING_DB` | Warning | Path to agent tracking database |

## Usage

### Command Line

Run the validation check from the command line:

```bash
npm run validate-env
```

Or directly with node:

```bash
node lib/utils/envValidator.js
```

### Programmatic Usage

Import and use the validator in your code:

```javascript
const { validateEnvironment } = require('./lib/utils/envValidator');

// Run validation with console output
const results = validateEnvironment(true);

// Check if validation passed
if (results.isValid) {
  console.log('All environment variables are valid!');
} else {
  console.log(`Failed with ${results.criticalErrors} critical errors and ${results.warnings} warnings`);
}
```

## Integration with ASOOS

This validator supports the Aixtiv Symphony Orchestrating Operating System by:

1. Logging validation events to the Flight Memory System (FMS)
2. Supporting the Wing agent orchestration system 
3. Ensuring cross-service compatibility
4. Maintaining security standards for Dr. Grant Cybersecurity

## Troubleshooting

If validation fails, check:

1. That all required environment variables are set in your `.env` file
2. That API keys have the correct format and length
3. That URLs include the correct protocol (`https://`)
4. That JSON configurations are properly formatted

---

For SallyPort Security Management v1.0.1  
Aixtiv Symphony - us-west1 Region
