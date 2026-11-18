const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { publishWebBuild } = require('./publish-web-build.cjs');
const root = path.resolve(__dirname, '..');
const cwd = path.join(root, 'apps/se-board');
const work = path.join(root, '.local-only/builds');
fs.mkdirSync(work, { recursive: true });
const staging = fs.mkdtempSync(path.join(work, 'board-'));
const npm = process.env.npm_execpath || path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
try {
  const result = spawnSync(process.execPath, [npm, 'run', 'build'], { cwd, stdio: 'inherit', env: {
    ...process.env, BUILD_PATH: staging, DISABLE_ESLINT_PLUGIN: 'true', GENERATE_SOURCEMAP: 'false',
    REACT_APP_API_ENDPOINT: process.env.REACT_APP_API_ENDPOINT || 'https://seboard.site/v1',
    REACT_APP_ALARM_ENDPOINT: process.env.REACT_APP_ALARM_ENDPOINT || 'https://seboard.site/alarm',
  } });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status ?? 1;
  else { publishWebBuild(staging, path.join(cwd, 'build')); console.log('게시판 웹 빌드 반영 완료. 이전 화면의 파일은 유지합니다.'); }
} finally {
  if (path.dirname(path.resolve(staging)) !== work || !path.basename(staging).startsWith('board-')) throw new Error('임시 빌드 경로를 확인하세요.');
  fs.rmSync(staging, { recursive: true, force: true });
}
