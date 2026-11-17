// Notes and "Bring back" summaries: written from the branch itself, saved safely, cancelled with the window.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sandbox, startServer, writeSession, line, fakeCalls, isAlive, sleep } from './support/harness.mjs';

async function setup(t, question = 'UUID v4와 v7은 뭐가 달라?') {
  const sb = sandbox(); t.after(sb.cleanup);
  const sid = writeSession(sb, [
    line.user('Clients retry POST /payments and we get double charges.'),
    line.assistant('m1', 'MAIN-ANSWER-MARKER: make the endpoint idempotent with an Idempotency-Key.'),
  ]);
  const srv = await startServer(sb); t.after(srv.stop);
  const events = await srv.stream('/api/branch', { session: sid, anchor: 1, selection: 'Idempotency-Key', question });
  return { sb, sid, srv, b: events.at(-1).branch };
}

test('a note is written one-shot from the branch transcript, in the user\'s language', async (t) => {
  const { sb, sid, srv, b } = await setup(t);
  const events = await srv.stream(`/api/branch/${b.id}/note`, { session: sid });
  assert.equal(events.at(-1).type, 'done');
  const call = fakeCalls(sb).at(-1);
  assert.ok(call.args.includes('--no-session-persistence'));
  assert.ok(!call.args.includes('--resume'), 'must not resume the branch session (its context is the main conversation)');
  assert.match(call.prompt, /<side_discussion>[\s\S]*UUID v4와 v7은 뭐가 달라\?/);
  assert.match(call.prompt, /<starting_point>[\s\S]*Idempotency-Key/);
  assert.doesNotMatch(call.prompt, /MAIN-ANSWER-MARKER/);
  assert.match(call.prompt, /in Korean/);
});

test('saving notes: date-title file names, never overwriting', async (t) => {
  const { sb, sid, srv, b } = await setup(t);
  const content = '---\ntitle: "UUID: v4 / v7?"\n---\n# UUID\nbody';
  const a = await (await srv.post(`/api/branch/${b.id}/note-save`, { session: sid, content })).json();
  const c = await (await srv.post(`/api/branch/${b.id}/note-save`, { session: sid, content })).json();
  assert.match(a.file, /\d{4}-\d{2}-\d{2}-UUID-v4-v7\.md$/);
  assert.match(c.file, /\d{4}-\d{2}-\d{2}-UUID-v4-v7-2\.md$/);
  assert.equal(fs.readFileSync(a.file, 'utf8'), content + '\n');
  assert.equal(fs.readdirSync(sb.notes).length, 2);
});

test('a summary is written from the branch, on Haiku', async (t) => {
  const { sb, sid, srv, b } = await setup(t, 'Which UUID version should the key use?');
  const events = await srv.stream(`/api/branch/${b.id}/summary`, { session: sid });
  assert.equal(events.at(-1).type, 'done');
  const call = fakeCalls(sb).at(-1);
  assert.equal(call.args[call.args.indexOf('--model') + 1], 'haiku');
  assert.match(call.prompt, /Which UUID version/);
  assert.doesNotMatch(call.prompt, /MAIN-ANSWER-MARKER/);
});

test('closing the note window stops claude', async (t) => {
  const { sb, sid, srv } = await setup(t);
  const b = (await srv.stream('/api/branch', { session: sid, anchor: 1, question: 'SLOW topic' })).at(-1).branch;
  const ac = new AbortController();
  const r = await srv.post(`/api/branch/${b.id}/note`, { session: sid }, { signal: ac.signal });
  const reader = r.body.getReader();
  await reader.read(); // the note has started streaming
  const pid = fakeCalls(sb).at(-1).pid;
  assert.ok(isAlive(pid));
  ac.abort();
  let alive = true;
  for (let i = 0; i < 40 && alive; i++) { await sleep(100); alive = isAlive(pid); }
  assert.equal(alive, false, 'claude should be stopped when the window closes');
});
