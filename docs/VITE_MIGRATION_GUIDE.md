# Migrating to Vite: Multi-Site Configuration with TypeScript Interfaces

This guide provides step-by-step instructions for migrating from Create React App to Vite, configuring Firebase hosting for multiple domains (coaching2100.com, 2100.cool, and asoos.2100.cool), and properly setting up TypeScript interfaces.

## Table of Contents
- [Migration Steps: Create React App to Vite](#migration-steps-create-react-app-to-vite)
- [Firebase Multi-Site Hosting Configuration](#firebase-multi-site-hosting-configuration)
- [TypeScript Interface Organization](#typescript-interface-organization)
- [Sample Interface Files](#sample-interface-files)

## Migration Steps: Create React App to Vite

### 1. Install Vite and Required Dependencies

```bash
# Navigate to your project directory
cd /Users/as/asoos/aixtiv-cli

# Install Vite and necessary plugins
npm install -D vite @vitejs/plugin-react vite-tsconfig-paths
```

### 2. Create Vite Configuration File

Create a `vite.config.ts` file in the project root:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths()
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  build: {
    outDir: 'build', // Match CRA output directory for seamless Firebase integration
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split large dependencies into separate chunks
          vendor: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/functions', 'firebase/storage']
        }
      }
    }
  },
  server: {
    port: 3000, // Match CRA default port
    host: true, // Listen on all addresses
    region: 'us-west1', // Use consistent region
    strictPort: true
  }
});
```

### 3. Update TypeScript Configuration

Update your `tsconfig.json` to be more specific for Vite:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*", "lib/**/*"],
  "exclude": ["node_modules", "**/*.spec.ts", "build", "dist"]
}
```

### 4. Update Package.json Scripts

Replace the Create React App scripts in your `package.json`:

```json
"scripts": {
  "start": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "deploy": "vite build && firebase deploy",
  "deploy:coaching": "vite build && firebase deploy --only hosting:coaching2100-com",
  "deploy:asoos": "vite build && firebase deploy --only hosting:asoos-2100-cool",
  "deploy:main": "vite build && firebase deploy --only hosting:main-2100-cool",
  "deploy:all": "vite build && firebase deploy --only hosting"
}
```

### 5. Create Environment Files

Create environment files for development and production:

`.env.development`:
```
VITE_API_KEY=your_dev_api_key
VITE_AUTH_DOMAIN=app-2100-cool.firebaseapp.com
VITE_PROJECT_ID=app-2100-cool
VITE_STORAGE_BUCKET=app-2100-cool.appspot.com
VITE_MESSAGING_SENDER_ID=your_sender_id
VITE_APP_ID=your_app_id
VITE_REGION=us-west1
```

`.env.production`:
```
VITE_API_KEY=your_prod_api_key
VITE_AUTH_DOMAIN=app-2100-cool.firebaseapp.com
VITE_PROJECT_ID=app-2100-cool
VITE_STORAGE_BUCKET=app-2100-cool.appspot.com
VITE_MESSAGING_SENDER_ID=your_sender_id
VITE_APP_ID=your_app_id
VITE_REGION=us-west1
```

### 6. Update Index Files

Replace `src/index.js` with `src/index.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### 7. Convert App.jsx to App.tsx

```tsx
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import './App.css';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      {/* Your app content */}
    </BrowserRouter>
  );
};

export default App;
```

### 8. Create Vite HTML Template

Create an `index.html` file in the project root:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Aixtiv Symphony</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/index.tsx"></script>
  </body>
</html>
```

## Firebase Multi-Site Hosting Configuration

### 1. Update Firebase Configuration

Update `.firebaserc` to include all three domains:

```json
{
  "projects": {
    "default": "app-2100-cool"
  },
  "targets": {
    "app-2100-cool": {
      "hosting": {
        "coaching2100-com": [
          "coaching2100-com"
        ],
        "main-2100-cool": [
          "main-2100-cool"
        ],
        "asoos-2100-cool": [
          "asoos-2100-cool"
        ],
        "doctors-live": [
          "doctors-live"
        ],
        "experts-ai": [
          "experts-ai"
        ],
        "drclaude-live": [
          "drclaude-live"
        ]
      }
    }
  },
  "doctorSites": {
    "doctors-live": [
      "drclaude-live", "drmatch-live", "drlucy-live", "drsabina-live", "drgrant-live", 
      "drburby-live", "professorlee-live", "drmaria-live", "drcypriot-live", 
      "drmemoria-live", "drroark-live"
    ],
    "experts-ai": [
      "drclaude-ai", "drmatch-ai", "drlucy-ai", "drsabina-ai", "drgrant-ai", 
      "drburby-ai", "professorlee-ai", "drmaria-ai", "drcypriot-ai", 
      "drmemoria-ai", "drroark-ai"
    ]
  },
  "etags": {}
}
```

