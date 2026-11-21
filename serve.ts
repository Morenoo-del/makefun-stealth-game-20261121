// Moonlight Heist — a tiny static file server for local play-testing.
// Serves game/ at http://localhost:8080 with no network access of its own:
//
//   node serve.ts
//
// (Not part of the entry's hand-in: main.ts only copies game/ and screenshots/.)

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'game');
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

const server = createServer(async (req, res) => {
  try {
    const raw = decodeURIComponent(req.url.split('?')[0]);
    const path = raw === '/' ? '/index.html' : raw;
    const file = join(root, path);
    if (!file.startsWith(root)) {
      res.writeHead(403);
      res.end('forbidden');
      return;
    }
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});

server.listen(8080, () => console.log('Moonlight Heist at http://localhost:8080'));
// Stop with Ctrl+C. The game itself loads no remote resources, so it also
// plays straight from the file system or any other static host.
