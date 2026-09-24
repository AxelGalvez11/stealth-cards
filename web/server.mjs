// Local server for the web app. No packages needed: `node web/server.mjs`, then open http://localhost:3000.
// It serves the app, saves your data (see store.mjs), and hosts the MCP link for AI apps at /mcp (see handler.mjs).
// Pages without a file (like /decks) get app.html, and the app shows the right screen.
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';

// Keys for the voices of audio cards live in .env (see README); it's fine if there isn't one.
// It loads before the rest, so settings in it apply everywhere.
try { process.loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url))); } catch {}
const { load } = await import('./store.mjs');
const { handle } = await import('./handler.mjs');
const PORT = Number(process.env.PORT) || 3000;
load();

const server = createServer(handle);
// If the port is taken (say, the app is already running), use the next free one instead of stopping.
let port = PORT;
server.on('error', e => {
  if (e.code !== 'EADDRINUSE' || port >= PORT + 10) throw e;
  console.log('Port ' + port + ' is busy, trying ' + (port + 1));
  server.listen(++port, '127.0.0.1');
});
server.on('listening', () => console.log('Lucida → http://localhost:' + port + '  (MCP link for AI apps: http://localhost:' + port + '/mcp)'));
server.listen(port, '127.0.0.1');
