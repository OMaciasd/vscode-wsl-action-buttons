'use strict';

const vscode = require('vscode');

const TERMINAL_NAME = 'WSL Action Buttons';

function findTerminal() {
    return vscode.window.terminals.find(
        terminal => terminal.name === TERMINAL_NAME
    ) || vscode.window.activeTerminal || null;
}

async function getOrCreateTerminal() {
    let terminal = findTerminal();

    if (!terminal) {
        const shellPath = process.env.SHELL || '/bin/bash';
        terminal = vscode.window.createTerminal({
            name: TERMINAL_NAME,
            shellPath
        });
    }

    terminal.show(true);

    // Wait for the terminal process to be created before sending text.
    await terminal.processId;
    return terminal;
}

async function pasteWithoutExecuting() {
    let text = await vscode.env.clipboard.readText();

    // Remove only line breaks at the end; preserve the command itself.
    text = text.replace(/[\r\n]+$/, '');

    if (!text.trim()) {
        vscode.window.showInformationMessage('El portapapeles está vacío.');
        return;
    }

    // Embedded newlines can execute commands in an interactive shell.
    // Refuse multiline input instead of risking accidental execution.
    if (/[\r\n]/.test(text)) {
        vscode.window.showWarningMessage(
            'El texto tiene varias líneas. No se pegó para evitar ejecutar comandos accidentalmente.'
        );
        return;
    }

    const terminal = await getOrCreateTerminal();

    // Crucial: false prevents appending Enter.
    terminal.sendText(text, false);
}

async function copyAll() {
    const terminal = findTerminal();

    if (!terminal) {
        vscode.window.showWarningMessage(
            'No hay una terminal disponible para copiar.'
        );
        return;
    }

    terminal.show(true);

    await vscode.commands.executeCommand(
        'workbench.action.terminal.selectAll'
    );
    await vscode.commands.executeCommand(
        'workbench.action.terminal.copySelection'
    );
}

function activate(context) {
    const pasteButton = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left, 101
    );
    pasteButton.text = '$(clippy) Pegar';
    pasteButton.tooltip = 'Pegar texto en la terminal sin enviar Enter';
    pasteButton.command = 'wslActionButtons.paste';
    pasteButton.show();

    const copyButton = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left, 100
    );
    copyButton.text = '$(copy) Copiar todo';
    copyButton.tooltip = 'Seleccionar y copiar todo el contenido de la terminal';
    copyButton.command = 'wslActionButtons.copyAll';
    copyButton.show();

    context.subscriptions.push(
        pasteButton,
        copyButton,
        vscode.commands.registerCommand(
            'wslActionButtons.paste', pasteWithoutExecuting
        ),
        vscode.commands.registerCommand(
            'wslActionButtons.copyAll', copyAll
        )
    );
}

function deactivate() {}

module.exports = { activate, deactivate };
