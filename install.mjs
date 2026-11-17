// cq-web 설치: Claude Code 에 /cq 명령을 등록한다. Windows·macOS·Linux 공통.
//
//   node install.mjs               설치 (다시 실행해도 된다. 레포를 옮겼으면 다시 실행)
//   node install.mjs --uninstall   /cq 명령과 실행 파일 제거 (가지 기록은 남긴다)
//   node install.mjs --uninstall --purge   가지 기록까지 제거

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const MARK = 'cq-web';
const major = Number(process.versions.node.split('.')[0]);
if (major < 18) { console.error(`Node 18 이상이 필요합니다 (현재 ${process.version}).`); process.exit(1); }

const repo = path.dirname(fileURLToPath(import.meta.url));
const home = os.homedir();
const base = path.join(home, '.claude', 'cq-web');
const data = path.join(base, 'data');
const shim = path.join(base, 'launch.mjs');
const cmdDir = path.join(home, '.claude', 'commands');
const cmdFile = path.join(cmdDir, 'cq.md');
const args = process.argv.slice(2);

if (args.includes('--uninstall')) {
  fs.rmSync(shim, { force: true });
  if (fs.existsSync(cmdFile) && fs.readFileSync(cmdFile, 'utf8').includes(MARK)) fs.rmSync(cmdFile);
  if (args.includes('--purge')) fs.rmSync(base, { recursive: true, force: true });
  console.log('제거했습니다.' + (args.includes('--purge') ? '' : ` 가지 기록은 ${data} 에 남아 있습니다.`));
  process.exit(0);
}

fs.mkdirSync(path.join(data, 'ctx'), { recursive: true });
fs.mkdirSync(cmdDir, { recursive: true });

// 1. 실행 진입점. 레포 경로에 공백·한글이 있어도 /cq 명령은 공백 없는 이 경로만 부르게 한다.
const serverUrl = pathToFileURL(path.join(repo, 'server.mjs')).href;
fs.writeFileSync(shim, `// cq-web 실행 진입점 (install.mjs 가 만듦). 레포: ${repo}\nawait import(${JSON.stringify(serverUrl)});\n`);

// 2. 예전 위치(~/.claude/tools/cq-web/data)의 가지 기록을 옮긴다
const old = path.join(home, '.claude', 'tools', 'cq-web', 'data');
let moved = 0;
if (fs.existsSync(old)) {
  for (const rel of walk(old)) {
    const to = path.join(data, rel);
    if (rel.startsWith('launch-') || fs.existsSync(to)) continue;
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(path.join(old, rel), to);
    moved++;
  }
}

// 3. /cq 명령. 다른 /cq 가 이미 있으면 백업한다.
if (fs.existsSync(cmdFile) && !fs.readFileSync(cmdFile, 'utf8').includes(MARK)) {
  fs.copyFileSync(cmdFile, cmdFile + '.bak');
  console.log(`기존 ${cmdFile} 를 .bak 으로 백업했습니다.`);
}
const p = shim.split(path.sep).join('/');
const q = /\s/.test(p) ? `"${p}"` : p;
fs.writeFileSync(cmdFile, `---
description: 이 대화를 브라우저에 띄우고, 문장을 골라 가지 대화 열기 (cq-web)
allowed-tools: Bash(node ${q} --launch:*)
---

!\`node ${q} --launch\`

위는 cq-web 실행 결과다. 정상이면 "브라우저에 가지 화면을 열었습니다" 한 줄만 답하고, 오류가 보이면 오류 내용만 짧게 전한다. 다른 작업은 하지 않는다.
`);

console.log(`설치했습니다.
  /cq 명령:  ${cmdFile}
  진입점:    ${shim}
  가지 기록: ${data}${moved ? `  (예전 기록 ${moved}개를 옮겼습니다)` : ''}
Claude Code 를 다시 시작하면 /cq 를 쓸 수 있습니다.`);

function walk(dir, prefix = '') {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = path.join(prefix, e.name);
    if (e.isDirectory()) out.push(...walk(path.join(dir, e.name), rel));
    else out.push(rel);
  }
  return out;
}
