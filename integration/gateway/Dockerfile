FROM node:18-alpine

# Set environment variables
ENV NODE_ENV=production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost:8080/health || exit 1

# Port configuration
ENV PORT=8080
EXPOSE ${PORT}

# Start the gateway service
CMD ["node", "server.js"]

