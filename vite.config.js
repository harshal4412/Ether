// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/react-vite';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // This creates a separate chunk for each major library
            if (id.includes('react')) return 'vendor-react';
            if (id.includes('supabase')) return 'vendor-supabase';
            if (id.includes('framer-motion')) return 'vendor-motion';
            return 'vendor'; // everything else
          }
        },
      },
    },
  },
});