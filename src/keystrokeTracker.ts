// JavaScript/TypeScript Lesson 2: Keypress Monitoring and Analysis
// --------------------------------------------------------------------
// This class tracks keystrokes and analyzes backspace usage

import * as vscode from 'vscode';
import { StatusBarManager } from './statusBarManager';
import { analyzeEditingPattern } from './wasmLoader';

// Interface to represent our editing statistics
export interface EditingStats {
    total_keystrokes: number;
    backspace_count: number;
    delete_count: number;
    characters_typed: number;
    edit_duration_ms: number;
}

export class KeystrokeTracker implements vscode.Disposable {
    private disposables: vscode.Disposable[] = [];
    private isTracking = false;
    private stats: EditingStats = {
        total_keystrokes: 0,
        backspace_count: 0,
        delete_count: 0,
        characters_typed: 0,
        edit_duration_ms: 0
    };
    private sessionStartTime = 0;
    private currentFile = '';
    private fileStats: Map<string, EditingStats> = new Map();

    constructor(
        private context: vscode.ExtensionContext,
        private statusBarManager: StatusBarManager,
        private outputChannel?: vscode.OutputChannel
    ) {
        this.log('KeystrokeTracker initialized');
    }

    private log(message: string): void {
        if (this.outputChannel) {
            this.outputChannel.appendLine(message);
        }
        console.log(message);
    }

    public startTracking(): void {
        this.log('startTracking called');
        
        if (this.isTracking) {
            this.log('Already tracking, ignoring startTracking call');
            return;
        }

        this.log('Starting keystroke tracking');

        this.isTracking = true;
        this.sessionStartTime = Date.now();
        this.statusBarManager.update('$(eye) Tracking');

        // Get current file if there's an active editor
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            this.currentFile = activeEditor.document.uri.fsPath;
            this.log(`Current file set to: ${this.currentFile}`);
        }

        // Listen for key presses in text editor
        const keySubscription = vscode.workspace.onDidChangeTextDocument((event) => {
            this.log(`Document changed: ${event.document.uri.fsPath}, Changes: ${event.contentChanges.length}`);
            
            if (event.contentChanges.length === 0) {
                return;
            }

            // Track the current file being edited
            if (event.document.uri.fsPath !== this.currentFile) {
                this.currentFile = event.document.uri.fsPath;
                this.log(`Switched to file: ${this.currentFile}`);
                
                // Initialize stats for this file if not already tracked
                if (!this.fileStats.has(this.currentFile)) {
                    this.log(`Initializing stats for new file: ${this.currentFile}`);
                    this.fileStats.set(this.currentFile, {
                        total_keystrokes: 0,
                        backspace_count: 0,
                        delete_count: 0,
                        characters_typed: 0,
                        edit_duration_ms: 0
                    });
                }
            }

            // Get stats for current file
            let fileStats = this.fileStats.get(this.currentFile);
            if (!fileStats) {
                // This should not happen, but add a safety check
                fileStats = {
                    total_keystrokes: 0,
                    backspace_count: 0,
                    delete_count: 0,
                    characters_typed: 0,
                    edit_duration_ms: 0
                };
                this.fileStats.set(this.currentFile, fileStats);
            }

            // Process each content change
            for (const change of event.contentChanges) {
                const rangeLength = change.rangeLength;
                const text = change.text;
                
                if (text === '') {
                    // Content was deleted
                    if (rangeLength === 1) {
                        // Single character deletion (backspace or delete)
                        fileStats.total_keystrokes++;
                        this.stats.total_keystrokes++;
                        
                        // Try to determine if it was backspace or delete
                        // This is an approximation - can't always tell for sure
                        const position = change.range.start;
                        const selection = vscode.window.activeTextEditor?.selection;
                        
                        if (selection && selection.isEmpty && 
                            position.line === selection.active.line && 
                            position.character === selection.active.character - 1) {
                            // Likely backspace
                            fileStats.backspace_count++;
                            this.stats.backspace_count++;
                        } else {
                            // Likely delete
                            fileStats.delete_count++;
                            this.stats.delete_count++;
                        }
                    } else if (rangeLength > 1) {
                        // Multi-character deletion (selection + delete)
                        fileStats.total_keystrokes++;
                        this.stats.total_keystrokes++;
                    }
                } else {
                    // Content was added
                    fileStats.total_keystrokes += text.length;
                    fileStats.characters_typed += text.length;
                    this.stats.total_keystrokes += text.length;
                    this.stats.characters_typed += text.length;
                }
                
                // Update timing data
                const now = Date.now();
                fileStats.edit_duration_ms = now - this.sessionStartTime;
                this.stats.edit_duration_ms = now - this.sessionStartTime;
            }
            
            // Update stats for this file
            this.fileStats.set(this.currentFile, fileStats);
            
            // Update the status bar with current backspace percentage
            this.updateStatusBar();
        });

        // Listen for editor changes to update the current file
        const editorSubscription = vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (editor) {
                this.currentFile = editor.document.uri.fsPath;
            }
        });

        // Add subscriptions to our disposables
        this.disposables.push(keySubscription, editorSubscription);
    }

    public stopTracking(): void {
        if (!this.isTracking) {
            return;
        }

        this.isTracking = false;
        this.statusBarManager.update('$(eye-closed) Not tracking');

        // Dispose of all tracking subscriptions
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }

    public getStats(): EditingStats {
        return { ...this.stats };
    }

    public getFileStats(filePath?: string): EditingStats | null {
        if (filePath) {
            return this.fileStats.get(filePath) || null;
        } else if (this.currentFile) {
            const stats = this.fileStats.get(this.currentFile);
            return stats || null;
        }
        return null;
    }

    public getAllFileStats(): Map<string, EditingStats> {
        return new Map(this.fileStats);
    }

    public analyzeCurrentFile(): string | null {
        const stats = this.getFileStats();
        if (!stats) {
            return null;
        }

        try {
            // Use our Rust WASM module to analyze the stats
            return analyzeEditingPattern(JSON.stringify(stats));
        } catch (error) {
            console.error('Error analyzing editing pattern:', error);
            return null;
        }
    }

    public reset(): void {
        this.stats = {
            total_keystrokes: 0,
            backspace_count: 0,
            delete_count: 0,
            characters_typed: 0,
            edit_duration_ms: 0
        };
        this.fileStats.clear();
        this.sessionStartTime = Date.now();
        this.updateStatusBar();
    }

    private updateStatusBar(): void {
        if (!this.isTracking) {
            return;
        }

        // Calculate backspace percentage
        const backspaceRatio = this.stats.total_keystrokes > 0 
            ? (this.stats.backspace_count / this.stats.total_keystrokes * 100).toFixed(1) 
            : '0.0';
            
        this.statusBarManager.update(`$(keyboard) ${backspaceRatio}% backspace`);
    }

    public dispose(): void {
        this.stopTracking();
    }
}
