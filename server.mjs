import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root = process.cwd();
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };

createServer(async (request, response) => {
  const urlPath = request.url === '/' ? '/index.html' : request.url.split('?')[0];
  const filePath = urlPath === '/vendor/xlsx.mjs'
    ? join(root, 'node_modules', 'xlsx', 'xlsx.mjs')
    : normalize(join(root, urlPath));
  if (!filePath.startsWith(root)) { response.writeHead(403); response.end('Forbidden'); return; }
  try {
    const file = await readFile(filePath);
    response.writeHead(200, { 'Content-Type': types[extname(filePath)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(file);
  } catch { response.writeHead(404); response.end('Not found'); }
}).listen(5173, () => console.log('Roofing Batch Intelligence is running at http://localhost:5173'));
