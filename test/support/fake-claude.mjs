#!/usr/bin/env node
// A stand-in for the `claude` CLI, used by the tests through TANGENT_CLAUDE_BIN.
// It speaks the slice of `claude -p --output-format stream-json` that Tangent reads,
// costs nothing, and logs every call to FAKE_CLAUDE_LOG so tests can check the arguments.
//
// Prompt switches: a prompt containing "SLOW" streams slowly (for cancel/delete tests).
import fs from 'node:fs';
import crypto from 'node:crypto';

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };

if (args.includes('--version')) { console.log('0.0.0-fake (Claude Code)'); process.exit(0); }

let stdin = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => (stdin += d));
process.stdin.on('end', main);

async function main() {
  let prompt = stdin, images = 0;
  if (opt('--input-format') === 'stream-json') {
    const msg = JSON.parse(stdin.trim().split('\n')[0]);
    const content = msg.message.content;
    images = content.filter((c) => c.type === 'image').length;
    prompt = content.filter((c) => c.type === 'text').map((c) => c.text).join('\n');
  }
  if (process.env.FAKE_CLAUDE_LOG) fs.appendFileSync(process.env.FAKE_CLAUDE_LOG, JSON.stringify({ pid: process.pid, args, prompt, images }) + '\n');

  const alias = (opt('--model') || 'default').replace(/\[1m\]$/, '');
  const model = { default: 'claude-opus-5-5', best: 'claude-opus-5-5', opus: 'claude-opus-5-5', fable: 'claude-fable-5-2', sonnet: 'claude-sonnet-5-5', haiku: 'claude-haiku-5-5' }[alias] || alias;
  const sessionId = opt('--resume') || crypto.randomUUID();
  const out = (o) => process.stdout.write(JSON.stringify({ ...o, session_id: sessionId }) + '\n');
  out({ type: 'system', subtype: 'init', model });

  const slow = prompt.includes('SLOW');
  const text = prompt.includes('<side_discussion>')
    ? '---\ntitle: Fake note\n---\n# Fake note\n\nPROMPT:\n' + prompt
    : `echo: ${prompt.slice(0, 80)}${images ? ` [${images} image${images > 1 ? 's' : ''}]` : ''}` + (slow ? ' ' + 'tick '.repeat(200) : '');
  out({ type: 'stream_event', event: { type: 'message_start' } });
  for (let i = 0; i < text.length; i += 12) {
    out({ type: 'stream_event', event: { type: 'content_block_delta', delta: { type: 'text_delta', text: text.slice(i, i + 12) } } });
    await new Promise((r) => setTimeout(r, slow ? 60 : 1));
  }
  out({ type: 'assistant', message: { content: [{ type: 'text', text }] } });
  out({ type: 'result', subtype: 'success', is_error: false, result: text });
}
