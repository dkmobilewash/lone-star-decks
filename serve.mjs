// Tiny static server for previewing ./dist locally: npm run dev
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';

const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.xml': 'application/xml', '.txt': 'text/plain' };
const root = join(process.cwd(), 'dist');
const port = process.env.PORT || 8080;

createServer(async (req, res) => {
  let path = join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  try {
    if ((await stat(path)).isDirectory()) path = join(path, 'index.html');
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream' });
    res.end(await readFile(path));
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end(await readFile(join(root, '404.html')));
  }
}).listen(port, () => console.log(`Preview at http://localhost:${port}`));
