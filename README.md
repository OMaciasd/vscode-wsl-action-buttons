# WSL Action Buttons

Quick actions for the integrated VS Code terminal, designed for VS Code
running in WSL.

## Status bar actions

- **Pegar y ejecutar:** reads the clipboard and executes its content in the
  active terminal. If no terminal is active, creates one using VS Code's
  configured default terminal profile.
- **Abrir OpenCode:** opens `opencode` in a dedicated terminal beside the
  editor. Reuses that terminal while it remains open.
- **Copiar output:** selects and copies the available terminal buffer using
  VS Code's built-in terminal commands.
- **Limpiar:** clears the active terminal using VS Code's built-in clear
  command. It does not delete persistent shell history files.

## Requirements

- VS Code 1.85 or later.
- VS Code integrated terminal.
- For OpenCode, the `opencode` executable must be available in the terminal's
  `PATH`.

## Notes

Pegar y ejecutar intentionally executes clipboard content. Verify the
clipboard before pressing the button, especially when it contains commands
or multiline scripts.

Copy output is limited to the terminal contents available in VS Code's
scrollback buffer. It does not retrieve output that has already been discarded.

The extension uses VS Code's configured default terminal profile when it
creates a terminal; it does not force Bash or Zsh.

## Development

Run tests:

```bash
npm test
```

Validate JavaScript syntax:

```bash
node --check extension.js
```
