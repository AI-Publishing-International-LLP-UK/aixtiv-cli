#!/bin/bash

# Create core directories
mkdir -p core/{cli,functions,shared}

# Create module directories
mkdir -p modules/{auth,billing,domains}

# Create asset directories
mkdir -p assets/{cdn,local}

# Create config directories
mkdir -p config/{prod,dev}

# Move CLI components
mv src/cli/* core/cli/ 2>/dev/null || true
mv bin/* core/cli/bin/ 2>/dev/null || true
mv lib/* core/cli/lib/ 2>/dev/null || true

# Move function components
mv functions/* core/functions/ 2>/dev/null || true
mv cloud-functions/* core/functions/ 2>/dev/null || true

# Move shared components
mv shared/* core/shared/ 2>/dev/null || true
mv utils/* core/shared/utils/ 2>/dev/null || true
mv common/* core/shared/common/ 2>/dev/null || true

# Move auth components
mv auth/* modules/auth/ 2>/dev/null || true
mv security/* modules/auth/security/ 2>/dev/null || true
mv sallyport/* modules/auth/sallyport/ 2>/dev/null || true

# Move billing components
mv billing/* modules/billing/ 2>/dev/null || true
mv payment/* modules/billing/payment/ 2>/dev/null || true
mv stripe/* modules/billing/stripe/ 2>/dev/null || true

# Move domain components
mv domains/* modules/domains/ 2>/dev/null || true
mv firebase/* modules/domains/firebase/ 2>/dev/null || true

# Move assets
mv ui/assets/* assets/cdn/ 2>/dev/null || true
mv public/* assets/cdn/public/ 2>/dev/null || true
mv local-assets/* assets/local/ 2>/dev/null || true
mv static/* assets/local/static/ 2>/dev/null || true

# Move config files
mv config/* config/prod/ 2>/dev/null || true
mv environments/* config/dev/ 2>/dev/null || true

# Clean up empty directories
find . -type d -empty -delete

echo "Migration complete. Please verify the new structure."
