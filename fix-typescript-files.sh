#!/bin/bash

# Script to fix and compile TypeScript files

# Check if TypeScript is installed globally
if ! command -v tsc &> /dev/null; then
    echo "TypeScript is not installed. Installing TypeScript globally..."
    npm install -g typescript
    if [ $? -ne 0 ]; then
        echo "Failed to install TypeScript. Please try manually with 'npm install -g typescript'"
        exit 1
    fi
    echo "TypeScript installed successfully."
fi

# Function to fix and compile a TypeScript file
fix_and_compile_ts_file() {
    local file_path="$1"
    local file_name=$(basename "$file_path")
    local dir_name=$(dirname "$file_path")
    local js_output="${file_path%.*}.js"

    echo "========================================"
    echo "Processing file: $file_path"
    echo "========================================"

    # Create a temporary directory for compilation
    tmp_dir=$(mktemp -d)
    cp "$file_path" "$tmp_dir/$file_name"

    # Navigate to the temporary directory
    cd "$tmp_dir"

    # Initialize a TypeScript project if needed
    if [ ! -f "tsconfig.json" ]; then
        echo "Creating TypeScript configuration..."
        cat > tsconfig.json << 'TSCONFIG'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "esModuleInterop": true,
    "strict": false,
    "skipLibCheck": true,
    "outDir": "./dist"
  },
  "include": ["./*.ts"],
  "exclude": ["node_modules"]
}
TSCONFIG
    fi

    # Install required dependencies if they don't exist
    if grep -q "firebase-admin" "$file_name" && [ ! -d "node_modules/firebase-admin" ]; then
        echo "Installing firebase-admin dependency..."
        npm install firebase-admin
    fi

    if grep -q "@google-cloud/storage" "$file_name" && [ ! -d "node_modules/@google-cloud/storage" ]; then
        echo "Installing @google-cloud/storage dependency..."
        npm install @google-cloud/storage
    fi

    if grep -q "@pinecone-database/pinecone" "$file_name" && [ ! -d "node_modules/@pinecone-database/pinecone" ]; then
        echo "Installing @pinecone-database/pinecone dependency..."
        npm install @pinecone-database/pinecone
    fi

    # Compile the TypeScript file
    echo "Compiling TypeScript file..."
    tsc "$file_name"
    
    if [ $? -eq 0 ]; then
        echo "Compilation successful!"
        # Copy the compiled JS file back to the original directory
        if [ -f "dist/${file_name%.*}.js" ]; then
            cp "dist/${file_name%.*}.js" "$js_output"
            echo "Compiled JavaScript file saved to: $js_output"
        else
            echo "Warning: Compiled JavaScript file not found"
        fi
    else
        echo "Error: TypeScript compilation failed"
    fi

    # Return to the original directory
    cd - > /dev/null
}

# Process files provided as arguments
if [ $# -eq 0 ]; then
    echo "Usage: $0 <typescript-file1.ts> [typescript-file2.ts ...]"
    echo "This script will fix syntax issues in TypeScript files and compile them to JavaScript."
    exit 1
fi

for file in "$@"; do
    if [ -f "$file" ] && [[ "$file" == *.ts ]]; then
        fix_and_compile_ts_file "$file"
    else
        echo "Error: '$file' is not a valid TypeScript file"
    fi
done

echo "All files processed. Remember that TypeScript files cannot be directly executed."
echo "Use 'node <filename.js>' to run the compiled JavaScript files."
