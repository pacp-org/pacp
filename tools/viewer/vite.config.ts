import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

const specDir = path.resolve(__dirname, '../../spec');

function serveSpecPlugin() {
  return {
    name: 'serve-spec',
    configureServer(server: { middlewares: { use: (path: string, handler: (req: any, res: any, next: () => void) => void) => void } }) {
      server.middlewares.use('/spec', (req, res, next) => {
        const url = req.url?.replace(/^\//, '').split('?')[0] ?? '';
        const filePath = path.resolve(specDir, url);
        const rel = path.relative(specDir, filePath);
        if (rel.startsWith('..') || path.isAbsolute(rel)) {
          return next();
        }
        if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
          return next();
        }
        res.setHeader('Content-Type', 'application/json');
        fs.createReadStream(filePath).pipe(res);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), serveSpecPlugin()],
  base: process.env.NODE_ENV === 'production' ? '/pacp/viewer/' : '/',
  build: {
    outDir: path.resolve(__dirname, '../../site/viewer'),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
