const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { gzip } = require('node:zlib');
const { promisify } = require('node:util');

const compress = promisify(gzip);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

function acceptsGzip(header = '') {
  const encodings = new Map(header.split(',').map(value => {
    const [name, ...parameters] = value.trim().toLowerCase().split(';');
    const quality = parameters.find(parameter => parameter.trim().startsWith('q='));
    return [name, quality ? Number(quality.trim().slice(2)) : 1];
  }));
  return (encodings.get('gzip') ?? encodings.get('*') ?? 0) > 0;
}

function createPreviewServer({ root = path.resolve(__dirname, '..', 'dist') } = {}) {
  root = path.resolve(root);
  if (!fs.existsSync(path.join(root, 'index.html'))) throw new Error('빌드 파일이 없습니다. 먼저 npm run build:web을 실행하세요.');
  const cache = new Map();
  async function asset(file) {
    const stat = await fs.promises.stat(file);
    const signature = `${stat.mtimeMs}:${stat.ctimeMs}:${stat.size}`;
    if (cache.get(file)?.signature === signature) return cache.get(file).pending;
    const pending = (async () => {
      const data = await fs.promises.readFile(file);
      const compressed = /\.(?:html|js|css|json|svg|txt)$/i.test(file) && data.length > 1024 ? await compress(data) : null;
      return { data, compressed: compressed && compressed.length < data.length ? compressed : null, hash: crypto.createHash('sha256').update(data).digest('hex') };
    })();
    cache.set(file, { signature, pending });
    try { return await pending; }
    catch (error) { if (cache.get(file)?.pending === pending) cache.delete(file); throw error; }
  }
  return http.createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'no-store');
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { Allow: 'GET, HEAD' }).end(); return; }
    let name;
    try { name = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
    catch { response.writeHead(400).end(); return; }
    const candidate = path.resolve(root, `.${name}`);
    if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) { response.writeHead(403).end(); return; }
    if (name.startsWith('/api/')) { response.writeHead(404).end(); return; }
    try {
      let file = candidate;
      let stat;
      try { stat = await fs.promises.stat(candidate); }
      catch (error) { if (!['ENOENT', 'ENOTDIR'].includes(error.code)) throw error; }
      if (!stat?.isFile()) {
        if (path.extname(candidate)) { response.writeHead(404).end(); return; }
        file = path.join(root, 'index.html');
      }
      const content = await asset(file);
      const zipped = acceptsGzip(request.headers['accept-encoding']) && !!content.compressed;
      const data = zipped ? content.compressed : content.data;
      const etag = `"${content.hash}${zipped ? '-gzip' : ''}"`;
      const html = path.extname(file) === '.html';
      const hashed = /[-.][a-f0-9]{16,}\.(?:js|css)$/i.test(path.basename(file));
      response.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
      response.setHeader('Cache-Control', html ? 'no-cache' : hashed ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate');
      response.setHeader('Vary', 'Accept-Encoding');
      response.setHeader('ETag', etag);
      if (zipped) response.setHeader('Content-Encoding', 'gzip');
      const tags = (request.headers['if-none-match'] || '').split(',').map(value => value.trim());
      if (tags.some(value => value === etag || value === `W/${etag}` || value === '*')) { response.writeHead(304).end(); return; }
      response.setHeader('Content-Length', data.length);
      response.writeHead(200);
      response.end(request.method === 'HEAD' ? undefined : data);
    } catch {
      response.writeHead(500).end();
    }
  });
}

if (require.main === module) {
  createPreviewServer().listen(3000, '127.0.0.1', () => {
    process.stdout.write('Optimized web preview: http://localhost:3000\n');
  });
}

module.exports = { createPreviewServer };
