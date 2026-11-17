// Server security checks and the /tg launcher (right session, one server per folder).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { sandbox, startServer, writeSession, line, SERVER, sleep, isAlive } from './support/harness.mjs';

test('requests need the token, the right Host and Origin; ids are validated', async (t) => {
  const sb = sandbox(); t.after(sb.cleanup);
  const sid = writeSession(sb, [line.user('hi')]);
  const srv = await startServer(sb); t.after(srv.stop);
  const raw = (url, headers = {}) => fetch(srv.base + url, { headers });
  assert.equal((await raw('/api/sessions')).status, 403);
  assert.equal((await raw('/api/sessions', { 'x-tangent-token': 'wrong' })).status, 403);
  assert.equal((await raw('/api/sessions', { 'x-tangent-token': srv.token, origin: 'https://evil.example' })).status, 403);
  assert.equal((await raw('/')).status, 403);
  assert.equal((await raw('/?t=' + srv.token)).status, 200);
  assert.equal((await srv.get('/api/thread?session=..%2F..%2Fsecret')).status, 500);
  assert.equal((await srv.post('/api/branch', { session: '../x', anchor: 0, question: 'q' })).status, 400);
  assert.equal((await srv.get(`/api/thread?session=${sid}`)).status, 200);
  // Host header check (fetch cannot change Host, so use a raw request)
  const http = await import('node:http');
  const status = await new Promise((resolve) => {
    http.get({ host: '127.0.0.1', port: srv.port, path: '/api/sessions', headers: { host: 'evil.example', 'x-tangent-token': srv.token } }, (r) => { r.resume(); resolve(r.statusCode); });
  });
  assert.equal(status, 403);
});

test('/tg opens the session it was typed in and reuses the running server', async (t) => {
  const sb = sandbox(); t.after(sb.cleanup);
  const older = writeSession(sb, [line.title('Older'), line.user('a')]);
  await sleep(30);
  writeSession(sb, [line.title('Newer'), line.user('b')]);
  const env = { ...sb.env, CLAUDE_CODE_SESSION_ID: older };
  const launch = () => execFileSync(process.execPath, [SERVER, '--launch'], { cwd: sb.proj, env }).toString();
  const first = launch();
  const runFile = fs.readdirSync(sb.data).find((f) => f.startsWith('run-'));
  const run = JSON.parse(fs.readFileSync(path.join(sb.data, runFile), 'utf8'));
  const stopServer = async () => { try { process.kill(run.pid); } catch {} for (let i = 0; i < 50 && isAlive(run.pid); i++) await sleep(100); };
  const html = await (await fetch(`http://127.0.0.1:${run.port}/?t=${run.token}`)).text();
  assert.equal(JSON.parse(html.match(/const BOOT = (\{.*?\});/)[1]).session, older);
  const second = launch();
  assert.equal(second.match(/127\.0\.0\.1:(\d+)/)[1], first.match(/127\.0\.0\.1:(\d+)/)[1], 'second /tg should reuse the server');
  assert.equal(fs.readdirSync(sb.data).filter((f) => f.startsWith('run-')).length, 1);
  await stopServer(); // before the sandbox is removed (Windows cannot delete a folder a process runs in)
});
