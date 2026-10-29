# WSL Action Buttons

Standalone VS Code extension for terminal actions in WSL.

## Actions

- **Pegar:** opens or reuses a terminal and pastes a single-line clipboard
  command without appending Enter. The command remains unexecuted.
- **Copiar todo:** selects and copies the active terminal buffer.

Multiline clipboard content is deliberately rejected to avoid accidentally
executing commands in an interactive shell.

## Development

Requirements: VS Code, Node.js and npm.

Run static tests:

    npm test

This initial version needs manual validation in a VS Code WSL window.
The tests do not simulate a real terminal or VS Code extension host.

## Installation

Package the extension as a VSIX using `@vscode/vsce`, then install the
VSIX in the intended VS Code environment.