### 2. Register Site IDs with Firebase

Run the following commands to register your sites with Firebase:

```bash
# Create site IDs in Firebase
firebase hosting:sites:create coaching2100-com
firebase hosting:sites:create main-2100-cool
firebase hosting:sites:create asoos-2100-cool

# Connect sites to targets
firebase target:apply hosting coaching2100-com coaching2100-com
firebase target:apply hosting main-2100-cool main-2100-cool
firebase target:apply hosting asoos-2100-cool asoos-2100-cool
```

### 3. Update firebase.json for Multi-Site Configuration

```json
{
  "hosting": [
    {
      "target": "coaching2100-com",
      "public": "build",
      "ignore": [
        "firebase.json",
        "**/.*",
        "**/node_modules/**"
      ],
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ],
      "headers": [
        {
          "source": "**/*.@(js|css)",
          "headers": [
            {
              "key": "Cache-Control",
              "value": "max-age=31536000"
            }
          ]
        }
      ]
    },
    {
      "target": "main-2100-cool",
      "public": "build",
      "ignore": [
        "firebase.json",
        "**/.*",
        "**/node_modules/**"
      ],
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ],
      "headers": [
        {
          "source": "**/*.@(js|css)",
          "headers": [
            {
              "key": "Cache-Control",
              "value": "max-age=31536000"
            }
          ]
        }
      ]
    },
    {
      "target": "asoos-2100-cool",
      "public": "build",
      "ignore": [
        "firebase.json",
        "**/.*",
        "**/node_modules/**"
      ],
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ],
      "headers": [
        {
          "source": "**/*.@(js|css)",
          "headers": [
            {
              "key": "Cache-Control",
              "value": "max-age=31536000"
            }
          ]
        }
      ]
    },
    {
      "target": "drclaude-live",
      "public": "public",
      "ignore": [
        "firebase.json",
        "**/.*",
        "**/node_modules/**"
      ],
      "rewrites": [
        {
          "source": "/claude-code-generate",
          "function": "claudeCodeGenerate"
        },
        {
          "source": "/context-storage",
          "function": "contextStorage"
        },
        {
          "source": "/model-metrics",
          "function": "modelMetrics"
        },
        {
          "source": "/projects/delegate",
          "function": "drClaude"
        },
        {
          "source": "/dr-claude-health",
          "function": "drClaude"
        }
      ]
    }
  ],
  "functions": {
    "source": "functions",
    "runtime": "nodejs22",
    "region": ["us-west1"],
    "ignore": [
      "node_modules",
      ".git",
      "firebase-debug.log",
      "firebase-debug.*.log"
    ]
  },
  "database": {
    "rules": "database.rules.json"
  }
}
```

### 4. Connect Custom Domains

After deploying the sites, connect your custom domains:

```bash
# Connect coaching2100.com
firebase hosting:channel:deploy production --site coaching2100-com

# Connect 2100.cool
firebase hosting:channel:deploy production --site main-2100-cool

# Connect asoos.2100.cool
firebase hosting:channel:deploy production --site asoos-2100-cool
```

Then, go to the Firebase console → Hosting → Connect domain and follow the steps to connect:
- coaching2100.com to coaching2100-com site
- 2100.cool to main-2100-cool site
- asoos.2100.cool to asoos-2100-cool site

## TypeScript Interface Organization

### 1. Create a Structured Types Directory

```bash
mkdir -p src/types/{api,components,context,domain,hooks,services,utils}
```

### 2. Create an index.ts File in Each Directory

For example, in `src/types/index.ts`:

```typescript
// Export all types from subdirectories
export * from './api';
export * from './components';
export * from './context';
export * from './domain';
export * from './hooks';
export * from './services';
export * from './utils';
```

### 3. Move Existing pinecone.d.ts File

```bash
mv src/types/pinecone.d.ts src/types/api/pinecone.d.ts
```

