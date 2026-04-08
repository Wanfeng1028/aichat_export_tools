import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/ui/popup/index.html'),
        dashboard: resolve(__dirname, 'src/ui/dashboard/index.html'),
        options: resolve(__dirname, 'src/ui/options/index.html'),
        serviceWorker: resolve(__dirname, 'src/background/service-worker.ts'),
        content: resolve(__dirname, 'src/content/index.ts'),
        bridge: resolve(__dirname, 'src/content/bridge.ts')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          const fileNameMap: Record<string, string> = {
            serviceWorker: 'src/background/service-worker.js',
            content: 'src/content/index.js',
            bridge: 'src/content/bridge.js'
          };

          return fileNameMap[chunkInfo.name] ?? 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  }
});
