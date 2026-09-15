import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

function copyConfigPlugin(): Plugin {
  return {
    name: 'copy-config',
    generateBundle() {
      const configPath = path.resolve(__dirname, 'config.js');
      if (fs.existsSync(configPath)) {
        this.emitFile({
          type: 'asset',
          fileName: 'config.js',
          source: fs.readFileSync(configPath, 'utf8'),
        });
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), copyConfigPlugin()],
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
});