### 4. Create a tsconfig.paths.json File

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@types/*": ["src/types/*"],
      "@api/*": ["src/types/api/*"],
      "@components/*": ["src/types/components/*"],
      "@domain/*": ["src/types/domain/*"]
    }
  }
}
```

And update your `tsconfig.json` to extend this file:

```json
{
  "extends": "./tsconfig.paths.json",
  "compilerOptions": {
    // ... other options
  }
}
```

## Sample Interface Files

### 1. Domain Model Interfaces

Create `src/types/domain/user.ts`:

```typescript
export enum UserRole {
  OWNER = 'owner',
  RIX = 'rix',
  CRX = 'crx',
  WING_LEADER = 'wing_leader',
  PILOT = 'pilot',
  AP = 'ap', // AI Pilot
  HP = 'hp'  // Human Pilot
}

export interface User {
  id: string;
  uuid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  subscriptionTier?: string;
  createdAt: Date;
  lastLogin?: Date;
  isActive: boolean;
}

export interface UserProfile extends User {
  photoURL?: string;
  bio?: string;
  preferences: UserPreferences;
  sessionHistory: string[];
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  language: string;
  timezone: string;
}
```

### 2. API Interfaces

Create `src/types/api/api-response.ts`:

```typescript
export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  meta?: {
    timestamp: number;
    requestId: string;
    processingTime?: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  };
}
```

### 3. Component Interfaces

Create `src/types/components/common.ts`:

```typescript
import { ReactNode } from 'react';

export interface BaseProps {
  className?: string;
  id?: string;
  testId?: string;
}

export interface ChildrenProps {
  children: ReactNode;
}

export interface WithChildrenProps extends BaseProps, ChildrenProps {}

export interface ButtonProps extends BaseProps {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  children: ReactNode;
}
```

### 4. ASOOS Symphony-Specific Interfaces

Create `src/types/domain/symphony.ts`:

```typescript
export enum AcademyModuleType {
  COURSE = 'course',
  WORKSHOP = 'workshop',
  ASSESSMENT = 'assessment',
  DAILY_INTEGRATION = 'daily_integration'
}

export interface AcademyModule {
  id: string;
  title: string;
  type: AcademyModuleType;
  description: string;
  duration: number; // in minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  prerequisites: string[];
  objectives: string[];
  completionCriteria: string[];
}

export interface WingAgent {
  id: string;
  callsign: string;
  category: 'CORE' | 'DEPLOY' | 'ENGAGE';
  squadron: 'R1' | 'R2' | 'R3';
  capabilities: string[];
  status: 'ACTIVE' | 'STANDBY' | 'MAINTENANCE';
  lastDeployed?: Date;
  performanceMetrics: AgentPerformanceMetrics;
}

export interface AgentPerformanceMetrics {
  responseTime: number; // in ms
  successRate: number; // percentage
  userSatisfaction: number; // 0-100
  completionRate: number; // percentage
  errorRate: number; // percentage
}

export interface DreamCommanderPrediction {
  userId: string;
  timestamp: Date;
  predictedPath: string[];
  confidence: number;
  alternatives: Array<{
    path: string[];
    confidence: number;
  }>;
  factors: Record<string, number>;
}

export interface S2DOContract {
  id: string;
  parties: string[];
  terms: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  createdAt: Date;
  expiresAt?: Date;
  signatures: Array<{
    partyId: string;
    timestamp: Date;
    hash: string;
  }>;
  blockchain: {
    chainId: string;
    transactionHash?: string;
    blockHeight?: number;
    confirmed: boolean;
  };
}
```

### 5. Context Type Definitions

Create `src/types/context/auth-context.ts`:

```typescript
import { User } from '../domain/user';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}
```

### 6. Service Type Definitions

Create `src/types/services/firebase-service.ts`:

```typescript
import { FirebaseApp } from 'firebase/app';
import { Auth, User as FirebaseUser } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import { Functions } from 'firebase/functions';
import { Storage } from 'firebase/storage';
import { User } from '../domain/user';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export interface FirebaseService {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  functions: Functions;
  storage: Storage;
  
  // Auth methods
  getCurrentUser: () => FirebaseUser | null;
  mapFirebaseUserToUser: (firebaseUser: FirebaseUser) => Promise<User>;
  
  // Firestore methods
  getUserProfile: (userId: string) => Promise<User | null>;
  updateUserProfile: (userId: string, data: Partial<User>) => Promise<void>;
  
  // Functions methods
  callFunction: <T, R>(name: string, data: T) => Promise<R>;
}
```

## Conclusion

This guide provided a comprehensive approach to:

1. Migrating from Create React App to Vite
2. Setting up Firebase hosting for multiple domains
3. Organizing TypeScript interfaces effectively
4. Creating sample interfaces specific to the Aixtiv Symphony project

After following these steps, your project will have a modern, type-safe structure that supports multiple domains through Firebase hosting. The TypeScript interfaces will provide strong typing throughout your application, improving development experience and code quality.

Remember to update your CI/CD pipelines to use the new Vite build commands if you have automated deployments.

