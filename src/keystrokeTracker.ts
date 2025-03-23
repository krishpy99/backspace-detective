// JavaScript/TypeScript Lesson 2: Keypress Monitoring and Analysis
// --------------------------------------------------------------------
// This class tracks keystrokes and analyzes backspace usage

import * as vscode from 'vscode';
import * as path from 'path';
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
    private workspaceFolders: readonly vscode.WorkspaceFolder[] = [];

    constructor(
        private context: vscode.ExtensionContext,
        private statusBarManager: StatusBarManager,
        private outputChannel?: vscode.OutputChannel
    ) {
        this.log('KeystrokeTracker initialized');
        // Store workspace folders for filtering
        this.workspaceFolders = vscode.workspace.workspaceFolders || [];
    }

    private log(message: string): void {
        if (this.outputChannel) {
            this.outputChannel.appendLine(message);
        }
        console.log(message);
    }

    /**
     * Check if a file URI is within the current workspace folders
     */
    private isFileInWorkspace(uri: vscode.Uri): boolean {
        if (this.workspaceFolders.length === 0) {
            // If no workspace is open, only track actual file schemes
            return uri.scheme === 'file';
        }

        // Check if the file is within any workspace folder
        return this.workspaceFolders.some(folder => {
            return uri.fsPath.startsWith(folder.uri.fsPath);
        });
    }

    /**
     * Check if a document is a regular text file we should track
     * (excludes output, debug console, etc.)
     */
    private shouldTrackDocument(document: vscode.TextDocument): boolean {
        // Only track file scheme documents (excludes output, debug console)
        if (document.uri.scheme !== 'file') {
            this.log(`Ignoring non-file document: ${document.uri.scheme}`);
            return false;
        }

        // Check if it's in our workspace
        if (!this.isFileInWorkspace(document.uri)) {
            this.log(`Ignoring file outside workspace: ${document.uri.fsPath}`);
            return false;
        }

        // Optionally, add more exclusions here, like specific file extensions
        // if needed in the future

        return true;
    }

    public isCurrentlyTracking(): boolean {
        return this.isTracking;
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

        // Refresh workspace folders list in case it changed
        this.workspaceFolders = vscode.workspace.workspaceFolders || [];
        this.log(`Workspace folders: ${this.workspaceFolders.map(f => f.uri.fsPath).join(', ')}`);

        // Get current file if there's an active editor
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && this.shouldTrackDocument(activeEditor.document)) {
            this.currentFile = activeEditor.document.uri.fsPath;
            this.log(`Current file set to: ${this.currentFile}`);
        }

        // Listen for key presses in text editor
        const keySubscription = vscode.workspace.onDidChangeTextDocument((event) => {
            // Skip empty changes
            if (event.contentChanges.length === 0) {
                return;
            }

            // Skip non-workspace files and special editors
            if (!this.shouldTrackDocument(event.document)) {
                return;
            }

            const documentPath = event.document.uri.fsPath;
            this.log(`Processing changes in: ${documentPath}, ${event.contentChanges.length} changes`);

            // Track the current file being edited
            if (documentPath !== this.currentFile) {
                this.currentFile = documentPath;
                
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
                
                // Heuristic to identify likely paste operations or automated edits
                const isProbablyPaste = text.length > 10 && (
                    text.includes('\n') || // Multi-line paste
                    !this.isNormalTypingPattern(text) // Unusual character sequence
                );

                // Heuristic for automated edits like auto-formatting
                const isLikelyAutomatedEdit = event.reason === vscode.TextDocumentChangeReason.Undo ||
                                            event.reason === vscode.TextDocumentChangeReason.Redo ||
                                            // Large number of changes at once often indicates automated edits
                                            event.contentChanges.length > 5;

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
                            this.log(`Backspace detected at ${position.line}:${position.character}`);
                        } else {
                            // Likely delete
                            fileStats.delete_count++;
                            this.stats.delete_count++;
                            this.log(`Delete detected at ${position.line}:${position.character}`);
                        }
                    } else if (rangeLength > 1) {
                        // Multi-character deletion (selection + delete)
                        // Count as a single keystroke rather than multiple
                        fileStats.total_keystrokes++;
                        this.stats.total_keystrokes++;
                        this.log(`Multi-character deletion: ${rangeLength} characters`);
                    }
                } else if (isProbablyPaste) {
                    // This is likely a paste operation, count as a single operation
                    fileStats.total_keystrokes++;
                    this.stats.total_keystrokes++;
                    fileStats.characters_typed += text.length;
                    this.stats.characters_typed += text.length;
                    this.log(`Paste detected: ${text.length} characters (counting as 1 keystroke)`);
                } else if (isLikelyAutomatedEdit) {
                    // This is likely an automated edit, don't count as keystrokes
                    this.log(`Automated edit detected, not counting as keystrokes`);
                } else {
                    // Normal text input - count each character as a keystroke
                    const keystrokeCount = text.length;
                    fileStats.total_keystrokes += keystrokeCount;
                    fileStats.characters_typed += keystrokeCount;
                    this.stats.total_keystrokes += keystrokeCount;
                    this.stats.characters_typed += keystrokeCount;
                    this.log(`Text added: "${text.length > 10 ? text.substring(0, 10) + '...' : text}" (${keystrokeCount} keystrokes)`);
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
            if (editor && this.shouldTrackDocument(editor.document)) {
                this.currentFile = editor.document.uri.fsPath;
                this.log(`Switched to file: ${this.currentFile}`);
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

    /**
     * Determines if text input looks like normal human typing
     * (vs. templates, code snippets, etc.)
     */
    private isNormalTypingPattern(text: string): boolean {
        // Check for unusual patterns that might indicate templates or generated code
        const hasRepeatedSpaces = /\s{3,}/.test(text);
        const hasCodeFormattingPatterns = /[{|}|;]\s*\n/.test(text);
        const hasTabsOrMultipleIndentation = /\t|\s{2,}\S/.test(text);
        
        // If any of these patterns are found, it's likely not normal typing
        return !(hasRepeatedSpaces || hasCodeFormattingPatterns || hasTabsOrMultipleIndentation);
    }
}
