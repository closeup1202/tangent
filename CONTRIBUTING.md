# Contributing to Tangent

Thanks for helping! Bug reports, small fixes, docs and translations are all welcome. For a bigger change, please open an issue first so we can agree on the approach before you write code.

## Run it from your checkout

You need Node.js 18+ and a logged-in [Claude Code](https://code.claude.com/docs).

```bash
git clone https://github.com/closeup1202/tangent.git
cd tangent
npm test            # 23 tests, ~15 s, no network, no Claude usage
```

To try your changes in Claude Code, load the checkout as a plugin for one session. Edits to `page.html` show up on a page reload. Edits to `server.mjs` need a new server (see the note below).

```bash
cd /path/to/some/project
claude --plugin-dir /path/to/tangent
# then type /tangent:tg (or /tg)
```

You can also start it without Claude Code's command. Run this from a folder that has Claude Code sessions:

```bash
node /path/to/tangent/server.mjs --launch
```

A server runs per project folder and stops after 10 minutes without requests. After changing `server.mjs`, either wait for it to stop or end it, then run `/tg` again. The running server's pid is in `~/.claude/tangent/data/run-*.json`.

## Where things are

There are no dependencies and no build step. Each file is organised in sections marked with `// ------` or `/* ---------- */` comments.

| File | Sections |
|---|---|
| `server.mjs` | launch, platform helpers (browser/terminal/claude binary), **session reading**, branch store, images, running claude, study notes, HTTP routes |
| `page.html` | styles, i18n strings (`I18N`), Markdown renderer, thread and live refresh, branch panel, sending questions (NDJSON stream), selection → Branch, keyboard, images, model picker, summary and note windows |
| `install.mjs` | manual install of `/tg` (not used by the plugin) |
| `commands/tg.md`, `.claude-plugin/` | plugin packaging |
| `test/` | tests; `test/support/fake-claude.mjs` stands in for the `claude` CLI |

## Things to keep in mind

- **Claude Code's session format is not public.** All code that reads `~/.claude/projects/**/*.jsonl` lives in the "session reading" section of `server.mjs`. If Claude Code changes the format, fix it there and add a fixture line to `test/session.test.mjs`.
- **The user's session is read-only.** Tangent must never write to Claude Code's files.
- **Branches cannot edit or execute.** They run with no tools, or read-only `Read,Grep,Glob`. Please don't add tools that need a permission prompt, since there is no way to show one.
- **No dependencies.** Node built-ins on the server, plain JS and CSS in the page, no CDN.
- **Escape everything** that goes into `innerHTML` (`esc()`). Model output and session text are untrusted.
- **Every user-facing string needs both `en` and `ko`** in `I18N` in `page.html`. If you don't speak Korean, add the English one and say so in the PR; it will be translated.
- **Windows, macOS and Linux all matter.** Mind paths with spaces and non-ASCII characters, symlinked folders, and `claude.cmd` on Windows. CI runs all three.

## Tests

`npm test` starts real Tangent servers against temporary folders and the fake `claude`.

- **What the fake logs:** the arguments of every call go to the file in `FAKE_CLAUDE_LOG`, so tests can check what Tangent asked for.
- **Slow answers:** a prompt containing `SLOW` makes the fake stream slowly, for cancel and delete tests.
- **Please add a test with each fix or feature**, next to similar ones (`session`, `branch`, `notes`, `server`, `install`).

UI behaviour (clicks, selection, rendering) isn't covered by automated tests yet. For page changes, describe in the PR what you clicked through, on which OS and browser.

## Pull requests

- One topic per PR. Keep the diff focused.
- Commit messages in English, with a short tag: `[feat]`, `[fix]`, `[perf]`, `[docs]`, `[test]`, `[chore]`.
- Add a line to `CHANGELOG.md` under an "Unreleased" heading. The maintainer sets the version.
- Make sure `npm test` passes.

## Reporting bugs

Use the bug report template. The most useful details are the output of `claude --version`, your OS, how you installed Tangent (plugin or manual), and the version shown in Tangent's header.

**Don't paste session contents** that may include private code or data.

For security problems, see [SECURITY.md](SECURITY.md) instead of opening a public issue.
