# Smart MCP Server

A context-aware Model Context Protocol (MCP) server that intelligently manages tool presentation and execution.

## Overview

This server acts as a gateway between LLM applications and tool servers. It dynamically selects the most relevant tools based on the user's context and query, improving the efficiency and relevance of tool recommendations.

## Features

- **Context-Aware Tool Selection**: Intelligently filters and prioritizes tools based on user queries and context
- **Tool Proxy**: Manages execution of tools on various servers
- **Caching**: Improves performance with intelligent caching of tool information
- **Security**: Implements authentication, rate limiting, and input validation
- **Workflow System**: Orchestrates parallel execution of tools with dependency management
- **Extensible**: Easy to add new tool servers and categories

## Architecture

The Smart MCP Server consists of the following components:

1. **tool-proxy.js**: Handles execution of tools on their respective servers
2. **context-aware-selector.js**: Analyzes user context to select the most relevant tools
3. **server-connector.js**: Manages connections to external tool servers
4. **workflow-manager.js**: Handles parallel tool execution with dependency resolution
5. **workflow-api.js**: Provides API endpoints for managing workflows
6. **server.js**: Main server implementation with API routes, security, and more
7. **index.js**: Simple entry point to start the server

## API Endpoints

- **GET /tools** - List available tools (filtered by context if query provided)
- **POST /execute/:toolId** - Execute a specific tool
- **GET /categories** - List all tool categories
- **GET /categories/:category/tools** - Get tools for a specific category
- **GET /tools/:toolId** - Get detailed information about a specific tool
- **GET /health** - Server health check endpoint

### Workflow API Endpoints

- **POST /api/workflows** - Register a new workflow
- **GET /api/workflows** - List all registered workflows
- **POST /api/workflows/:id/execute** - Execute a workflow
- **GET /api/workflows/executions/:executionId** - Get workflow execution status

## Setup

### Prerequisites

- Node.js 16+ and npm

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory (see `.env.example` for required variables)

### Running the Server

```bash
# Development mode with auto-restart
npm run server:dev

# Production mode
npm run server
```

## Customizing Tool Selection

The context-aware selector uses various signals to determine which tools are most relevant:

- Direct mentions of the tool name in the query
- Keywords related to the tool's category
- Recently used tools
- Essential tools that should always be available

You can customize the selection logic by modifying the `context-aware-selector.js` file.

## Using the Workflow System

The workflow system allows you to orchestrate the execution of multiple tools, potentially in parallel, while respecting dependencies between steps.

### Workflow Structure

A workflow consists of steps, where each step executes a specific tool. Steps can depend on other steps, creating a dependency graph that determines execution order.

```json
{
  "id": "my-workflow",
  "steps": [
    {
      "id": "step1",
      "toolId": "tool1",
      "params": { ... }
    },
    {
      "id": "step2",
      "toolId": "tool2",
      "params": { ... },
      "dependencies": ["step1"]
    }
  ],
  "concurrencyLimit": 3
}
```

### Parameter Interpolation

The workflow system supports parameter interpolation to pass data between steps:

- Access context values: `${context.value}`
- Access previous step results: `${steps.stepId.resultProperty}`

### Example Workflows

For example workflows, see the `examples/` directory:

- `web-search-workflow.json`: Combines web search with sequential thinking
- `github-analytics-workflow.json`: Analyzes GitHub repositories using multiple tools

## Security Considerations

The server implements several security features:

- Rate limiting to prevent abuse
- Input validation to prevent injection attacks
- Authentication (token-based)
- Path validation to prevent directory traversal
- Audit logging for security events

## Adding New Tool Servers

To add a new tool server:

1. Add the server configuration to your `.vscode/mcp.json` file
2. Add any special tool handling logic to the tool-proxy.js file if needed
3. Restart the server

## License

MIT
