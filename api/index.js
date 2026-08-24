import { createBareServer } from '@tomphttp/bare-server-node';

const bare = createBareServer('/bare/');

export default function handler(req, res) {
    // Check if the request is a Bare server request
    if (bare.shouldRoute(req)) {
        bare.routeRequest(req, res);
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
}
