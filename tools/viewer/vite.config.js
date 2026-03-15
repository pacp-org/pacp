import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
var specDir = path.resolve(__dirname, '../../spec');
function serveSpecPlugin() {
    return {
        name: 'serve-spec',
        configureServer: function (server) {
            server.middlewares.use('/spec', function (req, res, next) {
                var _a, _b;
                var url = (_b = (_a = req.url) === null || _a === void 0 ? void 0 : _a.replace(/^\//, '').split('?')[0]) !== null && _b !== void 0 ? _b : '';
                var filePath = path.resolve(specDir, url);
                var rel = path.relative(specDir, filePath);
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
