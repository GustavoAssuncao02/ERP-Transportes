import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    cssCodeSplit: true,
    reportCompressedSize: false,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/');

          if (normalizedId.includes('/node_modules/react/') || normalizedId.includes('/node_modules/react-dom/')) {
            return 'vendor-react';
          }

          if (normalizedId.includes('/node_modules/leaflet/')) {
            return 'vendor-leaflet';
          }

          if (normalizedId.includes('/node_modules/lucide-react/')) {
            return 'vendor-icons';
          }

          return undefined;
        },
      },
    },
  },
});
