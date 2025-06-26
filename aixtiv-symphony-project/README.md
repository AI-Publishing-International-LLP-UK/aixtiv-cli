# aixtiv-symphony-project

## Overview

This is an Aixtiv Symphony integration project created with aixtiv-cli. It provides a foundation for building applications that leverage the Aixtiv Symphony platform and SallyPort security services.

## Setup

1. Copy `.env.example` to `.env` and update with your configuration:

   ```bash
   cp .env.example .env
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Run the CLI:
   ```bash
   npm start
   ```

## Configuration

Configuration files are stored in the `config/` directory. The default configuration is in `config/default.json`.

Environment-specific settings should be configured in the `.env` file. See `.env.example` for reference.

### SallyPort Security Configuration

This project uses SallyPort for authentication and security. Configure your SallyPort API key in the `.env` file:

```
SALLEYPORT_API_KEY=your_api_key_here
SALLEYPORT_ENDPOINT=https://api.salleyport.aixtiv.io/v1
```

### Claude AI Integration

For AI-powered features, configure Claude API access in the `.env` file:

```
CLAUDE_API_KEY=your_claude_api_key_here
CLAUDE_API_ENDPOINT=https://api.claude.ai/v1
```

## Project Structure

- `src/`: Source code
  - `commands/`: CLI command implementations
  - `handlers/`: Business logic handlers
  - `utils/`: Utility functions
- `config/`: Configuration files
- `assets/`: Static assets
- `docs/`: Documentation

## License

UNLICENSED
