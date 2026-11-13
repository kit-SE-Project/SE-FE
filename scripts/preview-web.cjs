const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');

const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.ico': 'image/x-icon', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' };
function callbackLocation(location) {
  const match = /^(?:https?:\/\/[^/]+)?\/(\?sso=(?:expired|unavailable))?$/.exec(location || '');
  return match ? '/allday/' + (match[1] || '') : location;
}

function createWebPreview({
  boardRoot = path.resolve(__dirname, '../apps/se-board/build'),
  alldayRoot = path.resolve(__dirname, '../apps/server-allday/dist'),
  upstream = process.env.ALLDAY_API_UPSTREAM || 'http://127.0.0.1:18082',
} = {}) {
  boardRoot = path.resolve(boardRoot); alldayRoot = path.resolve(alldayRoot);
  const backend = new URL(upstream);
  if (!['http:', 'https:'].includes(backend.protocol) || backend.username || backend.password || backend.pathname !== '/' || backend.search || backend.hash) throw new Error('ALLDAY_API_UPSTREAM에는 백엔드 오리진만 지정하세요.');
  const failure = response => {
    if (response.headersSent) { response.destroy(); return; }
    response.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify({ status: 503, code: 'API_UNAVAILABLE', message: '대여 백엔드에 연결할 수 없습니다. 실행 상태와 연결 설정을 확인하세요.' }));
  };
  return http.createServer(async (request, response) => {
    let route;
    try { route = new URL(request.url, 'http://preview.invalid'); } catch { response.writeHead(400).end(); return; }
    const name = route.pathname;
    if (name.startsWith('/api/internal/')) { response.writeHead(404).end(); return; }
    if (name.startsWith('/api/v1/')) {
      const headers = { ...request.headers, host: request.headers.host, 'x-forwarded-for': request.socket.remoteAddress };
      delete headers.connection;
      const remote = (backend.protocol === 'https:' ? https : http).request(new URL(name + route.search, backend), {
        method: request.method, headers,
      }, result => {
        const outgoing = { ...result.headers, 'cache-control': 'no-store' };
        delete outgoing.connection;
        if (name === '/api/v1/sso/callback' && outgoing.location) outgoing.location = callbackLocation(outgoing.location);
        response.writeHead(result.statusCode, outgoing); result.pipe(response);
      });
      remote.setTimeout(12000, () => remote.destroy());
      remote.on('error', () => failure(response));
      request.on('aborted', () => remote.destroy());
      request.pipe(remote);
      return;
    }
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { Allow: 'GET, HEAD' }).end(); return; }
    if (name === '/allday') { response.writeHead(308, { Location: '/allday/' + route.search }).end(); return; }
    if (name === '/allday/sso/') { response.writeHead(308, { Location: '/allday/sso' + route.search }).end(); return; }
    const portal = name === '/allday/sso';
    const rental = !portal && name.startsWith('/allday/');
    const root = rental ? alldayRoot : boardRoot;
    let relative;
    try { relative = portal ? '/index.html' : decodeURIComponent(rental ? name.slice('/allday'.length) : name); }
    catch { response.writeHead(400).end(); return; }
    let file = path.resolve(root, '.' + relative);
    if (file !== root && !file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
    try {
      const info = await fs.promises.stat(file).catch(() => null);
      if (!info?.isFile()) {
        if (path.extname(relative) || relative.startsWith('/_expo/') || relative.startsWith('/assets/')) { response.writeHead(404).end(); return; }
        file = path.join(root, 'index.html');
      }
      const data = await fs.promises.readFile(file);
      response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Content-Length': data.length,
        'Cache-Control': 'no-cache', ...(portal ? { 'Referrer-Policy': 'no-referrer' } : {}) });
      response.end(request.method === 'HEAD' ? undefined : data);
    } catch { response.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' }).end('웹 빌드가 없습니다. 게시판과 대여 웹을 먼저 빌드하세요.'); }
  });
}

if (require.main === module) {
  const port = Number(process.env.WEB_PREVIEW_PORT || 3100);
  createWebPreview().listen(port, '127.0.0.1', () => console.log(`SE 게시판: http://127.0.0.1:${port}/\n서버 대여: http://127.0.0.1:${port}/allday/`));
}
module.exports = { createWebPreview, callbackLocation };
