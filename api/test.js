export default function handler(req, res) {
    res.json({
        url: req.url,
        originalUrl: req.originalUrl || null,
        headers: req.headers
    });
}
