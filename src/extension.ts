// JavaScript/TypeScript Lesson 1: VSCode Extension Entry Point
// --------------------------------------------------------------------
// This is the main entry point for our VSCode extension
// It handles activation, command registration, and clean-up

import * as vscode from 'vscode';
import { KeystrokeTracker } from './keystrokeTracker';
import { StatusBarManager } from './statusBarManager';
import { initWasm } from './wasmLoader';
import { BackspaceStatsPanel } from './backspaceStatsPanel';

// Extension-wide state
let keystrokeTracker: KeystrokeTracker | undefined;
let statusBarManager: StatusBarManager | undefined;
let outputChannel: vscode.OutputChannel;

export async function activate(context: vscode.ExtensionContext) {
    // Create output channel for logging
    outputChannel = vscode.window.createOutputChannel('Backspace Detective');
    outputChannel.appendLine('Activating Backspace Detective extension');
    
    console.log('Activating Backspace Detective extension');

    try {
        // Log workspace information
        const workspaceFolders = vscode.workspace.workspaceFolders || [];
        if (workspaceFolders.length > 0) {
            outputChannel.appendLine(`Found ${workspaceFolders.length} workspace folder(s):`);
            workspaceFolders.forEach(folder => {
                outputChannel.appendLine(`- ${folder.uri.fsPath}`);
            });
            outputChannel.appendLine('Will only track changes in files within these folders');
        } else {
            outputChannel.appendLine('No workspace folders found. Will only track normal file changes.');
            // Show a notification to the user
            vscode.window.showInformationMessage(
                'Backspace Detective works best with an open workspace/folder. ' +
                'Open a folder to ensure proper keystroke tracking.'
            );
        }

        // Initialize WebAssembly module
        outputChannel.appendLine('Initializing WebAssembly module...');
        await initWasm();
        outputChannel.appendLine('WebAssembly module initialized');
        
        // Create status bar and keypress tracker
        outputChannel.appendLine('Creating status bar and keypress tracker...');
        statusBarManager = new StatusBarManager(context);
        keystrokeTracker = new KeystrokeTracker(context, statusBarManager, outputChannel);
        
        // Register commands
        outputChannel.appendLine('Registering commands...');
        const startTracking = vscode.commands.registerCommand(
            'backspace-detective.startTracking', 
            () => {
                outputChannel.appendLine('Command executed: Start tracking');
                keystrokeTracker?.startTracking();
                vscode.window.showInformationMessage('Backspace tracking started');
            }
        );
        
        const stopTracking = vscode.commands.registerCommand(
            'backspace-detective.stopTracking', 
            () => {
                outputChannel.appendLine('Command executed: Stop tracking');
                keystrokeTracker?.stopTracking();
                vscode.window.showInformationMessage('Backspace tracking stopped');
            }
        );
        
        const showStats = vscode.commands.registerCommand(
            'backspace-detective.showStats', 
            () => {
                outputChannel.appendLine('Command executed: Show stats');
                if (keystrokeTracker) {
                    const analysisResult = keystrokeTracker.analyzeCurrentFile();
                    outputChannel.appendLine(`Analysis result: ${analysisResult || 'No data available'}`);
                    BackspaceStatsPanel.createOrShow(context.extensionUri, keystrokeTracker, analysisResult);
                } else {
                    vscode.window.showErrorMessage('Keystroke tracker not initialized');
                }
            }
        );
        
        const resetStats = vscode.commands.registerCommand(
            'backspace-detective.resetStats',
            () => {
                outputChannel.appendLine('Command executed: Reset stats');
                if (keystrokeTracker) {
                    keystrokeTracker.reset();
                    vscode.window.showInformationMessage('Backspace statistics have been reset');
                } else {
                    vscode.window.showErrorMessage('Keystroke tracker not initialized');
                }
            }
        );
        
        // Create webview view provider for the statistics view
        const statsViewProvider = new BackspaceStatsViewProvider(context.extensionUri, keystrokeTracker);
        const statsView = vscode.window.registerWebviewViewProvider(
            'backspaceStats',
            statsViewProvider
        );
        
        // Start tracking by default if enabled in settings
        const config = vscode.workspace.getConfiguration('backspaceDetective');
        const shouldStartTracking = config.get<boolean>('startTrackingOnLoad', true);
        outputChannel.appendLine(`Start tracking on load: ${shouldStartTracking}`);
        
        if (shouldStartTracking) {
            outputChannel.appendLine('Starting tracking automatically...');
            keystrokeTracker.startTracking();
        }
        
        // Add all disposables to the context
        context.subscriptions.push(
            startTracking,
            stopTracking,
            showStats,
            resetStats,
            statsView,
            keystrokeTracker,
            statusBarManager
        );
        
        outputChannel.appendLine('Backspace Detective extension activated successfully');
    } catch (error) {
        outputChannel.appendLine(`Error during activation: ${error}`);
        console.error('Failed to activate Backspace Detective extension:', error);
        vscode.window.showErrorMessage(`Failed to activate Backspace Detective: ${error}`);
    }
}

/**
 * WebView provider for the stats view in the sidebar
 */
