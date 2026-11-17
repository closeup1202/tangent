---
description: Open this conversation in the browser and branch side-chats off selected text (Tangent)
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/server.mjs" --launch:*)
---

!`node "${CLAUDE_PLUGIN_ROOT}/server.mjs" --launch`

Above is the output of the Tangent launcher. If it succeeded, reply with one short line saying Tangent opened in the browser, in the user's language. If it shows an error, briefly relay only the error. Do nothing else.
