const fs = require('node:fs');
const path = require('node:path');

const input = path.resolve(__dirname, '../src/asset/SE_LOGO.png');
const output = path.resolve(__dirname, '../src/asset/se-logo-web.cjs');
const png = fs.readFileSync(input);
if (png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('SE_LOGO.png must be a PNG image.');
const asset = { uri: `data:image/png;base64,${png.toString('base64')}`, width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
const source = `// Generated from SE_LOGO.png by scripts/sync-brand-logo.cjs.\nmodule.exports = ${JSON.stringify(asset)};\n`;
if (!fs.existsSync(output) || fs.readFileSync(output, 'utf8') !== source) fs.writeFileSync(output, source);
console.log(`SE logo synced: ${png.length} bytes, ${asset.width}x${asset.height}`);
