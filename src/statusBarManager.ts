// JavaScript/TypeScript Lesson 3: VSCode UI Integration
// --------------------------------------------------------------------
// This class manages the VS Code status bar item

import * as vscode from 'vscode';

/**
 * Manages the VSCode status bar item for the Backspace Detective
 */
export class StatusBarManager implements vscode.Disposable {
    private statusBarItem: vscode.StatusBarItem;

    constructor(private context: vscode.ExtensionContext) {
        // Create a status bar item aligned to the right
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        
        this.statusBarItem.command = 'backspace-detective.showStats';
        this.statusBarItem.tooltip = 'Click to view backspace usage statistics';
        this.statusBarItem.text = '$(keyboard) Backspace Detective';
        this.statusBarItem.show();
    }

    /**
     * Update the status bar text
     */
    public update(text: string): void {
        this.statusBarItem.text = text;
    }

    /**
     * Dispose of the status bar item
     */
    public dispose(): void {
        this.statusBarItem.dispose();
    }
} 