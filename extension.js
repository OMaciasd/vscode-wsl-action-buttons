'use strict';

const vscode = require('vscode');

const OPENCODE_TERMINAL_NAME = 'OpenCode';

let openCodeTerminal = null;
let outputChannel = null;

function log(message) {
    const line = `[wslActionButtons] ${message}`;
    console.log(line);
    if (outputChannel) {
        outputChannel.appendLine(line);
    }
}

function logError(message, error) {
    const detail = error && error.stack ? error.stack : (error && error.message ? error.message : String(error));
    const line = `[wslActionButtons] ${message}: ${detail}`;
    console.error(line);
    if (outputChannel) {
        outputChannel.appendLine(line);
    }
}

function createTerminal(name) {
    return vscode.window.createTerminal({ name });
}

function normalizeClipboardContent(content) {
    return content.replace(/[\r\n]+$/, '');
}

const TERMINAL_PROCESS_TIMEOUT_MS = 5000;

async function waitForTerminalProcess(terminal) {
    if (!terminal || typeof terminal.processId?.then !== 'function') {
        log('processId not a thenable, skipping wait');
        return;
    }

    const hasTimer = typeof setTimeout === 'function';

    if (!hasTimer) {
        const pid = await terminal.processId;
        log(`processId resolved (no timer): ${pid}`);
        return pid;
    }

    let timeoutId;
    const timeout = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error('La terminal no se inicializó a tiempo.'));
        }, TERMINAL_PROCESS_TIMEOUT_MS);
    });

    try {
        const pid = await Promise.race([terminal.processId, timeout]);
        log(`processId resolved: ${pid}`);
        return pid;
    } finally {
        if (typeof clearTimeout === 'function') {
            clearTimeout(timeoutId);
        }
    }
}

/**
 * Reuses the currently active terminal when one exists.
 * Otherwise creates a new terminal using VS Code's configured default
 * profile (for example, zsh in WSL) and waits for its shell process.
 */
async function getActiveOrNewTerminal() {
    log('getActiveOrNewTerminal() start');
    let terminal = vscode.window.activeTerminal;
    log(`activeTerminal: ${terminal ? 'present' : 'undefined'}`);

    if (terminal) {
        log('reusing active terminal');
        terminal.show(true);
        await waitForTerminalProcess(terminal);
        log('active terminal process ready');
        return terminal;
    }

    let created;
    try {
        log('creating new terminal');
        created = createTerminal('WSL Action Buttons');
        log(`createTerminal returned: ${created ? 'terminal' : 'undefined'}`);
    } catch (error) {
        logError('createTerminal threw', error);
        throw new Error(`No se pudo crear la terminal: ${error && error.message ? error.message : String(error)}`);
    }

    if (!created) {
        logError('createTerminal returned falsy', new Error('falsy terminal'));
        throw new Error('No se pudo crear la terminal.');
    }

    created.show(true);
    log('terminal.show(true) called');

    try {
        await waitForTerminalProcess(created);
        log('new terminal process ready');
    } catch (error) {
        logError('waitForTerminalProcess failed', error);
        if (typeof created.dispose === 'function') {
            try {
                created.dispose();
            } catch (disposeError) {
                // Ignore disposal errors; the original failure is more relevant.
            }
        }
        throw new Error(`No se pudo inicializar la terminal: ${error && error.message ? error.message : String(error)}`);
    }

    return created;
}

async function pasteAndExecute() {
    log('pasteAndExecute() start');
    vscode.window.showInformationMessage('WSL Action Buttons: Pegar y ejecutar iniciado');

    let content;
    try {
        content = await vscode.env.clipboard.readText();
        log(`clipboard read: ${content ? content.length : 0} chars`);
    } catch (error) {
        logError('clipboard read failed', error);
        vscode.window.showErrorMessage(
            `No se pudo leer el portapapeles: ${error && error.message ? error.message : String(error)}`
        );
        return;
    }

    // Remove terminal-unnecessary line endings at the very end.
    content = normalizeClipboardContent(content);

    if (!content.trim()) {
        log('clipboard empty, aborting');
        vscode.window.showInformationMessage(
            'El portapapeles está vacío.'
        );
        return;
    }

    let terminal;
    try {
        terminal = await getActiveOrNewTerminal();
    } catch (error) {
        logError('getActiveOrNewTerminal failed', error);
        vscode.window.showErrorMessage(
            error && error.message ? error.message : String(error)
        );
        return;
    }

    try {
        log('calling sendText(content, true)');
        // true appends Enter: the clipboard content is executed once.
        terminal.sendText(content, true);
        log('sendText done');
    } catch (error) {
        logError('sendText failed', error);
        vscode.window.showErrorMessage(
            `No se pudo ejecutar el comando en la terminal: ${error && error.message ? error.message : String(error)}`
        );
    }
}

