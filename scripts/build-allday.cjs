const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const { publishWebBuild } = require('./publish-web-build.cjs');
const cwd = path.resolve(__dirname, '../apps/server-allday');
const work = path.resolve(__dirname, '../.local-only/builds');
fs.mkdirSync(work, { recursive: true });
const staging = fs.mkdtempSync(path.join(work, 'allday-'));
const npm = process.env.npm_execpath || path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
try {
  const result = spawnSync(process.execPath, [npm, 'run', 'build:web', '--', '--output-dir', staging], {
    cwd, stdio: 'inherit', env: { ...process.env, EXPO_PUBLIC_SEBOARD_SSO_ENABLED: 'true', EXPO_OFFLINE: '1' },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status ?? 1;
  else { publishWebBuild(staging, path.join(cwd, 'dist')); console.log('서버 대여 웹 빌드 반영 완료. 이전 화면의 파일은 유지합니다.'); }
} finally {
  if (path.dirname(path.resolve(staging)) !== work || !path.basename(staging).startsWith('allday-')) throw new Error('임시 빌드 경로를 확인하세요.');
  fs.rmSync(staging, { recursive: true, force: true });
}
