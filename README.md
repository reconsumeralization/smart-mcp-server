# Smart MCP Server

A sophisticated, context-aware Model Context Protocol (MCP) server with Agent-to-Agent (A2A) protocol compliance. Features intelligent workflow execution, secure token management, and comprehensive AI model integration including Google's Gemini models.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![MCP Compliant](https://img.shields.io/badge/MCP-v1.0-blue)](https://modelcontextprotocol.io/)
[![A2A Compliant](https://img.shields.io/badge/A2A-v1.0-green)](https://github.com/modelcontextprotocol/specification)

## 🌟 Key Features

### 🔐 **Secure Token Management**
- **MCP/A2A Compliant Tokens**: Automatically generates and manages protocol-compliant API tokens
- **AES-256-CBC Encryption**: Secure token storage with industry-standard encryption
- **Automatic Refresh**: Intelligent token validation and refresh mechanisms
- **CLI Management**: Easy token generation, validation, and monitoring via CLI tools

### 🤖 **Multi-Model AI Integration**
- **Gemini Models**: Full integration with Google's Gemini 2.5 Pro, Gemini Pro, and embedding models
- **OpenAI Support**: GPT-4, GPT-3.5 Turbo, and embedding models
- **Anthropic Integration**: Claude 3 Opus, Sonnet, and Haiku models
- **Model-Agnostic Architecture**: Unified interface across all AI providers

### 🔄 **Advanced Workflow System**
- **Dynamic Workflow Loading**: Automatically loads workflow definitions from JSON files
- **Intelligent Execution**: Uses AI function calling for optimal workflow selection
- **Progress Monitoring**: Real-time execution tracking with metrics and logging
- **Error Recovery**: Sophisticated error handling and retry mechanisms

### 🌐 **Protocol Compliance**
- **MCP v1.0**: Full Model Context Protocol implementation
- **A2A v1.0**: Agent-to-Agent protocol for multi-agent collaboration
- **Tool Discovery**: Automatic tool registration and capability advertisement
- **Secure Communication**: Encrypted inter-agent communication

### 🛠️ **Comprehensive Toolset**
- **GitHub Integration**: Repository management, analytics, and automation
- **Stripe Integration**: Payment processing and subscription management
- **System Health Monitoring**: Real-time system metrics and alerting
- **Documentation Tools**: Automated documentation consolidation and management

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18.0.0 or higher
- **npm** v7.0.0 or higher
- **Google Gemini API Key** (for AI features)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/reconsumeralization/smart-mcp-server.git
   cd smart-mcp-server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Generate MCP/A2A compliant tokens:**
   ```bash
   npm run token:generate
   ```

4. **Start the server:**
   ```bash
   npm start
   ```

The server will start on port 3000 (configurable) with full MCP and A2A protocol support.

## 🔑 Token Management

### CLI Commands

```bash
# Generate a new MCP/A2A compliant token
npm run token:generate

# Refresh existing token
npm run token:refresh

# Validate current token compliance
npm run token:validate

# Show detailed token information
npm run token:info

# Export token metadata (no sensitive data)
npm run token:export

# Show help
npm run token:help
```

### Token Features

- **🛡️ Security**: AES-256-CBC encryption with secure key management
- **✅ Compliance**: Full MCP v1.0 and A2A v1.0 protocol compliance
- **🔄 Auto-Refresh**: Automatic token validation and refresh
- **📊 Monitoring**: Detailed token status and usage tracking

## 🏗️ Architecture

```
smart-mcp-server/
├── src/
│   ├── archer/                    # Arrow server for agentic framework
│   ├── lib/
│   │   ├── token-manager.js       # Secure token management
│   │   ├── agents/                # AI agent implementations
│   │   └── ai-workflows/          # Workflow orchestration
│   ├── models/
│   │   └── drivers/               # AI model drivers (Gemini, OpenAI, Anthropic)
│   ├── tools/                     # MCP-compliant tool implementations
│   ├── routes/                    # API endpoints
│   └── middleware/                # Authentication, validation, etc.
├── examples/                      # Workflow examples and demos
├── scripts/                       # Management and utility scripts
├── docs/                          # Comprehensive documentation
└── public/                        # A2A agent discovery
```

## 🔌 API Endpoints

### Core Endpoints
- `GET /health` - Health check and system status
- `POST /a2a/tasks` - Agent-to-Agent task execution
- `GET /.well-known/agent.json` - Agent discovery (A2A protocol)

### Workflow Management
- `GET /api/workflows` - List all available workflows
- `POST /api/workflows/:id/execute` - Execute a specific workflow
- `GET /api/workflows/:id/status` - Get workflow execution status

### Token Management
- `POST /api/tokens/refresh` - Refresh API tokens
- `GET /api/tokens/info` - Get token information
- `POST /api/tokens/validate` - Validate token compliance

### Tool Integration
- `GET /api/tools` - List available MCP tools
- `POST /api/tools/execute` - Execute a tool with parameters

## 🤖 AI Model Integration

### Gemini Integration

```javascript
import { GeminiDriver } from './src/models/drivers/gemini-driver.js';

const gemini = new GeminiDriver();
await gemini.initialize(); // Automatic token management

// Text generation with MCP compliance
const result = await gemini.generate({
  prompt: "Explain quantum computing",
  temperature: 0.7,
  maxTokens: 1024
});

// Streaming responses
for await (const chunk of gemini.stream({ prompt: "Write a story" })) {
  console.log(chunk.text);
}

// Embeddings
const embedding = await gemini.embedding({ 
  text: "Convert this to vector representation" 
});
```

### Multi-Model Support

```javascript
import { ModelDriver } from './src/models/ModelDriver.js';

// Unified interface across all models
const models = {
  gemini: new GeminiDriver(),
  openai: new OpenAIDriver(),
  anthropic: new AnthropicDriver()
};

// Automatic model selection based on task
const bestModel = await ModelDriver.selectOptimal({
  task: "code_generation",
  requirements: { speed: "fast", quality: "high" }
});
```

## 🔄 Workflow System

### Defining Workflows

Create workflow JSON files in the `examples/` directory:

```json
{
  "id": "data-analysis-workflow",
  "name": "Data Analysis Pipeline",
  "description": "Comprehensive data analysis with AI insights",
  "version": "1.0",
  "mcp_compliant": true,
  "a2a_compliant": true,
  "steps": [
    {
      "id": "data-extraction",
      "type": "database-query",
      "tool": "mcp_database_tool",
      "parameters": {
        "query": "SELECT * FROM analytics_data WHERE date >= '{{start_date}}'"
      }
    },
    {
      "id": "ai-analysis",
      "type": "ai-processing",
      "tool": "mcp_gemini_tool",
      "parameters": {
        "model": "gemini-2.5-pro",
        "prompt": "Analyze this data and provide insights: {{data}}"
      },
      "depends_on": ["data-extraction"]
    },
    {
      "id": "report-generation",
      "type": "document-creation",
      "tool": "mcp_documentation_tool",
      "parameters": {
        "template": "analysis-report",
        "data": "{{ai-analysis.result}}"
      },
      "depends_on": ["ai-analysis"]
    }
  ]
}
```

### Executing Workflows

```bash
# List available workflows
curl http://localhost:3000/api/workflows

# Execute a workflow
curl -X POST http://localhost:3000/api/workflows/data-analysis-workflow/execute \
  -H "Content-Type: application/json" \
  -d '{"start_date": "2024-01-01"}'

# Monitor execution
curl http://localhost:3000/api/workflows/execution-id-123/status
```

## 🛠️ Available Tools

### GitHub Tool (`mcp_github_tool`)
```javascript
// Repository analytics
const stats = await tools.mcp_github_search_repositories({
  query: "machine learning",
  sort: "stars",
  limit: 10
});

// Create pull request
const pr = await tools.mcp_github_create_pull_request({
  owner: "username",
  repo: "repository",
  title: "Feature: Add new functionality",
  body: "Description of changes",
  head: "feature-branch",
  base: "main"
});
```

### System Health Tool (`mcp_system_health_tool`)
```javascript
// Get system metrics
const health = await tools.mcp_system_health_check();
console.log(health); // { cpu: 45, memory: 67, status: "healthy" }

// Monitor performance
const metrics = await tools.mcp_system_performance_metrics({
  duration: "1h",
  interval: "5m"
});
```

### Documentation Tool (`mcp_documentation_tool`)
```javascript
// Consolidate documentation
const docs = await tools.mcp_consolidate_documentation({
  source: "./docs",
  output: "./consolidated-docs.md",
  format: "markdown"
});
```

## 🔍 Context-Aware Tool Selection

The system intelligently selects tools based on context:

```javascript
import { selectToolsForContext } from './src/context-aware-selector.js';

const context = {
  message: "Help me optimize this database query",
  history: ["SELECT * FROM users", "EXPLAIN ANALYZE"],
  project: { type: "database", language: "SQL" }
};

const selectedTools = selectToolsForContext(context, availableTools);
// Returns: [database-tool, performance-tool, query-optimizer]
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Test specific components
npm run test:integration
npm run test:tools
npm run test:workflows

# Test token management
npm run token:validate
npm run token:info
```

## 📊 Monitoring and Analytics

### Real-time Metrics
- **System Health**: CPU, memory, disk usage
- **API Performance**: Response times, error rates
- **Token Usage**: API calls, quota monitoring
- **Workflow Execution**: Success rates, performance metrics

### Logging
```bash
# View logs
tail -f logs/all.log
tail -f logs/error.log

# Workflow-specific logs
ls logs/workflow-test/
```

## 🔧 Configuration

### Environment Variables

```bash
# Core Configuration
PORT=3000
NODE_ENV=production
LOG_LEVEL=info

# AI Models (automatically managed by token system)
GEMINI_MODEL=gemini-2.5-pro

# External Integrations
GITHUB_TOKEN=your_github_token
STRIPE_SECRET_KEY=your_stripe_key

# Database
POSTGRES_URL=postgresql://user:pass@localhost:5432/db
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

### Agent Configuration

The system automatically advertises its capabilities via `public/agent.json`:

```json
{
  "id": "smart-mcp-agent",
  "name": "Smart MCP Agent",
  "protocol_versions": {
    "mcp": "1.0",
    "a2a": "1.0"
  },
  "capabilities": [
    "workflow_execution",
    "token_management", 
    "model_interaction"
  ],
  "supported_models": [
    "gemini-2.5-pro",
    "gpt-4",
    "claude-3-opus"
  ]
}
```

## 🚀 Advanced Usage

### Custom Tool Development

```javascript
// Create a new MCP-compliant tool
export async function mcp_custom_tool(params) {
  const { input, options = {} } = params;
  
  try {
    // Tool implementation
    const result = await processInput(input, options);
    
    return {
      success: true,
      result,
      metadata: {
        mcp_compliant: true,
        execution_time: Date.now() - startTime
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      metadata: { mcp_compliant: true }
    };
  }
}
```

### Multi-Agent Coordination

```javascript
// A2A protocol communication
const taskResult = await fetch('http://other-agent:3000/a2a/tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    task_description: "Analyze financial data",
    context: { timeframe: "Q4 2024" }
  })
});
```

## 📚 Documentation

Comprehensive documentation is available:

- [**Token Management Guide**](docs/token-management.md)
- [**Workflow Development**](docs/workflow-development.md) 
- [**Tool Integration**](docs/tool-integration.md)
- [**A2A Protocol Guide**](docs/a2a-protocol.md)
- [**Security Best Practices**](docs/security.md)

## 🔐 Security

- **🔒 Token Encryption**: AES-256-CBC encryption for all sensitive data
- **🛡️ Secure Storage**: File permissions and access controls
- **🔄 Auto-Rotation**: Automatic token refresh and validation
- **📊 Audit Logging**: Comprehensive security event logging
- **🚫 No Hardcoded Secrets**: All credentials via environment variables

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md).

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes with tests
4. Ensure MCP/A2A compliance
5. Submit a pull request

### Development Setup

```bash
# Install development dependencies
npm install

# Run in development mode
npm run dev

# Run tests with coverage
npm run test:coverage

# Lint and format code
npm run lint
npm run format
```

## 📈 Roadmap

- [ ] **Enhanced AI Models**: Integration with more AI providers
- [ ] **Advanced Workflows**: Visual workflow builder and editor
- [ ] **Real-time Collaboration**: Multi-user workflow execution
- [ ] **Plugin System**: Third-party tool integration framework
- [ ] **Cloud Deployment**: One-click cloud deployment options

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io/) for the MCP specification
- [Google AI](https://ai.google.dev/) for Gemini API access
- [OpenAI](https://openai.com/) for GPT model integration
- [Anthropic](https://anthropic.com/) for Claude model support

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/reconsumeralization/smart-mcp-server/issues)
- **Discussions**: [GitHub Discussions](https://github.com/reconsumeralization/smart-mcp-server/discussions)
- **Email**: [David Weatherspoon](mailto:david@reconsumeralization.com)

---

**Built with ❤️ for the AI agent ecosystem**

*Smart MCP Server - Empowering intelligent agent collaboration through secure, protocol-compliant infrastructure.*
