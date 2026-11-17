// Test helpers: an isolated Claude config folder, project folder and Tangent data folder per test,
// and a Tangent server started against them with the fake claude.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(HERE, '..', '..');
export const SERVER = path.join(REPO, 'server.mjs');
export const FAKE_CLAUDE = path.join(HERE, 'fake-claude.mjs');
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function sandbox() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'tangent-test-'));
  const dirs = {
    base,
    config: path.join(base, 'claude'),
    proj: path.join(base, 'my project'), // a space on purpose
    data: path.join(base, 'data'),
    notes: path.join(base, 'notes'),
    log: path.join(base, 'fake-claude.log'),
  };
  fs.mkdirSync(dirs.proj, { recursive: true });
  // Same folder naming as Claude Code: every non-alphanumeric character of the cwd becomes '-'
  dirs.projDir = path.join(dirs.config, 'projects', dirs.proj.replace(/[^A-Za-z0-9]/g, '-'));
  fs.mkdirSync(dirs.projDir, { recursive: true });
  dirs.env = {
    ...process.env,
    CLAUDE_CONFIG_DIR: dirs.config,
    TANGENT_DATA: dirs.data,
    TANGENT_NOTES_DIR: dirs.notes,
    TANGENT_CLAUDE_BIN: FAKE_CLAUDE,
    TANGENT_NO_OPEN: '1',
    FAKE_CLAUDE_LOG: dirs.log,
  };
  delete dirs.env.CLAUDE_CODE_SESSION_ID;
  // Best effort: a leftover temp folder must not fail a test
  dirs.cleanup = () => { try { fs.rmSync(base, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch {} };
  return dirs;
}

// Session log lines in Claude Code's format (only the fields Tangent reads)
export const line = {
  title: (t) => ({ type: 'ai-title', aiTitle: t }),
  user: (content, extra = {}) => ({ parentUuid: null, type: 'user', timestamp: '2026-11-01T10:00:00.000Z', message: { role: 'user', content }, ...extra }),
  assistant: (id, text, extra = {}) => ({ parentUuid: null, type: 'assistant', timestamp: '2026-11-01T10:00:01.000Z', message: { id, role: 'assistant', model: 'claude-opus-5-5', content: [{ type: 'text', text }] }, ...extra }),
  toolResult: () => ({ parentUuid: null, type: 'user', message: { role: 'user', content: [{ type: 'tool_result', content: 'x'.repeat(500) }] } }),
  apiRequest: (model, effort) => ({ type: 'api-request', querySource: 'repl_main_thread', model, params: { output_config: { effort } } }),
};

export function writeSession(sb, lines, id = crypto.randomUUID()) {
  fs.writeFileSync(path.join(sb.projDir, id + '.jsonl'), lines.map((l) => JSON.stringify(l)).join('\n') + '\n');
  return id;
}

export function fakeCalls(sb) {
  if (!fs.existsSync(sb.log)) return [];
  return fs.readFileSync(sb.log, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

export async function startServer(sb, extraArgs = []) {
  const token = crypto.randomBytes(12).toString('hex');
  const proc = spawn(process.execPath, [SERVER, '--serve', '--no-open', '--cwd', sb.proj, '--token', token, ...extraArgs], { env: sb.env, stdio: 'ignore' });
  const status = path.join(sb.data, `launch-${token}.json`);
  let port;
  for (let i = 0; i < 100 && !port; i++) { await sleep(50); try { port = JSON.parse(fs.readFileSync(status, 'utf8')).port; } catch {} }
  if (!port) { proc.kill(); throw new Error('server did not start'); }
  const base = `http://127.0.0.1:${port}`;
  const headers = { 'x-tangent-token': token, 'content-type': 'application/json' };
  const call = (method, url, body, opts = {}) => fetch(base + url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), ...opts });
  return {
    port, token, base, proc,
    get: (url) => call('GET', url),
    getJson: async (url) => { const r = await call('GET', url); if (!r.ok) throw new Error(r.status + ' ' + await r.text()); return r.json(); },
    post: (url, body, opts) => call('POST', url, body, opts),
    patch: (url, body) => call('PATCH', url, body),
    del: (url) => call('DELETE', url),
    // POST that answers in NDJSON; resolves to the list of events
    stream: async (url, body) => { const r = await call('POST', url, body); if (!r.ok) throw new Error(r.status + ' ' + await r.text()); return (await r.text()).trim().split('\n').map((l) => JSON.parse(l)); },
    stop: async () => { proc.kill(); await new Promise((r) => (proc.exitCode !== null ? r() : proc.once('exit', r))); },
  };
}

export const isAlive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
