import { createBareServer } from '@tomphttp/bare-server-node';

const bare = createBareServer('/bare/');

export default function handler(req, res) {
    if (bare.shouldRoute(req)) {
        bare.routeRequest(req, res);
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
}

// Disable body parsing so that raw request stream is proxied correctly, 
// and enable externalResolver to handle async requests.
export const config = {
    api: {
        bodyParser: false,
        externalResolver: true,
    },
};
