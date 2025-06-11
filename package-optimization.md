# Figlet Package Removal Plan

## Overview

This document outlines the steps to remove the `figlet` package (7.1MB) from the build while maintaining functionality. The figlet package is used for generating ASCII art text and is already available elsewhere in the system.

## Current Size Impact

- figlet package size: **7.1MB**
- Percentage of node_modules: ~2.4% of total node_modules size (298MB)

## Removal Steps

### 1. Update package.json

Remove the figlet dependency from package.json:

```json
// Before
"dependencies": {
  // other dependencies...
  "figlet": "^1.8.0",
  // other dependencies...
}

// After
"dependencies": {
  // other dependencies...
  // figlet entry removed
  // other dependencies...
}
```

### 2. Identify Usage in Codebase

Before making code changes, identify all files that use figlet:

```bash
grep -r "figlet" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" .
```

Likely locations:
- CLI startup banners
- Help screens
- Welcome messages
- Dashboard headers

### 3. Code Adjustments

#### Option A: Use System Figlet (Recommended)

If figlet is already available on the system, modify code to use the system version:

```javascript
// Before
const figlet = require('figlet');
const banner = figlet.textSync('AIXTIV CLI');

// After
const { execSync } = require('child_process');

function generateBanner(text) {
  try {
    return execSync(`figlet "${text}"`).toString();
  } catch (error) {
    // Fallback to simple text if figlet command not available
    return `
    +-----------------------+
    |      ${text}          |
    +-----------------------+
    `;
  }
}

const banner = generateBanner('AIXTIV CLI');
```

#### Option B: Simplify Banner Display

Replace figlet with simple text-based banners:

```javascript
// Before
const figlet = require('figlet');
const banner = figlet.textSync('AIXTIV CLI');

// After
const banner = `
+----------------------------+
|                            |
|        AIXTIV CLI          |
|                            |
+----------------------------+
`;
```

#### Option C: Pre-Generate ASCII Art

Pre-generate the ASCII art and save it as static content:

```javascript
// Before
const figlet = require('figlet');
const banner = figlet.textSync('AIXTIV CLI');

// After
const banner = `
   _    _____  _______ _____   __   _____ _     ___ 
  / \  |_ _\ \/ /_   _|_ _\ \ / /  / ____| |   |_ _|
 / _ \  | | \  /  | |  | | \ V /  | |    | |    | | 
/ ___ \ | | /  \  | |  | |  | |   | |___ | |___ | | 
/_/   \_\___/_/\_\ |_| |___| |_|    \____|_____|___|
`;
```

### 4. Testing

After removing figlet and adjusting code:

1. Test all CLI commands that previously displayed ASCII art
2. Verify that all UI components display correctly
3. Check for any runtime errors related to missing figlet dependency

### 5. Update Dockerfile

Update the .dockerignore file to explicitly exclude figlet:

```
# Add to .dockerignore
node_modules/figlet/
```

## Expected Savings

- Direct size reduction: **7.1MB**
- Potential additional savings from reduced dependency tree
- Estimated total savings: **7-8MB**

## Conclusion

Removing the figlet package is a straightforward optimization that will reduce the build size by approximately 7.1MB. By using one of the alternative approaches, the application will maintain its visual identity while achieving size savings.