class BackspaceStatsViewProvider implements vscode.WebviewViewProvider {
    constructor(
        private readonly extensionUri: vscode.Uri,
        private readonly keystrokeTracker?: KeystrokeTracker
    ) {}

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        token: vscode.CancellationToken
    ): void | Thenable<void> {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionUri]
        };

        webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'startTracking':
                    vscode.commands.executeCommand('backspace-detective.startTracking');
                    break;
                case 'stopTracking':
                    vscode.commands.executeCommand('backspace-detective.stopTracking');
                    break;
                case 'resetStats':
                    vscode.commands.executeCommand('backspace-detective.resetStats');
                    break;
                case 'refreshStats':
                    this.updateStats(webviewView.webview);
                    break;
            }
        });

        // Update stats every second while the view is visible
        const interval = setInterval(() => {
            if (webviewView.visible) {
                this.updateStats(webviewView.webview);
            }
        }, 1000);

        // Clean up the interval when the webview is disposed
        webviewView.onDidDispose(() => {
            clearInterval(interval);
        });
    }

    private updateStats(webview: vscode.Webview): void {
        if (!this.keystrokeTracker) {
            return;
        }

        const stats = this.keystrokeTracker.getStats();
        const isTracking = this.keystrokeTracker.isCurrentlyTracking();
        
        webview.postMessage({
            type: 'statsUpdate',
            stats,
            isTracking
        });
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Backspace Statistics</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    padding: 10px;
                    color: var(--vscode-foreground);
                }
                .button-container {
                    display: flex;
                    gap: 8px;
                    margin-bottom: 16px;
                }
                button {
                    padding: 4px 8px;
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    border-radius: 2px;
                    cursor: pointer;
                    font-size: 12px;
                }
                button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                .stats-container {
                    display: grid;
                    grid-template-columns: auto auto;
                    gap: 8px;
                }
                .stat-value {
                    font-weight: bold;
                }
                .tracking-status {
                    margin-top: 12px;
                    padding: 4px;
                    border-radius: 2px;
                    text-align: center;
                }
                .tracking-active {
                    background-color: rgba(65, 168, 95, 0.2);
                    color: var(--vscode-debugIcon-startForeground);
                }
                .tracking-inactive {
                    background-color: rgba(218, 40, 40, 0.2);
                    color: var(--vscode-debugIcon-stopForeground);
                }
            </style>
        </head>
        <body>
            <div class="button-container">
                <button id="start-tracking">Start Tracking</button>
                <button id="stop-tracking">Stop Tracking</button>
                <button id="reset-stats">Reset Stats</button>
            </div>
            
            <div id="tracking-status" class="tracking-status tracking-inactive">
                Not tracking
            </div>
            
            <h3>Current Statistics</h3>
            <div class="stats-container">
                <div>Total keystrokes:</div>
                <div class="stat-value" id="total-keystrokes">0</div>
                
                <div>Backspace count:</div>
                <div class="stat-value" id="backspace-count">0</div>
                
                <div>Delete count:</div>
                <div class="stat-value" id="delete-count">0</div>
                
                <div>Characters typed:</div>
                <div class="stat-value" id="characters-typed">0</div>
                
                <div>Backspace ratio:</div>
                <div class="stat-value" id="backspace-ratio">0.0%</div>
                
                <div>Edit duration:</div>
                <div class="stat-value" id="edit-duration">00:00:00</div>
            </div>
            
            <script>
                (function() {
                    const vscode = acquireVsCodeApi();

                    // Add event listeners for buttons
                    document.getElementById('start-tracking').addEventListener('click', () => {
                        vscode.postMessage({ command: 'startTracking' });
                    });
                    
                    document.getElementById('stop-tracking').addEventListener('click', () => {
                        vscode.postMessage({ command: 'stopTracking' });
                    });
                    
                    document.getElementById('reset-stats').addEventListener('click', () => {
                        vscode.postMessage({ command: 'resetStats' });
                    });
                    
                    // Request initial stats
                    vscode.postMessage({ command: 'refreshStats' });
                    
                    // Handle messages from the extension
                    window.addEventListener('message', event => {
                        const message = event.data;
                        
                        if (message.type === 'statsUpdate') {
                            updateStats(message.stats, message.isTracking);
                        }
                    });
                    
                    function updateStats(stats, isTracking) {
                        document.getElementById('total-keystrokes').textContent = stats.total_keystrokes;
                        document.getElementById('backspace-count').textContent = stats.backspace_count;
                        document.getElementById('delete-count').textContent = stats.delete_count;
                        document.getElementById('characters-typed').textContent = stats.characters_typed;
                        
                        // Calculate backspace ratio
                        const ratio = stats.total_keystrokes > 0 
                            ? (stats.backspace_count / stats.total_keystrokes * 100).toFixed(1)
                            : '0.0';
                        document.getElementById('backspace-ratio').textContent = ratio + '%';
                        
                        // Format duration
                        const durationMs = stats.edit_duration_ms || 0;
                        const seconds = Math.floor((durationMs / 1000) % 60);
                        const minutes = Math.floor((durationMs / (1000 * 60)) % 60);
                        const hours = Math.floor(durationMs / (1000 * 60 * 60));
                        
                        const formattedDuration = 
                            String(hours).padStart(2, '0') + ':' +
                            String(minutes).padStart(2, '0') + ':' +
                            String(seconds).padStart(2, '0');
                        
                        document.getElementById('edit-duration').textContent = formattedDuration;
                        
                        // Update tracking status
                        const statusElement = document.getElementById('tracking-status');
                        if (isTracking) {
                            statusElement.textContent = 'Currently tracking';
                            statusElement.classList.remove('tracking-inactive');
                            statusElement.classList.add('tracking-active');
                        } else {
                            statusElement.textContent = 'Not tracking';
                            statusElement.classList.remove('tracking-active');
                            statusElement.classList.add('tracking-inactive');
                        }
                    }
                })();
            </script>
        </body>
        </html>`;
    }
}

export function deactivate() {
    // Clean up
    keystrokeTracker?.stopTracking();
    statusBarManager?.dispose();
    outputChannel?.appendLine('Backspace Detective deactivated');
    console.log('Backspace Detective deactivated');
} 