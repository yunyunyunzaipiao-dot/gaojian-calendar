import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ...['calendar.css','editor.css'].map(name=>['/'+name,[name,'text/css; charset=utf-8']]),
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ...['calendar-core.js','editor-controls.js','attachments.js','onboarding.js'].map(name=>['/'+name,[name,'text/javascript; charset=utf-8']])
]);
const port = Number(process.env.PORT || 5173);

createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const entry = files.get(pathname);
  if (!entry) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('页面不存在');
    return;
  }
  try {
    const content = await readFile(join(root, entry[0]));
    response.writeHead(200, { 'Content-Type': entry[1], 'Cache-Control': 'no-store' });
    response.end(content);
  } catch {
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('页面读取失败');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`本地网页已启动：http://localhost:${port}`);
});
