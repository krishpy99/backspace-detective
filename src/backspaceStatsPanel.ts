// JavaScript/TypeScript Lesson 5: Custom WebView Panels in VSCode
// --------------------------------------------------------------------
// This class creates and manages a custom webview panel to display statistics

import * as vscode from 'vscode';
import * as path from 'path';
import { KeystrokeTracker } from './keystrokeTracker';

/**
 * Manages the WebView panel that displays backspace statistics
 */
export class BackspaceStatsPanel {
    // Tracks the currently open panel
    public static currentPanel: BackspaceStatsPanel | undefined;

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _keystrokeTracker: KeystrokeTracker;
    private readonly _analysisResult: string | null;
    private _disposables: vscode.Disposable[] = [];

    /**
     * Create or focus the BackspaceStatsPanel
     */
    public static createOrShow(
        extensionUri: vscode.Uri, 
        keystrokeTracker: KeystrokeTracker,
        analysisResult: string | null
    ) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it
        if (BackspaceStatsPanel.currentPanel) {
            BackspaceStatsPanel.currentPanel._panel.reveal(column);
            return;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            'backspaceStats',
            'Backspace Detective',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'media')
                ]
            }
        );

        BackspaceStatsPanel.currentPanel = new BackspaceStatsPanel(panel, extensionUri, keystrokeTracker, analysisResult);
    }

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        keystrokeTracker: KeystrokeTracker,
        analysisResult: string | null
    ) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._keystrokeTracker = keystrokeTracker;
        this._analysisResult = analysisResult;

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Update the content based on view changes
        this._panel.onDidChangeViewState(
            () => {
                if (this._panel.visible) {
                    this._update();
                }
            },
            null,
            this._disposables
        );

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'refresh':
                        // Refresh the stats
                        this._update();
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    /**
     * Clean up resources when this panel is closed
     */
    public dispose() {
        BackspaceStatsPanel.currentPanel = undefined;

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }

    /**
     * Update the panel's content
     */
    private _update() {
        const webview = this._panel.webview;
        this._panel.title = "Backspace Detective";
        webview.html = this._getHtmlForWebview(webview);
    }

    /**
     * Get the HTML for the webview panel
     */
    private _getHtmlForWebview(webview: vscode.Webview): string {
        // Get the stats from the tracker
        const stats = this._keystrokeTracker.getStats();
        const currentFileStats = this._keystrokeTracker.getFileStats();
        
        // Try to parse the analysis result if available
        let analysis = { prediction: 'Unknown', confidence: 0, metrics: {} };
        if (this._analysisResult) {
            try {
                analysis = JSON.parse(this._analysisResult);
            } catch (e) {
                // If parsing fails, we'll use the default
            }
        }

        // Calculate a backspace percentage for display
        const backspacePercent = stats.total_keystrokes > 0
            ? (stats.backspace_count / stats.total_keystrokes * 100).toFixed(1)
            : '0.0';

        // Create HTML content
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Backspace Detective</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    padding: 20px;
                    color: var(--vscode-foreground);
                }
                .container {
                    max-width: 800px;
                    margin: 0 auto;
                }
                .stat-card {
                    background-color: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 5px;
                    padding: 15px;
                    margin-bottom: 20px;
                }
                .stat-title {
                    font-size: 1.2em;
                    margin-bottom: 10px;
                    color: var(--vscode-editor-foreground);
                }
                .stat-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 8px;
                }
                .prediction {
                    font-size: 1.5em;
                    text-align: center;
                    padding: 20px;
                    margin: 20px 0;
                    background-color: ${analysis.prediction === 'human' 
                        ? 'var(--vscode-statusBarItem-remoteBackground)' 
                        : 'var(--vscode-statusBarItem-warningBackground)'};
                    color: var(--vscode-statusBarItem-remoteForeground);
                    border-radius: 8px;
                }
                .confidence {
                    font-size: 0.9em;
                    text-align: center;
                    opacity: 0.8;
                }
                button {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 8px 12px;
                    border-radius: 2px;
                    cursor: pointer;
                }
                button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Backspace Detective</h1>
                
                <div class="prediction">
                    Prediction: ${analysis.prediction === 'human' ? 'Human' : 'AI'} Written Code
                    <div class="confidence">
                        Confidence: ${(analysis.confidence * 100).toFixed(1)}%
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-title">Session Statistics</div>
                    <div class="stat-row">
                        <span>Total Keystrokes:</span>
                        <span>${stats.total_keystrokes}</span>
                    </div>
                    <div class="stat-row">
                        <span>Backspace Count:</span>
                        <span>${stats.backspace_count}</span>
                    </div>
                    <div class="stat-row">
                        <span>Delete Count:</span>
                        <span>${stats.delete_count}</span>
                    </div>
                    <div class="stat-row">
                        <span>Characters Typed:</span>
                        <span>${stats.characters_typed}</span>
                    </div>
                    <div class="stat-row">
                        <span>Backspace Percentage:</span>
                        <span>${backspacePercent}%</span>
                    </div>
                    <div class="stat-row">
                        <span>Session Duration:</span>
                        <span>${formatDuration(stats.edit_duration_ms)}</span>
                    </div>
                </div>
                
                <button id="refresh">Refresh Statistics</button>
            </div>
            
            <script>
                const vscode = acquireVsCodeApi();
                
                // Handle the refresh button
                document.getElementById('refresh').addEventListener('click', () => {
                    vscode.postMessage({
                        command: 'refresh'
                    });
                });
            </script>
        </body>
        </html>`;
    }
}

/**
 * Format a duration in milliseconds to a human-readable string
 */
function formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
} 