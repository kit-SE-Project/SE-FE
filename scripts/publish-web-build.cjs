const fs = require('node:fs');
const path = require('node:path');

function publishWebBuild(staging, destination) {
  staging = path.resolve(staging); destination = path.resolve(destination);
  if (staging === destination) throw new Error('빌드 임시 폴더와 공개 폴더는 달라야 합니다.');
  const index = fs.readFileSync(path.join(staging, 'index.html'));
  fs.mkdirSync(destination, { recursive: true });
  // Keep previous hashed assets: cached pages/history entries may still request them.
  // Copy every asset first; replace the HTML only when its dependencies are ready.
  for (const name of fs.readdirSync(staging)) {
    if (name !== 'index.html') fs.cpSync(path.join(staging, name), path.join(destination, name), { recursive: true });
  }
  const next = path.join(destination, `.index-${process.pid}.tmp`);
  fs.writeFileSync(next, index);
  fs.renameSync(next, path.join(destination, 'index.html'));
}
module.exports = { publishWebBuild };
