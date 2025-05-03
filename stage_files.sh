#!/bin/bash

# 1. Stage core JavaScript files
echo "Staging core JavaScript files..."
find bin lib commands core-protocols -name "*.js" -type f | xargs git add

# 2. Stage shell scripts
echo "Staging shell scripts..."
find bin scripts infrastructure deployment monitoring -name "*.sh" -type f | xargs git add

# 3. Stage configuration files
echo "Staging configuration files..."
find config configs -name "*.json" -type f | xargs git add
find config configs -name "*.yaml" -type f | xargs git add
find config configs -name "*.yml" -type f | xargs git add

# 4. Stage documentation
echo "Staging documentation..."
find . -name "*.md" -type f -not -path "*/node_modules/*" | xargs git add

# 5. Stage remaining project files
echo "Staging other project files..."
find src -name "*.js" -type f | xargs git add
git add .eslintrc.js package.json

# 6. Stage Python scripts
echo "Staging Python scripts..."
find . -name "*.py" -type f -not -path "*/node_modules/*" | xargs git add

# 7. Stage workflow files
echo "Staging workflow files..."
find workflows -name "*.yaml" -type f | xargs git add
find workflows -name "*.yml" -type f | xargs git add

# 8. Stage all remaining yaml/yml files
echo "Staging remaining YAML files..."
find infrastructure -name "*.yaml" -type f | xargs git add
find infrastructure -name "*.yml" -type f | xargs git add

# 9. Stage remaining useful files
echo "Staging remaining useful files..."
find . -name "*.ts" -type f -not -path "*/node_modules/*" | xargs git add
find . -name "firebase*.json" -type f | xargs git add
find . -name "cloudbuild*.yaml" -type f | xargs git add

echo "Files staged successfully."
