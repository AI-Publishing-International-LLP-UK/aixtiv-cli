#!/bin/bash

# Script to convert TypeScript (.ts) files to JavaScript (.js)
# This is for files that can't be executed directly

# Function to show usage information
show_usage() {
    echo "Usage: $0 <typescript-file.ts>"
    echo ""
    echo "This script helps you handle TypeScript files that you're trying to execute directly."
    echo "TypeScript files (.ts) cannot be executed directly in the shell."
    echo ""
    echo "The script can:"
    echo "  1. Extract the contents to view the code"
    echo "  2. Try to convert it to JavaScript if you have TypeScript installed"
    echo ""
}

# Check if a file was provided
if [ $# -eq 0 ]; then
    show_usage
    exit 1
fi

TS_FILE="$1"

# Check if the file exists
if [ ! -f "$TS_FILE" ]; then
    echo "Error: File '$TS_FILE' does not exist"
    exit 1
fi

# Check if it's a TypeScript file
if [[ ! "$TS_FILE" == *.ts ]]; then
    echo "Error: File '$TS_FILE' does not have a .ts extension"
    exit 1
fi

# Output file with .js extension
JS_FILE="${TS_FILE%.*}.js"

echo "============================================================"
echo "TypeScript File Handler"
echo "============================================================"
echo "File: $TS_FILE"
echo ""
echo "TypeScript (.ts) files cannot be executed directly in the shell."
echo "They need to be compiled to JavaScript (.js) first."
echo ""
echo "Options:"
echo "  1. View the file contents"
echo "  2. Convert to JavaScript (requires TypeScript)"
echo "  3. Exit"
echo ""
read -p "Select an option (1-3): " option

case $option in
    1)
        echo ""
        echo "============================================================"
        echo "Contents of $TS_FILE:"
        echo "============================================================"
        cat "$TS_FILE"
        ;;
    2)
        echo ""
        echo "Checking for TypeScript compiler..."
        
        # Check if TypeScript is installed
        if ! command -v tsc &> /dev/null; then
            echo "TypeScript compiler (tsc) is not installed."
            echo ""
            read -p "Would you like to install TypeScript globally? (y/n): " install_ts
            
            if [[ $install_ts == "y" || $install_ts == "Y" ]]; then
                echo "Installing TypeScript..."
                npm install -g typescript
                
                if [ $? -ne 0 ]; then
                    echo "Failed to install TypeScript. Please try manually:"
                    echo "  npm install -g typescript"
                    exit 1
                fi
                
                echo "TypeScript installed successfully."
            else
                echo "Cannot convert without TypeScript. Exiting."
                exit 1
            fi
        else
            echo "TypeScript compiler found."
        fi
        
        echo ""
        echo "Attempting to convert to JavaScript..."
        
        # Create a temporary directory
        TMP_DIR=$(mktemp -d)
        cp "$TS_FILE" "$TMP_DIR/"
        cd "$TMP_DIR"
        
        # Create a lenient tsconfig.json
        cat > tsconfig.json << 'TSCONFIG'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noImplicitAny": false,
    "allowJs": true,
    "checkJs": false,
    "allowSyntheticDefaultImports": true,
    "noEmitOnError": false,
    "outDir": "./dist"
  }
}
TSCONFIG
        
        # Attempt to compile
        tsc --allowJs --checkJs false --noEmit false $(basename "$TS_FILE")
        
        if [ $? -eq 0 ]; then
            # If compilation succeeded, copy the JS file back
            if [ -f "$(basename "${TS_FILE%.*}.js")" ]; then
                cp "$(basename "${TS_FILE%.*}.js")" "$JS_FILE"
                echo "Conversion successful!"
                echo "JavaScript file created: $JS_FILE"
                echo ""
                echo "You can run it with: node $JS_FILE"
            else
                echo "Compilation appeared to succeed, but no JavaScript file was created."
            fi
        else
            echo ""
            echo "Compilation failed with errors."
            echo "This file likely has dependencies that need to be installed."
            echo ""
            echo "TypeScript files are meant to be part of a project structure,"
            echo "not executed directly as shell scripts."
            echo ""
            echo "If you need to examine the file, use option 1 to view its contents."
        fi
        
        # Clean up
        cd - > /dev/null
        rm -rf "$TMP_DIR"
        ;;
    3)
        echo "Exiting."
        exit 0
        ;;
    *)
        echo "Invalid option. Exiting."
        exit 1
        ;;
esac

echo ""
echo "============================================================"
echo "Important Note:"
echo "============================================================"
echo "TypeScript files (.ts) are not shell scripts and cannot be"
echo "executed directly with the shell."
echo ""
echo "They are meant to be:"
echo "1. Part of a TypeScript project with proper dependencies"
echo "2. Compiled to JavaScript before execution"
echo "3. Run with Node.js (not the shell)"
echo ""
echo "If you need to run this code, you should set up a proper"
echo "TypeScript project with 'npm init' and 'npm install typescript'"
echo "and then compile and run the code with appropriate tools."
