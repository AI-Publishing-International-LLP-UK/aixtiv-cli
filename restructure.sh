#!/bin/bash

# Create new optimized structure
mkdir -p new-structure/{
  core/{cli,functions,shared},
  modules/{auth,billing,domains},
  assets/{cdn,local},
  config/{prod,dev},
  docs
}

# Move core CLI files
mv src/cli/* new-structure/core/cli/
mv src/functions/* new-structure/core/functions/
mv src/shared/* new-structure/core/shared/

# Move module files
mv src/auth/* new-structure/modules/auth/
mv src/billing/* new-structure/modules/billing/
mv src/domains/* new-structure/modules/domains/

# Move assets with compression
find ui/assets -type f \( -name "*.jpg" -o -name "*.png" \) -exec convert {} -quality 85 new-structure/assets/cdn/{} \;

# Move configs
mv config/prod/* new-structure/config/prod/
mv config/dev/* new-structure/config/dev/

# Move documentation
mv docs/* new-structure/docs/

# Create new package.json with optimized dependencies
cat > new-structure/package.json << EOL
{
  "name": "aixtiv-cli-optimized",
  "version": "1.0.4",
  "description": "Optimized Aixtiv CLI",
  "main": "core/cli/index.js",
  "scripts": {
    "start": "node core/cli/index.js",
    "build": "webpack --config webpack.config.js"
  },
  "dependencies": {
    "@pinecone-database/pinecone": "^1.1.3",
    "firebase-admin": "^13.2.0",
    "express": "^4.21.2"
  },
  "devDependencies": {
    "eslint": "^8.57.1",
    "prettier": "^3.5.3",
    "jest": "^29.7.0"
  }
}
EOL

# Create webpack config for lazy loading
cat > new-structure/webpack.config.js << EOL
module.exports = {
  mode: 'production',
  entry: {
    main: './core/cli/index.js',
    auth: './modules/auth/index.js',
    billing: './modules/billing/index.js',
    domains: './modules/domains/index.js'
  },
  output: {
    filename: '[name].bundle.js',
    chunkFilename: '[name].chunk.js',
    path: __dirname + '/dist'
  },
  optimization: {
    splitChunks: {
      chunks: 'all'
    }
  }
}
EOL

# Create .gitignore for optimized project
cat > new-structure/.gitignore << EOL
node_modules/
dist/
.env
*.log
*.log.*
*.tar.gz
*.zip
EOL

echo "New optimized structure created in new-structure/"

