// Branch chats against the fake claude: arguments, context, follow-ups, nesting, images, rename, delete.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { sandbox, startServer, writeSession, line, fakeCalls, sleep } from './support/harness.mjs';

const PNG_1PX = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function setup(t) {
  const sb = sandbox(); t.after(sb.cleanup);
  const sid = writeSession(sb, [
    line.user('How should we store sessions?'),
    line.apiRequest('claude-sonnet-5-5', 'high'),
    line.assistant('m1', 'Use Redis with a TTL so stale sessions expire on their own.'),
  ]);
  const srv = await startServer(sb); t.after(srv.stop);
  const store = () => JSON.parse(fs.readFileSync(path.join(sb.data, sid + '.json'), 'utf8'));
  return { sb, sid, srv, store };
}
const last = (events) => events[events.length - 1];

test('a new branch runs claude with the picked context, model, effort and read-only tools', async (t) => {
  const { sb, sid, srv, store } = await setup(t);
  const events = await srv.stream('/api/branch', { session: sid, anchor: 1, selection: 'a TTL', question: 'What is a TTL?', model: 'haiku', effort: 'low', readTools: true });
  assert.equal(events[0].type, 'branch');
  assert.ok(events.some((e) => e.type === 'delta'));
  assert.equal(last(events).type, 'done');
  const b = last(events).branch;
  assert.deepEqual(b.messages.map((m) => [m.role, m.text]), [['user', 'What is a TTL?'], ['assistant', 'echo: What is a TTL?']]);
  assert.ok(b.sessionId);
  assert.deepEqual(store().branches.map((x) => x.id), [b.id]);

  const call = fakeCalls(sb).at(-1);
  const arg = (k) => call.args[call.args.indexOf(k) + 1];
  assert.equal(arg('--model'), 'haiku');
  assert.equal(arg('--effort'), 'low');
  assert.equal(arg('--tools'), 'Read,Grep,Glob');
  const ctx = fs.readFileSync(arg('--append-system-prompt-file'), 'utf8');
  assert.match(ctx, /a TTL/);
  assert.match(ctx, /How should we store sessions\?/);
  assert.match(ctx, /Use Redis with a TTL/);
});

test('follow-ups resume the branch session; "@main" follows the main conversation', async (t) => {
  const { sb, sid, srv } = await setup(t);
  const b = last(await srv.stream('/api/branch', { session: sid, anchor: 1, question: 'first' })).branch;
  const done = last(await srv.stream(`/api/branch/${b.id}/ask`, { session: sid, question: 'second', model: '@main', effort: '' }));
  assert.equal(done.branch.messages.length, 4);
  const call = fakeCalls(sb).at(-1);
  const arg = (k) => call.args[call.args.indexOf(k) + 1];
  assert.equal(arg('--resume'), b.sessionId);
  assert.equal(arg('--model'), 'claude-sonnet-5-5');
  assert.equal(arg('--effort'), 'high');
  assert.equal(arg('--tools'), '');
});

test('nested branches get the parent message as context; deleting the parent removes them', async (t) => {
  const { sb, sid, srv, store } = await setup(t);
  const parent = last(await srv.stream('/api/branch', { session: sid, anchor: 1, question: 'Why Redis?' })).branch;
  const child = last(await srv.stream('/api/branch', { session: sid, parent: parent.id, parentMsg: 1, selection: 'echo', question: 'Go deeper' })).branch;
  assert.equal(child.parent, parent.id);
  const ctxFile = path.join(sb.data, 'ctx', child.id + '.md');
  assert.match(fs.readFileSync(ctxFile, 'utf8'), /nested branch[\s\S]*Why Redis\?/);

  const bad = await srv.post('/api/branch', { session: sid, parent: parent.id, parentMsg: 99, question: 'x' });
  assert.equal(bad.status, 400);

  assert.equal((await srv.del(`/api/branch/${parent.id}?session=${sid}`)).status, 200);
  assert.deepEqual(store().branches, []);
  assert.equal(fs.existsSync(ctxFile), false);
});

