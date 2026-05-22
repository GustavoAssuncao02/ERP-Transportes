import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function readHttpsConfig(env, root) {
  const keyPath = env.VITE_HTTPS_KEY_PATH;
  const certPath = env.VITE_HTTPS_CERT_PATH;

  if (!keyPath || !certPath) return undefined;

  const resolvePath = (value) => (path.isAbsolute(value) ? value : path.resolve(root, value));

  return {
    key: fs.readFileSync(resolvePath(keyPath)),
    cert: fs.readFileSync(resolvePath(certPath)),
  };
}

export default defineConfig(({ mode }) => {
  const root = process.cwd();
  const env = loadEnv(mode, root, '');
  const httpsConfig = readHttpsConfig(env, root);

  return {
    plugins: [react()],
    server: {
      https: httpsConfig,
    },
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
  };
});
