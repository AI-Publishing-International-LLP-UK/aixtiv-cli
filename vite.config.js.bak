import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000, // Or any port you prefer
    open: true, // Opens browser on `npm run dev`
    cors: true, // Enables cross-origin
    strictPort: true, // Fail if port is taken
  },
  build: {
    outDir: 'dist', // Required for Firebase hosting
  },
});
