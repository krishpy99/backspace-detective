# Backspace Detective

A VSCode extension that counts backspace usage while coding to predict whether code was written by AI or a human.

## Features

- Tracks keystrokes and backspace usage in real-time
- Analyzes typing patterns to detect AI vs. human coding
- Shows statistics in a detailed panel with visualizations
- Updates statistics live as you type
- Displays a summary in the status bar

## Why It Works

Research has shown that humans and AI exhibit different typing patterns:

- Humans typically use backspace more frequently (8-25% of keystrokes)
- AI-generated code usually has a very low backspace rate (<5%)
- Humans pause to think, make mistakes, and correct themselves
- AI generates code with higher typing speed and fewer corrections

This extension monitors these patterns in your coding and provides a prediction based on statistical analysis.

## Prerequisites

- Visual Studio Code 1.60.0 or higher
- Node.js and npm

## Installation

### From VSIX (Recommended)

1. Download the latest `.vsix` file from the [Releases page](https://github.com/yourusername/backspace-detective/releases)
2. In VS Code, go to Extensions view (Ctrl+Shift+X)
3. Click the "..." menu and select "Install from VSIX..."
4. Select the downloaded file

### Building from source

```bash
# Clone the repository
git clone https://github.com/krishpy99/backspace-detective.git
cd backspace-detective

# Install dependencies
npm install

# Install wasm-pack if you don't have it
cargo install wasm-pack

# Build the Rust WASM module
cd backspace-analyzer
wasm-pack build --target web
cd ..

# Build the extension
npm run build

# Package the extension
npx vsce package
```

## Usage

1. Open VS Code with the extension installed
2. The extension automatically starts tracking keystrokes
3. A status bar item shows your current backspace percentage
4. Click on the status bar item or run the "Show Backspace Statistics" command to see detailed analysis
5. Start typing and see the predictions update in real-time

## Commands

- **Start Tracking Backspace Usage**: Begin monitoring keystrokes
- **Stop Tracking Backspace Usage**: Pause monitoring
- **Show Backspace Statistics**: Display the detailed statistics panel

## How it's Built

This extension combines TypeScript and Rust via WebAssembly:

- **TypeScript**: Handles the VSCode extension API, UI, and keystroke monitoring
- **Rust**: Powers the analysis engine with high-performance algorithms
- **WebAssembly**: Bridges the two languages, allowing the Rust code to run in the JavaScript environment

## Learning Resources

Want to learn how this was built? Check out these lessons:

### Rust Lessons

1. **Importing External Crates and Setting Up WASM**: How to use external libraries and prepare Rust for WebAssembly
2. **Creating Custom Types**: Defining structs and implementing derived traits 
3. **Implementing Methods on Structs**: Adding behavior to data structures
4. **Creating WASM-Compatible Functions**: Exposing Rust functions to JavaScript
5. **Error Handling and JSON Utilities**: Working with errors and serializing data
6. **Analysis Logic and Algorithms**: Implementing the core AI detection logic
7. **Unit Tests**: Ensuring code correctness with tests

### TypeScript/JavaScript Lessons

1. **VSCode Extension Entry Point**: Setting up the main extension structure
2. **Keypress Monitoring and Analysis**: Tracking and analyzing keyboard input
3. **VSCode UI Integration**: Working with the status bar
4. **WebAssembly Integration**: Loading and communicating with Rust WASM modules
5. **Custom WebView Panels**: Creating rich UI elements within VSCode

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 