test('images go to claude as stream-json, are stored, served with the token only, and removed with the branch', async (t) => {
  const { sb, sid, srv } = await setup(t);
  const b = last(await srv.stream('/api/branch', { session: sid, anchor: 1, question: 'see', images: [{ media_type: 'image/png', data: PNG_1PX }] })).branch;
  assert.equal(b.messages[1].text, 'echo: see [1 image]');
  const call = fakeCalls(sb).at(-1);
  assert.equal(call.args[call.args.indexOf('--input-format') + 1], 'stream-json');
  assert.deepEqual(b.messages[0].images, ['0-0.png']);
  assert.equal((await fetch(`${srv.base}/img/${b.id}/0-0.png?t=${srv.token}`)).status, 200);
  assert.equal((await fetch(`${srv.base}/img/${b.id}/0-0.png`)).status, 403);

  const bad = await srv.post('/api/branch', { session: sid, anchor: 1, question: 'x', images: [{ media_type: 'text/html', data: 'PGI+' }] });
  assert.equal(bad.status, 400);

  await srv.del(`/api/branch/${b.id}?session=${sid}`);
  assert.equal(fs.existsSync(path.join(sb.data, 'img', b.id)), false);
});

test('a branch deleted while answering does not come back', async (t) => {
  const { sid, srv, store } = await setup(t);
  const r = await srv.post('/api/branch', { session: sid, anchor: 1, question: 'SLOW please' });
  const reader = r.body.getReader(); const dec = new TextDecoder();
  let buf = '', bid = null, deleted = false;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    if (!bid) { const m = buf.match(/"type":"branch","branch":\{"id":"([a-z0-9]+)"/); if (m) bid = m[1]; }
    if (bid && !deleted && buf.includes('"type":"delta"')) { deleted = true; assert.equal((await srv.del(`/api/branch/${bid}?session=${sid}`)).status, 200); }
  }
  const events = buf.trim().split('\n').map((l) => JSON.parse(l));
  assert.equal(last(events).type, 'gone');
  assert.deepEqual(store().branches, []);
});

test('rename sets and clears a title', async (t) => {
  const { sid, srv, store } = await setup(t);
  const b = last(await srv.stream('/api/branch', { session: sid, anchor: 1, question: 'q' })).branch;
  assert.equal((await (await srv.patch(`/api/branch/${b.id}`, { session: sid, title: '  Redis   TTL  ' })).json()).title, 'Redis TTL');
  assert.equal(store().branches[0].title, 'Redis TTL');
  await srv.patch(`/api/branch/${b.id}`, { session: sid, title: '' });
  assert.equal(store().branches[0].title, undefined);
});

test('rejects bad input: empty question, unknown message, invalid model', async (t) => {
  const { sid, srv } = await setup(t);
  assert.equal((await srv.post('/api/branch', { session: sid, anchor: 1, question: '  ' })).status, 400);
  assert.equal((await srv.post('/api/branch', { session: sid, anchor: 42, question: 'x' })).status, 400);
  const events = await srv.stream('/api/branch', { session: sid, anchor: 1, question: 'x', model: 'gpt-4; rm -rf /' });
  assert.equal(last(events).type, 'done');
  assert.equal(last(events).branch.model, ''); // the invalid value was ignored
});

test('a damaged branch store is kept and never overwritten', async (t) => {
  const { sb, sid, srv } = await setup(t);
  fs.mkdirSync(sb.data, { recursive: true });
  const file = path.join(sb.data, sid + '.json');
  fs.writeFileSync(file, '{"branches":[{"id":"keep"');
  const r = await srv.post('/api/branch', { session: sid, anchor: 1, question: 'x' });
  assert.equal(r.status, 500);
  assert.equal(fs.readFileSync(file, 'utf8'), '{"branches":[{"id":"keep"');
  assert.ok(fs.readdirSync(sb.data).some((f) => f.startsWith(sid + '.json.corrupt-')));
  assert.equal((await srv.post('/api/ping')).status, 200); // and the server is still up
});

test('model list comes from probing claude and is cached per Claude Code version', async (t) => {
  const { sb, srv } = await setup(t);
  const { models } = await srv.getJson('/api/models');
  const byValue = Object.fromEntries(models.map((m) => [m.value, m]));
  assert.equal(byValue[''].isDefault, true);
  assert.equal(byValue.haiku.id, 'claude-haiku-5-5');
  assert.equal(byValue['opus[1m]'].ctx1m, true);
  assert.ok(byValue.sonnet.efforts.includes('xhigh'));
  const cache = JSON.parse(fs.readFileSync(path.join(sb.data, 'models.json'), 'utf8'));
  assert.equal(cache.version, '0.0.0-fake (Claude Code)');
  await sleep(10);
});
