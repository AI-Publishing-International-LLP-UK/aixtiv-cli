# Aixtiv CLI Code Mapping Guide

## Current → New Structure Mapping

### Core Components
```
📂 Current: /src/cli, /bin, /lib
📂 New: /core/cli
Reason: Consolidates all CLI core functionality in one place

📂 Current: /functions, /cloud-functions
📂 New: /core/functions
Reason: All cloud functions organized by feature

📂 Current: /shared, /utils, /common
📂 New: /core/shared
Reason: All shared utilities in one location
```

### Feature Modules
```
📂 Current: /auth, /security, /sallyport
📂 New: /modules/auth
Reason: All authentication in one module

📂 Current: /billing, /payment, /stripe
📂 New: /modules/billing
Reason: All payment processing together

📂 Current: /domains, /firebase
📂 New: /modules/domains
Reason: Domain management consolidated
```

### Assets & Resources
```
📂 Current: /ui/assets, /public
📂 New: /assets/cdn
Reason: CDN-delivered assets

📂 Current: /local-assets, /static
📂 New: /assets/local
Reason: Locally required assets
```

### Configuration
```
📂 Current: /config, /environments
📂 New: /config/{prod,dev}
Reason: Environment-specific configs
```

## Key Features Preserved

### Authentication Flow
- SallyPort remains the central auth system
- Multi-level authentication (6.0 to 4.25)
- Billing state management

### Domain Management
- Firebase multi-site hosting
- 200 domain optimization
- Dewey classification system

### Agent System
- PCP management
- Time Presser capabilities
- Timeliner functions

## Optimization Benefits

1. Faster Loading
   - Lazy loading of non-core features
   - CDN-delivered assets
   - Optimized dependencies

2. Better Organization
   - Clear feature boundaries
   - Easier to find code
   - Simpler maintenance

3. Reduced Size
   - No duplicate code
   - Optimized assets
   - Clean git history

## Migration Steps

1. Core Migration
   ```bash
   # Move CLI core
   mv src/cli/* new-structure/core/cli/
   mv bin/* new-structure/core/cli/bin/
   mv lib/* new-structure/core/shared/
   ```

2. Module Migration
   ```bash
   # Move auth module
   mv auth/* new-structure/modules/auth/
   mv security/* new-structure/modules/auth/security/
   mv sallyport/* new-structure/modules/auth/sallyport/
   ```

3. Asset Migration
   ```bash
   # Move and optimize assets
   mv ui/assets/* new-structure/assets/cdn/
   mv public/* new-structure/assets/local/
   ```

4. Config Migration
   ```bash
   # Move configurations
   mv config/prod/* new-structure/config/prod/
   mv config/dev/* new-structure/config/dev/
   ```

## New Features Enabled

1. Easy Feature Addition
   ```bash
   mkdir -p new-structure/modules/new-feature/{lib,tests,docs}
   ```

2. Simple Deployment
   ```bash
   npm run build:prod  # Builds optimized bundle
   npm run deploy:cdn  # Deploys to CDN
   ```

3. Development Flow
   ```bash
   npm run dev  # Starts dev server with hot reload
   npm run test:watch  # Runs tests in watch mode
   ```

