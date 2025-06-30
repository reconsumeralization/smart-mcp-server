# Contributing to the Smart MCP Server

First off, thank you for considering contributing! Your help is appreciated.

This document provides guidelines for contributing to this project. Please feel free to propose changes to this document in a pull request.

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

- **Ensure the bug was not already reported** by searching on GitHub under [Issues](https://github.com/reconsumeralization/smart-mcp-server/issues).
- If you're unable to find an open issue addressing the problem, [open a new one](https://github.com/reconsumeralization/smart-mcp-server/issues/new). Be sure to include a **title and clear description**, as much relevant information as possible, and a **code sample** or an **executable test case** demonstrating the expected behavior that is not occurring.

### Suggesting Enhancements

- Open a new issue with the title `[Enhancement] Your Suggestion`.
- Provide a clear description of the enhancement, why it would be beneficial, and a potential implementation strategy if you have one.

### Pull Requests

1. Fork the repository and create your branch from `master`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes (`npm test`).
5. Make sure your code lints (`npm run lint`).
6. Issue that pull request!

## Styleguides

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature").
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...").
- Limit the first line to 72 characters or less.
- Reference issues and pull requests liberally after the first line.

### JavaScript Styleguide

- All JavaScript must adhere to the style defined in the `.eslintrc.json` file.
- Use `npm run lint -- --fix` to automatically correct many style issues.

## Development Setup

1. `git clone https://github.com/reconsumeralization/smart-mcp-server.git`
2. `cd smart-mcp-server`
3. `npm install`
4. Create a `.env` file based on the required variables in `config.js`.
5. `npm run dev` to start the development server.

We look forward to your contributions! 