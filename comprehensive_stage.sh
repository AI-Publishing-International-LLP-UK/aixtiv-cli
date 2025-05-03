#!/bin/bash

# Function to add files with a specific extension from a directory
add_files() {
  local dir=$1
  local ext=$2
  if [ -d "$dir" ]; then
    echo "Adding $ext files from $dir"
    find "$dir" -name "*.$ext" -type f | xargs git add 2>/dev/null || true
  fi
}

# Function to add an entire directory
add_dir() {
  local dir=$1
  if [ -d "$dir" ]; then
    echo "Adding directory $dir"
    git add "$dir" 2>/dev/null || true
  fi
}

# Function to add a specific file
add_file() {
  local file=$1
  if [ -f "$file" ]; then
    echo "Adding file $file"
    git add "$file" 2>/dev/null || true
  fi
}

# 1. Add all JavaScript files
echo "Adding JavaScript files..."
add_files "." "js"

# 2. Add all shell scripts
echo "Adding shell scripts..."
add_files "." "sh"

# 3. Add all Python scripts
echo "Adding Python scripts..."
add_files "." "py"

# 4. Add all TypeScript files
echo "Adding TypeScript files..."
add_files "." "ts"

# 5. Add all YAML/YML files
echo "Adding YAML files..."
add_files "." "yaml"
add_files "." "yml"

# 6. Add all JSON files
echo "Adding JSON files..."
add_files "." "json"

# 7. Add all Markdown files
echo "Adding Markdown files..."
add_files "." "md"

# 8. Add specific directories
echo "Adding specific directories..."
add_dir "bin"
add_dir "lib"
add_dir "commands"
add_dir "core-protocols"
add_dir "scripts"
add_dir "config"
add_dir "configs"
add_dir "docs"
add_dir "src"
add_dir "workflows"
add_dir "infrastructure"
add_dir "deployment"
add_dir "monitoring"
add_dir "reports"
add_dir "symphony-configuration"

# 9. Add specific files
echo "Adding specific configuration files..."
add_file "app.yaml"
add_file "Dockerfile"
add_file "requirements.txt"
add_file "package.json"
add_file "package-lock.json"

# Add all cloudbuild files
echo "Adding cloudbuild files..."
for file in cloudbuild*.yaml; do
  add_file "$file"
done

# Add README and license files
echo "Adding README and license files..."
add_file "README.md"
add_file "LICENSE"
add_file "SECURITY.md"
add_file "TRADEMARK_NOTICE.md"

# 10. Add our staging scripts
add_file "stage_files.sh"
add_file "comprehensive_stage.sh"

echo "All files staged successfully."
