# 🚀 Aixtiv Sample CLI

A simple sample CLI application for Aixtiv Symphony Orchestration System.

## Features

- 💻 Modern, easy-to-use command-line interface
- 🎨 Colorful terminal output
- 📝 Built with Commander.js for robust command parsing
- 🎭 ASCII art banner for visual appeal

## Installation

Clone this repository and install dependencies:

```bash
# Navigate to the sample CLI directory
cd sample-cli

# Install dependencies
npm install

# Create a global symlink (optional)
npm link
```

## Usage

### Basic Commands

```bash
# Show help
aixtiv-sample --help

# Hello command
aixtiv-sample hello
aixtiv-sample hello --name "Your Name"

# Version information
aixtiv-sample version
aixtiv-sample version --verbose
```

## Project Structure

```
sample-cli/
├── bin/
│   └── index.js            # Main entry point
├── commands/
│   ├── hello.js            # Hello command handler
│   └── version.js          # Version command handler
├── package.json            # Project metadata and dependencies
└── README.md               # This file
```

## Dependencies

- `commander` - Command-line interface solution
- `chalk` - Terminal string styling
- `figlet` - ASCII art from text

## Development

To extend this CLI with new commands:

1. Create a new command file in the `commands/` directory
2. Import the command in `bin/index.js`
3. Register the command with the Commander.js program

Example new command in `commands/mycommand.js`:

```javascript
const chalk = require('chalk');

function myCommand(options) {
  console.log(chalk.green('This is my new command!'));
}

module.exports = myCommand;
```

Then in `bin/index.js`:

```javascript
// Import your new command
const myCommand = require('../commands/mycommand');

// Register your command
program.command('mycommand').description('My custom command').action(myCommand);
```

## License

This sample CLI is provided for educational purposes as part of the Aixtiv Symphony ecosystem.
