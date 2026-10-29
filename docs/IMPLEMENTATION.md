# Implementation and safety

## Paste behavior

1. Reuse the named terminal or the active terminal.
2. If neither exists, create a terminal using the configured WSL-side shell.
3. Wait for the terminal process to be created.
4. Read clipboard content and remove trailing line breaks.
5. Reject embedded line breaks because interactive shells may execute
   multiline input.
6. Call `sendText(text, false)` so the extension does not append Enter.

## Copy behavior

Select the terminal buffer and invoke VS Code's copy-selection command.

## Validation limitations

Automated tests check the manifest and key source invariants. They do not
prove runtime behavior. Validate manually in a VS Code WSL window before
using or publishing the extension.
