import { WebSocketServer, WebSocket } from 'ws';
import chokidar from 'chokidar';
import { buildExtension } from './build.ts';

const PORT = 8081;
const wss = new WebSocketServer({ port: PORT });

console.log(`[Dev] WebSocket server started on port ${PORT}`);

let clients: WebSocket[] = [];

wss.on('connection', (ws) => {
    clients.push(ws);
    ws.on('close', () => {
        clients = clients.filter((client) => client !== ws);
    });
});

function broadcastReload(type: 'full' | 'ui') {
    clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(`reload:${type}`);
        }
    });
}

// Initial build
try {
    buildExtension({ dev: true });
} catch (e) {
    console.error('[Dev] Initial build failed:', e);
}

// Watch for changes
const watcher = chokidar.watch(['src', 'manifest.json'], {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true,
    usePolling: true, // Force polling for better compatibility
    interval: 100,
});

watcher.on('all', (event, path) => {
    console.log(`[Dev] Change detected (${event}): ${path}`);
    try {
        buildExtension({ dev: true });
        console.log('[Dev] Rebuild successful, reloading extension...');

        // Determine reload type
        const reloadType = getReloadType(path);

        console.log(`[Dev] Triggering ${reloadType} reload`);
        broadcastReload(reloadType);
    } catch (e) {
        console.error('[Dev] Build failed:', e);
    }
});

function getReloadType(path: string): 'full' | 'ui' {
    const systemFiles = ['background.ts', 'manifest.json'];
    return systemFiles.some(file => path.includes(file)) ? 'full' : 'ui';
}

console.log('[Dev] Watching for changes...');
