# Implementation and safety

## Status bar

The extension registers five icon-only status bar items:

| Command ID | Icon | Tooltip |
|---|---|---|
| `wslActionButtons.pasteAndExecute` | `$(clippy)` | Paste clipboard content and execute it in the active terminal; create one if needed |
| `wslActionButtons.openOpenCode` | `$(terminal)` | Open OpenCode in a dedicated terminal beside the editor |
| `wslActionButtons.openOllama` | `$(hubot)` | Open Ollama with Qwen3 8B |
| `wslActionButtons.copyAllOutput` | `$(copy)` | Select and copy the output from the active terminal |
| `wslActionButtons.clearTerminal` | `$(clear-all)` | Clear the screen and buffer of the active terminal |

Status bar items display only their icon through `item.text`. Tooltip and command are assigned independently. Descriptive English titles are supplied by the manifest for the Command Palette.

## Paste behavior

1. Reuse the active terminal when one exists.
2. Otherwise create a terminal using VS Code's configured default terminal profile.
3. Show the terminal and wait for its shell process to become available.
4. Read clipboard content and remove trailing line breaks.
5. Call `sendText(content, true)` so clipboard content is executed once.

## OpenCode behavior

Open OpenCode in a dedicated terminal beside the editor. Reuse it while it remains open; reset its reference when it closes.

## Ollama behavior

Open Ollama in a dedicated terminal beside the editor. Reuse it while it remains open; reset its reference when it closes. The command executed is `ollama run qwen3:8b-nothink`.

## Copy and clear behavior

Copy selects the terminal buffer and invokes VS Code's copy-selection command. It is limited to available scrollback content.

Clear invokes VS Code's built-in terminal clear command. It does not delete persistent shell history files.

## Validation limitations

Automated tests check the manifest, icon-only status bar configuration, tooltips, command registrations, and key source invariants. They do not prove runtime behavior. Validate manually in a VS Code WSL window before using or publishing the extension.
