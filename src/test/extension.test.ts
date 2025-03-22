import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Starting Backspace Detective tests');

	test('Extension is present', () => {
		assert.ok(vscode.extensions.getExtension('backspace-detective'));
	});

	test('Extension activates', async () => {
		const extension = vscode.extensions.getExtension('backspace-detective');
		if (!extension) {
			assert.fail('Extension not found');
			return;
		}
		
		try {
			await extension.activate();
			assert.ok(true);
		} catch (err) {
			assert.fail(`Failed to activate extension: ${err}`);
		}
	});
}); 