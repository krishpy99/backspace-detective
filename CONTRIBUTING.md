# Contributing to Backspace Detective

Thank you for your interest in contributing to Backspace Detective! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Setting Up the Development Environment](#setting-up-the-development-environment)
- [Development Workflow](#development-workflow)
- [Coding Guidelines](#coding-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Issue Reporting](#issue-reporting)
- [Feature Requests](#feature-requests)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to [project maintainers].

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Set up the development environment
4. Create a feature branch from `main`
5. Make your changes
6. Test your changes
7. Submit a pull request

## Setting Up the Development Environment

### Prerequisites

- Node.js (>= 14.x)
- npm (>= 6.x)
- Rust (>= 1.54.0)
- wasm-pack (>= 0.10.0)
- Visual Studio Code (for extension testing)

### Installation

```bash
# Clone your fork
git clone https://github.com/[YOUR_USERNAME]/backspace-detective.git
cd backspace-detective

# Install dependencies
npm install

# Set up Rust WASM build
cd rust
wasm-pack build --target web
cd ..

# Build the extension
npm run compile
```

## Development Workflow

We follow a feature branch workflow:

1. Create a branch for your feature or fix (`git checkout -b feature/my-feature` or `git checkout -b fix/my-fix`)
2. Make your changes and commit them with descriptive commit messages
3. Push your branch to your fork
4. Create a pull request against the `main` branch of the main repository

## Coding Guidelines

### TypeScript

- Follow the [TypeScript Style Guide](https://github.com/Microsoft/TypeScript/wiki/Coding-guidelines)
- Use strict typing wherever possible
- Document public API methods with JSDoc comments
- Keep file complexity manageable (consider splitting large files)

### Rust

- Follow the [Rust Style Guide](https://github.com/rust-dev-tools/fmt-rfcs/blob/master/guide/guide.md)
- Use the Rust 2018 edition syntax
- Document public functions with doc comments
- Write unit tests for non-trivial functions

### WebAssembly

- Keep the WASM API surface minimal and focused
- Use JSON for complex data structures passing between languages
- Document the interface between TypeScript and Rust

## Pull Request Process

1. Update the README.md or documentation with details of changes if appropriate
2. Update the CHANGELOG.md with your changes under "Unreleased"
3. The version numbers will be updated by maintainers following [SemVer](http://semver.org/)
4. Your PR requires approval from at least one maintainer
5. Ensure all automated checks pass

## Testing Guidelines

- Write unit tests for new functionality
- Ensure existing tests pass with your changes
- For VSCode extension features, include integration tests where appropriate
- For Rust code, include unit tests within the same file using the `#[cfg(test)]` attribute

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_backspace_ratio() {
        let stats = EditingStats {
            total_keystrokes: 100,
            backspace_count: 20,
            delete_count: 0,
            characters_typed: 80,
            edit_duration_ms: 1000,
        };
        
        assert_eq!(stats.backspace_ratio(), 0.2);
    }
}
```

## Documentation

- Update documentation for public APIs
- Document complex algorithms or non-obvious behavior
- Keep README and guides up to date with new features
- Use simple language and explain terminology

## Issue Reporting

When reporting issues, please include:

1. A clear, descriptive title
2. Steps to reproduce the issue
3. Expected behavior
4. Actual behavior
5. VSCode version and operating system
6. Extension version
7. Any relevant error messages or screenshots

## Feature Requests

Feature requests are welcome! When submitting a feature request:

1. Use a clear, descriptive title
2. Describe the problem the feature would solve
3. Describe the solution you'd like
4. Describe alternatives you've considered
5. Add any relevant mockups or examples

---

Thank you for contributing to Backspace Detective! 