# Implementation and safety

## Paste behavior

1. Reuse the active terminal when one exists.
2. If none is active, create a terminal using VS Code's configured default
   terminal profile.
3. Show the terminal and wait for its shell process to become available.
4. Read clipboard content and remove trailing line breaks.
5. Call `sendText(content, true)` so the clipboard content is executed once.

## Copy behavior

Select the terminal buffer and invoke VS Code's copy-selection command.

## Validation limitations

Automated tests check the manifest and key source invariants. They do not
prove runtime behavior. Validate manually in a VS Code WSL window before
using or publishing the extension.
