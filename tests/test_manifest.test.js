const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(
    fs.readFileSync(path.join(root, 'package.json'), 'utf8')
);
const source = fs.readFileSync(
    path.join(root, 'extension.js'), 'utf8'
);

test('manifest declares both actions', () => {
    const commands = manifest.contributes.commands.map(item => item.command);
    assert.ok(commands.includes('wslActionButtons.paste'));
    assert.ok(commands.includes('wslActionButtons.copyAll'));
});

test('paste does not append Enter', () => {
    assert.match(source, /terminal\.sendText\(text,\s*false\)/);
    assert.doesNotMatch(source, /sendText\(['"]\\r['"]/);
});

test('multiline clipboard input is rejected', () => {
    assert.match(source, /if \(\/\[\\r\\n\]\/\.test\(text\)\)/);
});

test('terminal creation fallback exists', () => {
    assert.match(source, /createTerminal/);
    assert.match(source, /process\.env\.SHELL \|\| '\/bin\/bash'/);
});
