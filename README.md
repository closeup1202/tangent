# Tangent

**Go off on a tangent without derailing your Claude Code session.**

[![test](https://github.com/closeup1202/tangent/actions/workflows/test.yml/badge.svg)](https://github.com/closeup1202/tangent/actions/workflows/test.yml)

English | [한국어](README.ko.md)

![Select a sentence, click Branch, ask a side question; the answer streams in the side panel and a twig grows from the main thread](docs/demo.gif)

Highlight any sentence in your Claude Code session, ask a side question about it in a panel next to it, and keep your main conversation clean.

## Quick start

You need [Claude Code](https://code.claude.com/docs) (logged in) and Node.js 18+.

**1. Install.** At the Claude Code prompt:

```
/plugin install tangent --marketplace closeup1202/tangent
```

Answer `y`, then choose the **user** scope so `/tg` works in every project.

**2. Open your session.** In any Claude Code session, type:

```
/tg
```

Your conversation opens in the browser.

**3. Branch.** Select a sentence, click **Branch** (or press `B`), and ask.

That's it. The answer streams in the side panel, and your main session is untouched.

## Features

**Branching**
- Branch from a selected sentence or a whole message, and branch again inside a branch.
- A branch sees only the part you picked, not your whole session.
- Branches show as twigs on the conversation and are saved, renamable and searchable.

**Asking**
- Paste or drop screenshots into a question.
- Turn on **Read files** to let a branch read your project (read-only).
- Pick the model and effort like `/model`. By default it follows your main conversation.

**Keeping what you learn**
- **Note** writes a study note from a branch and saves it as Markdown on your PC (Obsidian-friendly).
- **Bring back** summarizes a branch so you can paste the conclusion into the main session.
- **Export** saves a branch as Markdown.

**Comfort**
- New messages in the main session appear live.
- **Continue in terminal** reopens a branch as a full Claude Code session. herdr, tmux, WezTerm, Windows Terminal, Ghostty and iTerm2 are detected.
- Keyboard shortcuts (`B`, `/`, `Esc`), light/dark theme, English/Korean UI.

## How it differs from built-in commands

| | `/btw` | `/branch` | Tangent |
|---|---|---|---|
| Anchored to a specific sentence | – | – | ✓ |
| Answer is kept | – | ✓ | ✓ |
| Context | whole session | whole session (copied) | selected part only |
| Several side threads, visible at a glance | – | – | ✓ |
| Branch again from inside a branch | – | – | ✓ |
| Tools | none | full | optional read-only (one click to a full terminal session) |
| Bring the result back to the main thread | – | manual | ✓ (summary to paste) |

## Other ways to install

**From a shell:** `claude plugin install tangent --marketplace closeup1202/tangent`

**Command name:** `/tg` is a skill, so it shows up in the terminal, the desktop app (local sessions) and IDEs. If another command already uses that name, it is `/tangent:tg`.

**Claude desktop app:** install the plugin at user scope from a terminal (command above); desktop local sessions use the same plugins. The desktop plugin search only covers the official directory, where "Tangent Jar" is a different project.

**Manually,** without the plugin system:

```bash
git clone https://github.com/closeup1202/tangent.git
cd tangent
node install.mjs
```

This writes the `/tg` skill to `~/.claude/skills/tg/SKILL.md` (pre-allowed, so it runs without a permission prompt) and a launcher to `~/.claude/tangent/launch.mjs`. Restart Claude Code afterwards. If you move the repo, run `node install.mjs` again.

## Configuration

All settings are optional environment variables.

| Variable | What it does | Default |
|---|---|---|
| `TANGENT_NOTES_DIR` | Where **Note** saves study notes (for example your Obsidian vault) | `~/Documents/Tangent Notes` |
| `TANGENT_TERMINAL` | Your own command for **Continue in terminal**, with `{cwd}` and `{cmd}` placeholders, e.g. `open -na Ghostty.app --args --working-directory={cwd} -e {cmd}` | detected |
| `TANGENT_DATA` | Where branches, images and notes metadata are stored | `~/.claude/tangent/data` |
| `TANGENT_CLAUDE_BIN` | Path to the `claude` binary, if it is somewhere unusual | `claude` on `PATH` |
| `TANGENT_NO_OPEN` | Start without opening a browser | unset |

## How it works

| File | Role |
|---|---|
| `server.mjs` | Local server. Reads the session log and runs branch chats through `claude -p`. No dependencies. |
| `page.html` | The UI. Includes a small built-in Markdown renderer; no CDN. |
| `install.mjs` | Manual install and uninstall of the slash command. |
| `skills/tg/SKILL.md`, `.claude-plugin/` | Plugin packaging: the `/tg` skill, manifest and marketplace file. |

- **Your session is read-only.** Tangent reads `~/.claude/projects/<project>/<session>.jsonl` and never writes to it. After the first read it only reads what was appended, so live refresh stays fast on long sessions.
- **Branches are ordinary Claude Code sessions.** They run with `claude -p --tools "" --strict-mcp-config`, or with `--tools Read,Grep,Glob` when **Read files** is on. The first message gets the picked context through `--append-system-prompt-file`, and follow-ups use `--resume`. Branches count toward your normal Claude usage.
- **Branch data lives outside the repo,** in `~/.claude/tangent/data/`. It contains conversation text.

## Development

```bash
npm test
```

The tests start real Tangent servers against a fake `claude` (`test/support/fake-claude.mjs`) and temporary folders, so they need no network and use no Claude quota. CI runs them on Linux, macOS and Windows. See [CHANGELOG.md](CHANGELOG.md) for what changed.

Contributions are welcome: [CONTRIBUTING.md](CONTRIBUTING.md) explains how to run Tangent from a checkout, where things are in the code, and what to keep in mind. Report security problems privately: [SECURITY.md](SECURITY.md).

## Security

- The server listens only on `127.0.0.1`. It uses a random token per launch and checks the `Host` and `Origin` headers. One server runs per project folder.
- It shuts itself down after 10 minutes without requests.
- Branch chats can never edit files or run commands, because there is nowhere to show a permission prompt. With **Read files** on they get read-only tools, and anything that would need a permission prompt (such as reading outside the project) is denied.

## Limitations

- **Tangent depends on Claude Code's internal session format.** A Claude Code update could break parsing; Tangent then shows a warning instead of an empty page. All format-specific code is in the "session reading" section of `server.mjs`, and the tests describe the format it expects.
- **Tested on Windows and macOS.** On Linux the browser part works. If no terminal can be opened, the command is copied for you instead.
- **If `claude` was installed through npm on Windows** (`claude.cmd`), it runs through the shell.

## Uninstall

Plugin: `/plugin uninstall tangent`, or `claude plugin uninstall tangent` from a shell.

Manual install:

```bash
node install.mjs --uninstall          # remove the command and launcher, keep branch data
node install.mjs --uninstall --purge  # also delete branch data
```

## License

MIT

---

Tangent is an independent project and is not affiliated with or endorsed by Anthropic.
