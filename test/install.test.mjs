// The manual installer: writes its own files, backs up an unrelated /tg, removes only what it wrote.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { REPO } from './support/harness.mjs';

function home(t) {
  const h = fs.mkdtempSync(path.join(os.tmpdir(), 'tangent-home-'));
  t.after(() => fs.rmSync(h, { recursive: true, force: true }));
  const run = (...args) => execFileSync(process.execPath, [path.join(REPO, 'install.mjs'), ...args], { env: { ...process.env, HOME: h, USERPROFILE: h } }).toString();
  return { h, run, cmd: path.join(h, '.claude', 'commands', 'tg.md'), shim: path.join(h, '.claude', 'tangent', 'launch.mjs') };
}

test('install writes the command and launcher; uninstall removes them', (t) => {
  const { run, cmd, shim } = home(t);
  run();
  const text = fs.readFileSync(cmd, 'utf8');
  assert.match(text, /tangent:generated-command/);
  assert.match(text, /allowed-tools: Bash\(node .*launch\.mjs --launch:\*\)/);
  assert.match(fs.readFileSync(shim, 'utf8'), /server\.mjs/);
  run(); // running it again is fine
  run('--uninstall');
  assert.equal(fs.existsSync(cmd), false);
  assert.equal(fs.existsSync(shim), false);
});

test('an unrelated tg.md is backed up on install and left alone on uninstall', (t) => {
  const { run, cmd } = home(t);
  fs.mkdirSync(path.dirname(cmd), { recursive: true });
  fs.writeFileSync(cmd, 'my own /tg command, mentions tangent but is not Tangent\n');
  run();
  assert.equal(fs.readFileSync(cmd + '.bak', 'utf8'), 'my own /tg command, mentions tangent but is not Tangent\n');
  fs.writeFileSync(cmd, 'my own again\n');
  run('--uninstall');
  assert.equal(fs.readFileSync(cmd, 'utf8'), 'my own again\n');
});
