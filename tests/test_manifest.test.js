const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(
    fs.readFileSync(path.join(root, 'package.json'), 'utf8')
);

test('manifest declares all five commands', () => {
    const commands = manifest.contributes.commands.map(item => item.command);
    assert.deepEqual(commands, [
        'wslActionButtons.pasteAndExecute',
        'wslActionButtons.openOpenCode',
        'wslActionButtons.openOllama',
        'wslActionButtons.copyAllOutput',
        'wslActionButtons.clearTerminal'
    ]);
});

test('manifest does not declare legacy commands', () => {
    const commands = manifest.contributes.commands.map(item => item.command);
    assert.ok(!commands.includes('wslActionButtons.paste'));
    assert.ok(!commands.includes('wslActionButtons.copyAll'));
});

test('manifest command titles are descriptive and in English', () => {
    const expected = {
        'wslActionButtons.pasteAndExecute': 'WSL Action Buttons: Paste and Execute Clipboard',
        'wslActionButtons.openOpenCode': 'WSL Action Buttons: Open OpenCode',
        'wslActionButtons.openOllama': 'WSL Action Buttons: Open Ollama',
        'wslActionButtons.copyAllOutput': 'WSL Action Buttons: Copy All Terminal Output',
        'wslActionButtons.clearTerminal': 'WSL Action Buttons: Clear Terminal'
    };
    for (const [id, title] of Object.entries(expected)) {
        const command = manifest.contributes.commands.find(item => item.command === id);
        assert.ok(command, `Missing command: ${id}`);
        assert.equal(command.title, title);
    }
});
