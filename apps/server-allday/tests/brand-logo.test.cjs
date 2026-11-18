const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('the web logo is the original small PNG embedded locally without a separate image network request', () => {
  const original = fs.readFileSync(path.join(__dirname, '../src/asset/SE_LOGO.png'));
  const source = require('../src/asset/se-logo-web.cjs');
  assert.ok(source.uri.startsWith('data:image/png;base64,'));
  assert.deepEqual(Buffer.from(source.uri.split(',')[1], 'base64'), original);
  assert.equal(source.width, original.readUInt32BE(16)); assert.equal(source.height, original.readUInt32BE(20));
  const component = fs.readFileSync(path.join(__dirname, '../src/components/BrandLogo.jsx'), 'utf8');
  assert.match(component, /width: size, height: size/); assert.match(component, /resizeMode="contain"/);
  assert.match(component, /<img data-testid="se-logo"/);
  assert.match(component, /src=\{logo.uri\}/);
  assert.match(component, /objectFit: 'contain'/);
  const config = require('../app.json'); assert.equal(config.expo.web.favicon, './src/asset/SE_LOGO.png');
});

test('web Korean typography uses a locally shipped variable font and does not synthesize fake bold', () => {
  const font = fs.readFileSync(path.join(__dirname, '../public/fonts/PretendardVariable.woff2'));
  assert.equal(font.subarray(0, 4).toString(), 'wOF2');
  const license = fs.readFileSync(path.join(__dirname, '../public/fonts/Pretendard-LICENSE.txt'), 'utf8');
  assert.match(license, /SIL OPEN FONT LICENSE/);
  const css = fs.readFileSync(path.join(__dirname, '../global.css'), 'utf8');
  assert.match(css, /font-weight: 45 920/);
  assert.match(css, /font-synthesis: none/);
  assert.match(css, /url\('\/fonts\/PretendardVariable.woff2'\)/);
});
