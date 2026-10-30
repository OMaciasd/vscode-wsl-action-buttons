'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'extension.js'), 'utf8');
const manifest = JSON.parse(
    fs.readFileSync(path.join(root, 'package.json'), 'utf8')
);

function harness({ activeTerminal = null, clipboard = 'echo hello' } = {}) {
    const registered = {};
    const executed = [];
    const terminals = [];
    const statusItems = [];
    const warnings = [];
    const infos = [];
    let closeHandler;

    function makeTerminal(options) {
        const terminal = {
            name: options.name,
            options,
            sent: [],
            shown: [],
            processId: Promise.resolve(1234),
            sendText(text, addNewLine) {
                this.sent.push({ text, addNewLine });
            },
            show(preserveFocus) {
                this.shown.push(preserveFocus);
            }
        };
        terminals.push(terminal);
        return terminal;
    }

    const vscode = {
        StatusBarAlignment: { Left: 1 },
        ViewColumn: { Beside: -2 },
        env: {
            clipboard: {
                readText: async () => clipboard
            }
        },
        window: {
            activeTerminal,
            terminals,
            createTerminal: makeTerminal,
            createStatusBarItem() {
                const item = {
                    show() {},
                    dispose() {}
                };
                statusItems.push(item);
                return item;
            },
            showInformationMessage(message) {
                infos.push(message);
            },
            showWarningMessage(message) {
                warnings.push(message);
            },
            showErrorMessage(message) {
                warnings.push(message);
            },
            onDidCloseTerminal(handler) {
                closeHandler = handler;
                return { dispose() {} };
            }
        },
        commands: {
            registerCommand(id, handler) {
                registered[id] = handler;
                return { dispose() {} };
            },
            async executeCommand(id) {
                executed.push(id);
            }
        }
    };

    const module = { exports: {} };
    vm.runInNewContext(source, {
        require: name => {
            if (name === 'vscode') return vscode;
            throw new Error(`Unexpected require: ${name}`);
        },
        module,
        exports: module.exports,
        process,
        console,
        Promise,
        Error
    });

    const context = { subscriptions: [] };
    module.exports.activate(context);

    return {
        api: module.exports,
        vscode,
        registered,
        executed,
        terminals,
        statusItems,
        warnings,
        infos,
        context,
        closeHandler
    };
}

test('manifest declares all four commands', () => {
    const ids = manifest.contributes.commands.map(item => item.command);
    assert.deepEqual(ids, [
        'wslActionButtons.pasteAndExecute',
        'wslActionButtons.openOpenCode',
        'wslActionButtons.copyAllOutput',
        'wslActionButtons.clearTerminal'
    ]);
});

test('normalizeClipboardContent removes only trailing CR and LF characters', () => {
    const h = harness();
    const cases = [
        ['echo hello', 'echo hello'],
        ['echo hello\n', 'echo hello'],
        ['echo hello\r\n', 'echo hello'],
        ['echo r', 'echo r'],
        ['echo n', 'echo n'],
        ['echo \\\\', 'echo \\\\'],
        ['echo hello\nworld', 'echo hello\nworld'],
        ['echo hello  \n', 'echo hello  '],
        ['echo hello\r\n\n', 'echo hello']
    ];
    for (const [input, expected] of cases) {
        assert.equal(h.api.normalizeClipboardContent(input), expected, JSON.stringify(input));
    }
});

test('paste executes normalized clipboard content and preserves trailing spaces', async () => {
    const h = harness({ clipboard: 'echo hello  \r\n\n' });
    await h.api.pasteAndExecute();
    assert.deepEqual(h.terminals[0].sent, [
        { text: 'echo hello  ', addNewLine: true }
    ]);
});

test('paste creates a terminal if there is no active terminal and executes clipboard', async () => {
    const h = harness({ clipboard: 'echo hello' });
    await h.api.pasteAndExecute();

    assert.equal(h.terminals.length, 1);
    assert.equal(h.terminals[0].name, 'WSL Action Buttons');
    assert.deepEqual(h.terminals[0].sent, [
        { text: 'echo hello', addNewLine: true }
    ]);
    assert.deepEqual(h.terminals[0].shown, [true]);
    assert.equal(h.terminals[0].options.shellPath, undefined);
});

