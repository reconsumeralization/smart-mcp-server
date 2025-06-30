# Smart MCP Server (Gemini Edition)

This project is a sophisticated, context-aware agent that leverages Google's Gemini models for intelligent workflow execution. It is compliant with both the Model Context Protocol (MCP) and the Agent-to-Agent (A2A) protocol, allowing it to serve as a powerful tool in a multi-agent system.

The server dynamically loads and manages workflows, using Gemini's native function calling capabilities to intelligently select and execute the correct workflow based on natural language task descriptions.

## Key Features

- **Gemini-Powered Intelligence**: Uses Gemini (configurable model, e.g., `gemini-pro`) for state-of-the-art function calling to drive workflow selection.
- **A2A Compliant**: Implements the Agent-to-Agent protocol, allowing it to communicate and collaborate with other AI agents. Includes `/.well-known/agent.json` for discovery and a `/a2a/tasks` endpoint for execution.
- **Dynamic Workflow System**: Automatically loads workflow definitions from JSON files, making it easy to add or modify complex processes without changing the core code.
- **Centralized Configuration**: A single `config.js` file manages all essential settings, from server ports to API keys.
- **Extensible and Modular**: The architecture is designed to be easily extended with new workflows and capabilities.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- A Google Gemini API Key

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/reconsumeralization/smart-mcp-server.git
    cd smart-mcp-server
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up your environment:**
    - Copy the `.env.example` file to a new file named `.env`:
      ```bash
      cp .env.example .env
      ```
    - Open the `.env` file and add your Google Gemini API key:
      ```
      GEMINI_API_KEY=your_gemini_api_key_here
      ```

### Running the Server

-   **To start the server in production mode:**
    ```bash
    npm start
    ```
-   **To start the server in development mode (with hot reloading):**
    ```bash
    npm run dev
    ```

The server will start on the port defined in your configuration (default is `3000`).

## API Documentation

API documentation is available via Swagger UI. Once the server is running, you can access it at:

`http://localhost:3000/api-docs`

This interface allows you to explore and interact with all the available endpoints, including the A2A task endpoint.

## How It Works

1.  **A2A Task Received**: An external agent sends a POST request to the `/a2a/tasks` endpoint with a `task_description`.
2.  **Workflow Selection**: The server prepares a list of all available workflows and sends them along with the task description to the Gemini API.
3.  **Gemini Function Calling**: Gemini analyzes the task and selects the most appropriate workflow to execute, returning it as a "function call".
4.  **Workflow Execution**: The `WorkflowManager` executes the selected workflow, processing each step and interpolating the necessary arguments.
5.  **A2A Response**: The server returns the result of the workflow execution in a standard A2A format.

## Adding New Workflows

To add a new workflow, simply create a new `.json` file in the `/examples` directory. The server will automatically load it on startup. Ensure the workflow JSON is valid and includes the required `id`, `name`, `description`, and `steps` fields.

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

```plaintext
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

## 🚀 Advanced Examples

### 1. Multi-Tool Orchestration

Combine multiple tools for complex tasks:

```javascript
import { ToolOrchestrator } from './lib/tool-orchestrator.js';

// Create an orchestrator with error handling and retry logic
const orchestrator = new ToolOrchestrator({
  maxRetries: 3,
  retryDelay: 1000,
  fallbackStrategy: 'alternative-tool'
});

// Define a complex task using multiple tools
const task = orchestrator.createTask()
  .use('gemini-tool')
    .withConfig({ temperature: 0.2 })
    .forStep('analyze-requirements')
  .use('github-tool')
    .withAuth(process.env.GITHUB_TOKEN)
    .forStep('create-pr')
  .use('database-tool')
    .withRetry(5)
    .forStep('store-results');

// Execute with progress monitoring
const result = await task.execute({
  onProgress: (step, progress) => console.log(`${step}: ${progress}%`),
  onError: (step, error) => console.error(`Error in ${step}:`, error)
});
```

### 2. Context-Aware Tool Selection with Memory

```javascript
import { ContextAnalyzer } from './lib/context-analyzer.js';
import { MemoryStore } from './lib/memory-store.js';