async function openOpenCode() {
    if (openCodeTerminal) {
        openCodeTerminal.show(true);
        return;
    }

    openCodeTerminal = vscode.window.createTerminal({
        name: OPENCODE_TERMINAL_NAME,
        location: {
            viewColumn: vscode.ViewColumn.Beside,
            preserveFocus: false
        }
    });

    openCodeTerminal.show(false);

    try {
        await waitForTerminalProcess(openCodeTerminal);
        openCodeTerminal.sendText('opencode', true);
    } catch (error) {
        vscode.window.showErrorMessage(
            `No se pudo iniciar la terminal de OpenCode: ${error.message}`
        );
        openCodeTerminal = null;
    }
}

async function copyAllOutput() {
    const terminal = vscode.window.activeTerminal;

    if (!terminal) {
        vscode.window.showWarningMessage(
            'No hay una terminal activa para copiar.'
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

async function clearTerminal() {
    const terminal = vscode.window.activeTerminal;

    if (!terminal) {
        vscode.window.showWarningMessage(
            'No hay una terminal activa para limpiar.'
        );
        return;
    }

    terminal.show(true);

    await vscode.commands.executeCommand(
        'workbench.action.terminal.clear'
    );
}

function activate(context) {
    log('activate() called');

    if (typeof vscode.window.createOutputChannel === 'function') {
        outputChannel = vscode.window.createOutputChannel('WSL Action Buttons');
        context.subscriptions.push(outputChannel);
    }

    const commands = [
        {
            id: 'wslActionButtons.pasteAndExecute',
            title: 'Pegar y ejecutar',
            icon: '$(clippy)',
            tooltip: 'Pegar el portapapeles y ejecutar en la terminal activa; crear una si no hay ninguna'
        },
        {
            id: 'wslActionButtons.openOpenCode',
            title: 'Abrir OpenCode',
            icon: '$(terminal)',
            tooltip: 'Abrir OpenCode en una terminal dedicada junto al editor'
        },
        {
            id: 'wslActionButtons.copyAllOutput',
            title: 'Copiar output',
            icon: '$(copy)',
            tooltip: 'Seleccionar y copiar el output de la terminal activa'
        },
        {
            id: 'wslActionButtons.clearTerminal',
            title: 'Limpiar',
            icon: '$(clear-all)',
            tooltip: 'Limpiar la pantalla y el búfer de la terminal activa'
        }
    ];

    const handlers = {
        'wslActionButtons.pasteAndExecute': pasteAndExecute,
        'wslActionButtons.openOpenCode': openOpenCode,
        'wslActionButtons.copyAllOutput': copyAllOutput,
        'wslActionButtons.clearTerminal': clearTerminal
    };

    commands.forEach((definition, index) => {
        const item = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            104 - index
        );

        item.text = `${definition.icon} ${definition.title}`;
        item.tooltip = definition.tooltip;
        item.command = definition.id;
        item.show();

        log(`registered command: ${definition.id}`);

        context.subscriptions.push(item);
        context.subscriptions.push(
            vscode.commands.registerCommand(
                definition.id,
                handlers[definition.id]
            )
        );
    });

    context.subscriptions.push(
        vscode.window.onDidCloseTerminal(closed => {
            if (closed === openCodeTerminal) {
                openCodeTerminal = null;
            }
        })
    );
}

function deactivate() {
    openCodeTerminal = null;
}

module.exports = {
    activate,
    deactivate,
    pasteAndExecute,
    openOpenCode,
    copyAllOutput,
    clearTerminal,
    normalizeClipboardContent
};
