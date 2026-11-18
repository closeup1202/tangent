# Security

Tangent runs a local web server that can read your Claude Code sessions and start `claude` processes. Security reports are taken seriously.

## Reporting a vulnerability

Please **don't open a public issue**. Report it privately through GitHub: **Security → Report a vulnerability** on this repository.

Include what an attacker could do, how to reproduce it, and the Tangent version shown in the header. You should get a reply within a few days.

## What Tangent is designed to guarantee

- The server listens only on `127.0.0.1`.
- Every API call needs the random token created for that launch. `Host` and `Origin` headers are checked, so other websites and other machines cannot use it.
- Claude Code's session files are only read, never written.
- Branch chats cannot edit files or run commands. At most they get read-only `Read`, `Grep` and `Glob`, and anything that would need a permission prompt is denied.
- All session and model text is escaped before it is shown in the page.

A way around any of these is a vulnerability. Please report it.
