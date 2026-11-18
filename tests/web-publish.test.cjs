const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { publishWebBuild } = require('../scripts/publish-web-build.cjs');
const { createWebPreview } = require('../scripts/preview-web.cjs');

function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'se-web-publish-'));
  return { directory, cleanup() {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith('se-web-publish-'));
    fs.rmSync(directory, { recursive: true });
  } };
}
function file(root, name, value) { fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true }); fs.writeFileSync(path.join(root, name), value); }

test('rebuilding a live board retains assets needed by old history pages and publishes a complete new page', async () => {
  const temp = fixture(); const live = path.join(temp.directory, 'live'); const stage = path.join(temp.directory, 'stage');
  file(live, 'index.html', '<script src="/static/js/old.js"></script>'); file(live, 'static/js/old.js', 'OLD');
  const server = createWebPreview({ boardRoot: live });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const priorPage = await (await fetch(origin)).text(); assert.match(priorPage, /old.js/);
    // A build is incomplete for a while; the public site must still be the previous version.
    file(stage, 'static/js/new.js', 'NEW'); assert.equal(await (await fetch(origin + '/static/js/old.js')).text(), 'OLD');
    file(stage, 'index.html', '<script src="/static/js/new.js"></script>'); publishWebBuild(stage, live);
    assert.match(await (await fetch(origin)).text(), /new.js/);
    assert.equal(await (await fetch(origin + '/static/js/new.js')).text(), 'NEW');
    assert.equal(await (await fetch(origin + '/static/js/old.js')).text(), 'OLD');
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); temp.cleanup(); }
});

test('an incomplete failed export does not replace the last working HTML', () => {
  const temp = fixture(); const live = path.join(temp.directory, 'live'); const stage = path.join(temp.directory, 'stage');
  try {
    file(live, 'index.html', 'WORKING'); file(stage, 'static/broken.js', 'INCOMPLETE');
    assert.throws(() => publishWebBuild(stage, live)); assert.equal(fs.readFileSync(path.join(live, 'index.html'), 'utf8'), 'WORKING');
  } finally { temp.cleanup(); }
});

test('startup loader reports a missing script and never replaces an already mounted React screen', () => {
  const source = fs.readFileSync(path.join(__dirname, '../apps/se-board/public/startup-v1.js'), 'utf8');
  let handler; let mounted = false; const message = { textContent: '' }; let role;
  const context = { window: { addEventListener: (_event, callback) => { handler = callback; } }, document: { getElementById: name => mounted ? null : name === 'se-startup' ? { setAttribute: (_key, value) => { role = value; } } : message } };
  vm.runInNewContext(source, context);
  handler({ target: { tagName: 'SCRIPT' } }); assert.equal(role, 'alert'); assert.match(message.textContent, /다시 불러오기/);
  mounted = true; message.textContent = 'React screen'; handler({ target: { tagName: 'SCRIPT' } }); assert.equal(message.textContent, 'React screen');
});
