# Docker Image Size Optimization

This document explains the strategies used to reduce the Docker image size from 1.4GiB to under 300MB.

## Optimization Strategies

### 1. Strict .dockerignore Rules

The `.dockerignore` file excludes unnecessary files from the Docker build context, which:
- Reduces the size of the build context sent to the Docker daemon
- Prevents large files from being inadvertently included in the image
- Ensures only essential code is copied into the image

### 2. Multi-stage Builds

The Dockerfile uses a multi-stage build approach with two stages:
- **Builder stage**: Installs dependencies and prepares the application
- **Runtime stage**: Contains only the necessary files to run the application

This approach significantly reduces the final image size by not including build tools and intermediate files.

### 3. PNPM Package Manager

Replacing npm with pnpm:
- More efficient storage of dependencies
- Reduces duplicate packages
- Creates a smaller node_modules directory

### 4. Selective File Copying

Only essential files are copied from the builder stage to the runtime stage:
- Core application code
- Production dependencies
- Interface and integration components
- Gateway service files

### 5. Post-installation Cleanup

After installation, unnecessary files are removed:
- Package caches
- Test files in node_modules
- Documentation files
- TypeScript source files (when JavaScript is sufficient)

## Expected Results

- Original image size: ~1.4GiB
- Optimized image size: <300MB
- Size reduction: >75%

## Important Preserved Components

- Interface components for Claude
- Google Drive integration
- Gateway services with SallyPort verification
- Essential CLI functionality

This optimization preserves all critical functionality while significantly reducing the deployment footprint.

