# Smart MCP Server

A context-aware Model Context Protocol (MCP) server that intelligently manages tool presentation and execution based on user context and requirements.

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D%2016.0.0-brightgreen)](https://nodejs.org/)

## 🚀 Overview

Smart MCP Server is a powerful middleware that serves as a context-aware bridge between AI models and tools. It analyzes user context, historical patterns, and content to intelligently present the most relevant tools, improving efficiency and reducing cognitive load. This repository provides the core server, a context-aware selector, and integrations with various services including Google's Gemini API.

## ✨ Key Features

- **Context-Aware Tool Selection**: Intelligently selects and presents tools based on:
  - User message content and context
  - Historical usage patterns
  - Tool categories (filesystem, code editing, AI, etc.)
  - Essential tool designation

- **Tool Server Architecture**: Manages multiple tool server instances with:
  - Server lifecycle management
  - Tool registration
  - Execution proxying
  - Error handling

- **Gemini API Integration**: Full integration with Google's Gemini models:
  - Text generation 
  - JSON response formatting
  - Streaming capabilities
  - Advanced model configuration

- **Workflow System**: Define, execute, and monitor complex workflows:
  - Sequential and parallel step execution
  - Dependency management
  - Variable storage and interjection
  - Progress monitoring
  - Execution history

- **Documentation Automation**: Tools for gathering and ingesting documentation:
  - Repository scanning
  - Markdown parsing
  - Documentation structure analysis
  - Knowledge integration

## 📋 Prerequisites

- Node.js (v16.0.0 or higher)
- npm (v7.0.0 or higher)
- For Gemini API: Google AI API key

## 🔧 Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/reconsumeralization/smart-mcp-server.git
   cd smart-mcp-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

## 🏗️ Project Structure

```
smart-mcp-server/
├── context-aware-selector.js  # Tool selection based on context
├── docs/                      # Documentation files
├── examples/                  # Example scripts
├── lib/                       # Shared libraries
├── schema/                    # Tool schema definitions
├── server.js                  # Main server implementation
├── servers/                   # Tool server implementations
├── test/                      # Test files
├── tool-proxy.js              # Tool execution proxy
├── tools/                     # Tool implementations
└── workflow-monitor.js        # Workflow monitoring system
```

## 🚀 Usage

### Running the Server

Start the main server:

```bash
npm run server
```

### Testing the Context-Aware Selector

```bash
npm run test
```

### Running Examples

Several example scripts are provided to demonstrate various features:

```bash
# Test Gemini API integration
node examples/gemini-example.js

# Test context-aware selector
node test-context-aware-selector.js

# Run workflow examples
node examples/test-workflow.js
```

## 🔌 Available Tool Integrations

### AI Tools
- **Gemini API**: Google's generative AI models for text generation, chat, and more
- **Sequential Thinking**: Step-by-step reasoning tool
- **Web Research**: Internet search capabilities

### Development Tools
- **GitHub**: Repository management, issue tracking, PR creation
- **Filesystem**: File manipulation, code editing
- **Database**: PostgreSQL integration (planned)

### Memory Tools
- **Knowledge Graph**: For storing and retrieving structured information
- **Vector Store**: For semantic search and retrieval

## 📊 Context-Aware Tool Selection

The context-aware selector analyzes user messages and historical usage to present the most relevant tools:

```javascript
// Example usage
import { selectToolsForContext } from './context-aware-selector.js';

const userContext = {
  message: "Help me create a new React component",
  history: ["git status", "npm install"]
};

const selectedTools = selectToolsForContext(userContext, allTools);
```

## 🔄 Workflow System

Define complex workflows with dependencies and execute them:

```javascript
// Example workflow definition (JSON)
const workflow = {
  "id": "db-integration",
  "description": "Database Integration Workflow",
  "concurrencyLimit": 3, 
  "steps": [
    {
      "id": "research-orm",
      "type": "web-search",
      "parameters": {
        "query": "Node.js ORM comparison prisma sequelize"
      }
    },
    // Additional steps...
  ]
};
```

## 🌐 Gemini API Integration

Use Google's Gemini models for various tasks:

```javascript
import { GeminiClient } from './lib/gemini-client.js';

// Initialize client
const client = new GeminiClient();

// Generate text
const result = await client.generateText("Explain quantum computing");
console.log(result.text);

// Generate JSON
const userData = await client.generateJson(
  "Create a JSON user profile with name, email, and age"
);
console.log(userData);

// Stream responses
const stream = await client.generateStream("Write a story about a robot");
for await (const chunk of stream.stream) {
  process.stdout.write(chunk.text());
}
```

## 🔍 API Endpoints

The server exposes the following API endpoints:

- `POST /api/tools`: Register a new tool
- `GET /api/tools`: Get all available tools
- `POST /api/execute`: Execute a tool
- `GET /api/context`: Get context-aware tool suggestions
- `POST /api/workflows`: Register a new workflow
- `GET /api/workflows`: Get all workflows
- `GET /api/workflows/:id`: Get a specific workflow
- `POST /api/workflows/:id/execute`: Execute a workflow

## 📚 Documentation

Comprehensive documentation is available in the `docs/` directory:

- [Context-Aware Selector](docs/context-aware-selector.md)
- [Gemini Integration](docs/gemini-integration.md)
- [Workflow Testing](docs/workflow-testing.md)

## 🛠️ Development

### Adding a New Tool

1. Create a tool implementation in the `tools/` directory
2. Define the tool schema in the `schema/` directory
3. Add server implementation in the `servers/` directory
4. Register the tool in `server.js`

### Running Tests

```bash
npm test
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Contact

Project Maintainer: [David Weatherspoon](https://github.com/reconsumeralization)
