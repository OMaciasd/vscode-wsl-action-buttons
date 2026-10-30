const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(
    fs.readFileSync(path.join(root, 'package.json'), 'utf8')
);

test('manifest declares all four commands', () => {
    const commands = manifest.contributes.commands.map(item => item.command);
    assert.deepEqual(commands, [
        'wslActionButtons.pasteAndExecute',
        'wslActionButtons.openOpenCode',
        'wslActionButtons.copyAllOutput',
        'wslActionButtons.clearTerminal'
    ]);
});

test('manifest does not declare legacy commands', () => {
    const commands = manifest.contributes.commands.map(item => item.command);
    assert.ok(!commands.includes('wslActionButtons.paste'));
    assert.ok(!commands.includes('wslActionButtons.copyAll'));
});