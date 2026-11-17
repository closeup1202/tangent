// Reading Claude Code session logs: parsing rules, incremental reads, format-change warning.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { sandbox, startServer, writeSession, line, sleep } from './support/harness.mjs';

const fixture = () => [
  line.title('Old title'),
  line.user('What is a mutex?'),
  line.apiRequest('claude-sonnet-5-5', 'high'),
  line.assistant('m1', 'A lock that'),
  line.toolResult(),
  line.assistant('m1', 'lets one thread in at a time.'), // same message id: merged with the part above
  line.user('<system-reminder>internal</system-reminder>And a semaphore?'),
  line.assistant('m2', 'A counter of permits. 한글 ✓'),
  line.user('<command-name>/tg</command-name><command-args></command-args>'),
  line.user('side', { isSidechain: true }), // subagent traffic: ignored
  line.user('meta', { isMeta: true }), // ignored
  line.user([{ type: 'image', source: {} }, { type: 'text', text: 'Look at this' }]),
  line.title('New title'),
];

test('parses messages, merges split answers, skips internal lines', async (t) => {
  const sb = sandbox(); t.after(sb.cleanup);
  const sid = writeSession(sb, fixture());
  const srv = await startServer(sb); t.after(srv.stop);
  const data = await srv.getJson('/api/thread?session=' + sid);
  assert.deepEqual(data.items.map((i) => [i.role, i.text]), [
    ['user', 'What is a mutex?'],
    ['assistant', 'A lock that\n\nlets one thread in at a time.'],
    ['user', 'And a semaphore?'],
    ['assistant', 'A counter of permits. 한글 ✓'],
    ['user', '/tg'],
    ['user', 'Look at this\n[image]'],
  ]);
  assert.deepEqual(data.items.map((i) => i.i), [0, 1, 2, 3, 4, 5]);
  assert.equal(data.title, 'New title');
  assert.deepEqual(data.mainSpec, { model: 'claude-sonnet-5-5', effort: 'high' });
  assert.equal(data.formatWarning, false);
});

test('appended bytes give the same result as one full read, even when lines and UTF-8 are split', async (t) => {
  const sb = sandbox(); t.after(sb.cleanup);
  const all = Buffer.from(fixture().map((l) => JSON.stringify(l)).join('\n') + '\n');
  const ref = writeSession(sb, fixture());
  const sid = writeSession(sb, []);
  const file = path.join(sb.projDir, sid + '.jsonl');
  fs.writeFileSync(file, '');
  const srv = await startServer(sb); t.after(srv.stop);
  const expected = (await srv.getJson('/api/thread?session=' + ref)).items;
  for (let pos = 0, k = 1; pos < all.length; k++) {
    const n = 1 + ((k * 37) % 97); // small uneven pieces: cuts lines and multi-byte characters
    fs.appendFileSync(file, all.subarray(pos, pos + n)); pos += n;
    fs.utimesSync(file, new Date(), new Date(Date.now() + k * 1000)); // a new mtime each time
    await srv.getJson('/api/thread?session=' + sid);
  }
  assert.deepEqual((await srv.getJson('/api/thread?session=' + sid)).items, expected);
});

test('a rewritten (shorter) log is read again from the start', async (t) => {
  const sb = sandbox(); t.after(sb.cleanup);
  const sid = writeSession(sb, fixture());
  const srv = await startServer(sb); t.after(srv.stop);
  assert.equal((await srv.getJson('/api/thread?session=' + sid)).items.length, 6);
  await sleep(20);
  writeSession(sb, [line.user('Only one')], sid);
  assert.deepEqual((await srv.getJson('/api/thread?session=' + sid)).items.map((i) => i.text), ['Only one']);
});

test('warns when a long log yields no messages (likely a Claude Code format change)', async (t) => {
  const sb = sandbox(); t.after(sb.cleanup);
  const sid = writeSession(sb, Array.from({ length: 30 }, (_, k) => ({ kind: 'turn', v: 2, body: 'unknown shape ' + k })));
  const srv = await startServer(sb); t.after(srv.stop);
  const data = await srv.getJson('/api/thread?session=' + sid);
  assert.equal(data.items.length, 0);
  assert.equal(data.formatWarning, true);
});

test('session list: newest first, titles, branch sessions hidden', async (t) => {
  const sb = sandbox(); t.after(sb.cleanup);
  const older = writeSession(sb, [line.title('Older'), line.user('a')]);
  await sleep(30);
  const newer = writeSession(sb, [line.title('Newer'), line.user('b')]);
  const branchSession = writeSession(sb, [line.user('branch talk')]);
  fs.mkdirSync(sb.data, { recursive: true });
  fs.writeFileSync(path.join(sb.data, older + '.json'), JSON.stringify({ branches: [{ id: 'aa', anchor: 0, sessionId: branchSession, messages: [] }] }));
  const srv = await startServer(sb); t.after(srv.stop);
  const { sessions } = await srv.getJson('/api/sessions');
  assert.deepEqual(sessions.map((s) => [s.id, s.title]).filter(([id]) => id !== branchSession).slice(0, 2), [[newer, 'Newer'], [older, 'Older']]);
  assert.ok(!sessions.some((s) => s.id === branchSession));
});
