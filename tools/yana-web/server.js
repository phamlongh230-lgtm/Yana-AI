'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 8081;
const STATIC_DIR = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    const MAX = 32 * 1024;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX) {
        reject({ status: 413, message: 'Request body too large' });
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function serveStatic(req, res, reqPath) {
  // Reject path traversal (L5 gate)
  if (reqPath.includes('..')) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Bad Request');
    return;
  }

  const filePath = path.join(STATIC_DIR, reqPath);
  const ext = path.extname(filePath);
  const contentType = MIME[ext] || 'text/plain';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

// Lazy-load route and chat handlers (defined in Wave 2 & 3)
function getRouteHandler() {
  try { return require('./route-handler'); } catch (_) { return null; }
}
function getChatHandler() {
  try { return require('./chat-handler'); } catch (_) { return null; }
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url || '/');
  const pathname = parsed.pathname || '/';
  const method = req.method || 'GET';

  // Health
  if (method === 'GET' && pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // POST /api/route
  if (method === 'POST' && pathname === '/api/route') {
    const handler = getRouteHandler();
    if (handler) { await handler(req, res, readBody); return; }
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'route handler not loaded' }));
    return;
  }

  // POST /api/chat
  if (method === 'POST' && pathname === '/api/chat') {
    const handler = getChatHandler();
    if (handler) { await handler(req, res, readBody); return; }
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'chat handler not loaded' }));
    return;
  }

  // Static files
  if (method === 'GET') {
    const reqPath = pathname === '/' ? '/index.html' : pathname;
    serveStatic(req, res, reqPath);
    return;
  }

  res.writeHead(405, { 'Content-Type': 'text/plain' });
  res.end('Method Not Allowed');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Yana Web on http://localhost:${PORT}`);
});

module.exports = server;