test('paste uses the active terminal instead of creating another', async () => {
    const active = {
        sent: [],
        processId: Promise.resolve(123),
        show() {},
        sendText(text, addNewLine) {
            this.sent.push({ text, addNewLine });
        }
    };
    const h = harness({ activeTerminal: active, clipboard: 'pwd' });

    await h.api.pasteAndExecute();

    assert.equal(h.terminals.length, 0);
    assert.deepEqual(active.sent, [
        { text: 'pwd', addNewLine: true }
    ]);
});

test('empty clipboard does not create a terminal', async () => {
    const h = harness({ clipboard: ' \n ' });
    await h.api.pasteAndExecute();

    assert.equal(h.terminals.length, 0);
    assert.equal(h.infos.length, 2);
});

test('OpenCode opens a dedicated terminal beside the editor', async () => {
    const h = harness();
    await h.api.openOpenCode();

    assert.equal(h.terminals.length, 1);
    assert.equal(h.terminals[0].name, 'OpenCode');
    assert.equal(h.terminals[0].options.location.viewColumn, -2);
    assert.equal(h.terminals[0].options.location.preserveFocus, false);
    assert.deepEqual(h.terminals[0].sent, [
        { text: 'opencode', addNewLine: true }
    ]);
});

test('copy output uses VS Code built-in selection and copy commands', async () => {
    const active = { show() {} };
    const h = harness({ activeTerminal: active });

    await h.api.copyAllOutput();

    assert.deepEqual(h.executed, [
        'workbench.action.terminal.selectAll',
        'workbench.action.terminal.copySelection'
    ]);
});

test('clear uses VS Code built-in terminal clear command', async () => {
    const active = { show() {} };
    const h = harness({ activeTerminal: active });

    await h.api.clearTerminal();

    assert.deepEqual(h.executed, [
        'workbench.action.terminal.clear'
    ]);
});

test('copy and clear do not act when there is no active terminal', async () => {
    const h = harness();

    await h.api.copyAllOutput();
    await h.api.clearTerminal();

    assert.equal(h.executed.length, 0);
    assert.equal(h.warnings.length, 2);
});

test('paste reports an error when terminal creation fails', async () => {
    const h = harness({ clipboard: 'echo hello' });
    h.vscode.window.createTerminal = () => {
        throw new Error('creation failed');
    };

    await h.api.pasteAndExecute();

    assert.equal(h.terminals.length, 0);
    assert.equal(h.warnings.length, 1);
});

test('paste reports an error when the terminal process fails to start', async () => {
    const h = harness({ clipboard: 'echo hello' });
    const originalCreate = h.vscode.window.createTerminal;
    h.vscode.window.createTerminal = options => {
        const terminal = originalCreate(options);
        terminal.processId = Promise.reject(new Error('init failed'));
        return terminal;
    };

    await h.api.pasteAndExecute();

    assert.equal(h.terminals.length, 1);
    assert.equal(h.terminals[0].sent.length, 0);
    assert.equal(h.warnings.length, 1);
});

test('paste executes the clipboard content exactly once', async () => {
    const h = harness({ clipboard: 'echo once' });

    await h.api.pasteAndExecute();

    const sentCount = h.terminals.reduce(
        (total, terminal) => total + terminal.sent.length,
        0
    );
    assert.equal(sentCount, 1);
});

test('paste reuses the active terminal instead of creating one', async () => {
    const active = {
        sent: [],
        shown: [],
        processId: Promise.resolve(123),
        show(preserveFocus) {
            this.shown.push(preserveFocus);
        },
        sendText(text, addNewLine) {
            this.sent.push({ text, addNewLine });
        }
    };
    const h = harness({ activeTerminal: active, clipboard: 'pwd' });

    await h.api.pasteAndExecute();

    assert.equal(h.terminals.length, 0);
    assert.deepEqual(active.sent, [{ text: 'pwd', addNewLine: true }]);
    assert.deepEqual(active.shown, [true]);
});
