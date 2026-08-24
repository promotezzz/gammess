import { createBareServer } from '@tomphttp/bare-server-node';
import express from 'express';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const bare = createBareServer('/bare/');

// Serve static site assets
app.use(express.static(__dirname));

// Fallback to index.html for SPA routing/scope issues
app.use((req, res, next) => {
    res.status(404).sendFile(join(__dirname, 'index.html'));
});

const server = createServer();

server.on('request', (req, res) => {
    if (bare.shouldRoute(req)) {
        bare.routeRequest(req, res);
    } else {
        app(req, res);
    }
});

server.on('upgrade', (req, socket, head) => {
    if (bare.shouldRoute(req)) {
        bare.routeUpgrade(req, socket, head);
    } else {
        socket.end();
    }
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`can games: running at http://localhost:${PORT}`);
});
