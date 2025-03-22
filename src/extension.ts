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
    outputChannel.show();
    
    console.log('Activating Backspace Detective extension');

    try {
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
                keystrokeTracker?.stopTracking();
                vscode.window.showInformationMessage('Backspace tracking stopped');
            }
        );
        
        const showStats = vscode.commands.registerCommand(
            'backspace-detective.showStats', 
            () => {
                if (keystrokeTracker) {
                    const analysisResult = keystrokeTracker.analyzeCurrentFile();
                    BackspaceStatsPanel.createOrShow(context.extensionUri, keystrokeTracker, analysisResult);
                } else {
                    vscode.window.showErrorMessage('Keystroke tracker not initialized');
                }
            }
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
            keystrokeTracker,
            statusBarManager
        );
        
        console.log('Backspace Detective extension activated');
    } catch (error) {
        outputChannel.appendLine(`Error during activation: ${error}`);
        console.error('Failed to activate Backspace Detective extension:', error);
        vscode.window.showErrorMessage(`Failed to activate Backspace Detective: ${error}`);
    }
}

export function deactivate() {
    // Clean up
    keystrokeTracker?.stopTracking();
    statusBarManager?.dispose();
    console.log('Backspace Detective deactivated');
} 