FROM node:18-alpine

# Set environment variables
ENV NODE_ENV=production

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Make the CLI executable
RUN chmod +x ./bin/aixtiv.js

# Set up environment for Cloud Build/Run
ENV PORT=8080
EXPOSE ${PORT}

# Start command - either run the CLI directly or start a server if needed
# For a CLI tool in container context, you might want a server wrapping the CLI or
# use the container for specific CLI commands
CMD ["node", "server.js"]

# Alternative: To use as pure CLI tool (e.g. for CI/CD pipelines)
# ENTRYPOINT ["node", "bin/aixtiv.js"]
