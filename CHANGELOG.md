# Changelog

All notable changes to Tangent. Versions follow `.claude-plugin/plugin.json`.

## 0.2.0 — 2026-11-18

First public release.

### Added
- Automated tests (`npm test`): session-log parsing and incremental reads, branch chats, nested branches, images, rename, delete-while-answering, notes and summaries, server security checks, the `/tg` launcher and the manual installer. They run against a fake `claude`, so they need no network and use no Claude quota.
- CI on Linux, macOS and Windows with Node 18 and 22.
- A visible warning when a session has plenty of log lines but no readable messages, which most likely means Claude Code changed its log format. The warning asks you to open an issue.
- `CLAUDE_CONFIG_DIR` is honoured when finding sessions, the same way Claude Code honours it.

## 0.1.6 — 2026-11-17
### Fixed
- **Note** and **Bring back** now describe the branch itself. Before, they could describe the main-conversation context the branch started from. The output language follows the language you wrote in.

## 0.1.5 — 2026-11-17
### Performance
- Session logs are read incrementally. On a 21 MB session, live refresh went from 240–290 ms to 5–7 ms, and server memory from about 200 MB to about 50 MB.
- Session titles are cached.
- The model list is probed only when you open the picker, and cached per Claude Code version.

### Fixed
- A branch store that cannot be read is no longer treated as empty, which could wipe your other branches. A damaged file is copied aside and left untouched.
- `/tg` opens the session it was typed in, and reuses a server already running for the folder.
- Closing the Note or Bring back window stops the Claude run.
- Every run has a 20-minute limit.
- Opening a terminal no longer blocks the server.
- Rename, nested-branch effort, quick double sends and interrupted streams are handled correctly.

## 0.1.4 — 2026-11-17
### Added
- Images in branch questions: paste, drop or attach.
- A `/model`-style model and effort picker. By default it follows the main conversation.
- **Note**: save what you learned in a branch as a Markdown study note.

## 0.1.3 — 2026-11-17
### Added
- **Continue in terminal** opens in the terminal you ran `/tg` from: herdr, tmux, WezTerm, Windows Terminal, Ghostty or iTerm2. `TANGENT_TERMINAL` overrides it.

## 0.1.2 — 2026-11-17
### Changed
- **Bring back** opens at once and streams the summary in.

## 0.1.1 — 2026-11-17
### Added
- Rename branches.
- The version is shown in the header.

### Fixed
- Bring back, Delete and the terminal notices did nothing when clicked.
- A branch deleted while answering came back.
- Switching sessions mid-request mixed data between sessions.

## 0.1.0 — 2026-11-17
- Initial version, packaged as a Claude Code plugin:
  - branch from a sentence
  - streaming answers
  - live refresh
  - read-only file tools
  - nested branches
  - export, search and keyboard shortcuts
  - English and Korean UI