// Initialize with persistent memory
const memory = new MemoryStore({
  storage: 'redis',
  ttl: '24h',
  namespace: 'tool-selection'
});

const analyzer = new ContextAnalyzer({
  memory,
  embeddings: true,
  contextWindow: 10
});

// Analyze context with historical data
const toolSuggestions = await analyzer.analyze({
  currentMessage: "Help me optimize this SQL query",
  userHistory: await memory.getUserHistory('user123'),
  projectContext: {
    language: 'SQL',
    database: 'PostgreSQL',
    performance: true
  }
});

// Get ranked tool suggestions with confidence scores
const rankedTools = toolSuggestions.getRankedTools();
console.log(rankedTools);
// [
//   { tool: 'database-optimizer', confidence: 0.95 },
//   { tool: 'query-analyzer', confidence: 0.85 },
//   { tool: 'performance-monitor', confidence: 0.75 }
// ]
```

### 3. Advanced Workflow with Error Recovery

```javascript
import { WorkflowBuilder } from './lib/workflow-builder.js';
import { ErrorRecoveryStrategy } from './lib/error-recovery.js';

// Create a workflow with sophisticated error handling
const workflow = new WorkflowBuilder()
  .addNode('data-extraction', {
    tool: 'database-tool',
    fallback: 'file-system-tool',
    validation: (data) => data.length > 0
  })
  .addNode('data-transformation', {
    tool: 'gemini-tool',
    retries: 3,
    timeout: '5m',
    recovery: new ErrorRecoveryStrategy({
      onTimeout: 'switch-model',
      onError: 'reduce-batch-size',
      onValidationFail: 'human-review'
    })
  })
  .addNode('data-loading', {
    tool: 'database-tool',
    mode: 'batch',
    batchSize: 1000,
    monitoring: {
      metrics: ['throughput', 'latency', 'errors'],
      alerts: {
        errorRate: { threshold: 0.01, action: 'pause' },
        latency: { threshold: '500ms', action: 'reduce-batch-size' }
      }
    }
  })
  .setEdges([
    ['data-extraction', 'data-transformation'],
    ['data-transformation', 'data-loading']
  ])
  .build();

// Execute with real-time monitoring
const execution = await workflow.execute({
  inputs: { query: 'SELECT * FROM large_table' },
  monitoring: {
    interval: '1s',
    metrics: ['progress', 'resource-usage', 'throughput'],
    onMetric: (metric) => console.log(`${metric.name}: ${metric.value}`),
    onAlert: (alert) => handleAlert(alert)
  }
});
```

### 4. AI-Powered Tool Composition

```javascript
import { AIToolComposer } from './lib/ai-tool-composer.js';
import { ToolRegistry } from './lib/tool-registry.js';

// Initialize AI-powered tool composer
const composer = new AIToolComposer({
  model: 'gemini-2.0-flash',
  optimization: 'performance',
  constraints: {
    maxTools: 5,
    maxMemory: '2GB',
    timeout: '10m'
  }
});

// Register available tools with capabilities
const registry = new ToolRegistry()
  .register('database-tool', {
    capabilities: ['query', 'transform', 'optimize'],
    costs: { memory: '500MB', latency: '100ms' }
  })
  .register('gemini-tool', {
    capabilities: ['analyze', 'generate', 'translate'],
    costs: { memory: '1GB', latency: '2s' }
  });

// Let AI compose optimal tool chain for task
const composition = await composer.compose({
  task: 'Analyze and optimize database performance',
  context: {
    database: 'PostgreSQL',
    dataSize: '10GB',
    performance: {
      current: { qps: 1000, latency: '200ms' },
      target: { qps: 2000, latency: '100ms' }
    }
  },
  registry
});

// Execute the AI-composed tool chain
const result = await composition.execute({
  monitoring: true,
  optimization: true,
  reporting: true
});
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
