# Smart MCP Server Examples

This directory contains example scripts that demonstrate various features and integrations of the Smart MCP Server.

## Gemini API Examples

### Setup

Before running the Gemini API examples, you need to:

1. Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a `.env` file in the project root with your API key:
   ```env
   GEMINI_API_KEY=your-api-key-here
   ```
   
   Or set the environment variable before running the script:
   
   ```bash
   # Windows PowerShell
   $env:GEMINI_API_KEY = "your-api-key-here"
   
   # Windows CMD
   set GEMINI_API_KEY=your-api-key-here
   
   # Linux/Mac
   export GEMINI_API_KEY=your-api-key-here
   ```

### Example Scripts

#### Response Types Example

Demonstrates different types of responses from the Gemini API:

```bash
node examples/gemini-response-types-example.js
```

This example shows:
- Plain text responses
- JSON responses
- Streaming responses
- Mixed content with code examples

#### Basic Gemini Example

Simpler example showing basic Gemini functionality:

```bash
npm run gemini:example
```

## Workflow Examples

### Testing Individual Workflows

Test a specific workflow:

```bash
npm run workflow:test -- --id=your-workflow-id
```

### Workflow Monitoring

Monitor the status of all workflows:

```bash
npm run workflow:monitor
```

### Workflow Registration

Register a new workflow:

```bash
npm run workflow:example
```

## Context-Aware Selector Examples

### Testing Selector Logic

```bash
node test-context-aware-selector.js
```

## Database Integration Examples

### Testing Database Connectivity

```bash
node examples/test-database-integration.js
```

## Troubleshooting

If you encounter issues:

1. Verify your API keys are correct in the `.env` file
2. Check network connectivity
3. Make sure you have installed all dependencies with `npm install`
4. For Gemini API issues, verify your API key has access to the models used in examples

## Available Examples

### Gemini API Examples

- **gemini-example.js**: Basic example showing how to use the Gemini API for text generation and chat.
- **gemini-advanced-example.js**: Advanced usage of Gemini models, including handling inline data and tool calling.
- **gemini-with-tools-example.js**: Example of using Gemini with tool calling capabilities to solve more complex tasks.
- **gemini-response-types-example.js**: Demonstrates configuring Gemini models for different response types, including plain text, JSON, and streaming text. Features error handling and model fallback.
- **gemini-basic-test.js**: A simple utility to test which Gemini models are available for your API key and account tier. Use this first to determine which models you have access to.

### Database Integration

- **database-integration-workflow.json**: Workflow for integrating PostgreSQL with the MCP server.

### Other Examples

- **workflow-example.json**: Example of a workflow configuration.
- **gemini-integration-workflow.json**: Workflow for integrating the Gemini API.

## Running Examples

Most examples can be run directly with Node.js:

```bash
# Make sure you've installed dependencies
npm install

# Set up your .env file with required API keys and configuration

# Run a specific example
node examples/gemini-example.js
```

## Required Environment Variables

For Gemini API examples:

- `GEMINI_API_KEY`: Your Google AI Studio API key

For database examples:

- `DATABASE_URL`: PostgreSQL connection string

See the `.env.example` file in the project root for more environment variables.

## Workflow Examples

Workflow examples (JSON files) are not meant to be executed directly. They are configuration files that define workflows to be processed by the MCP server's workflow engine.

To use a workflow:

1. Start the MCP server
2. Upload or register the workflow
3. Trigger the workflow through the API

## Additional Resources

For more information, see the documentation in the `/docs` directory.

### Running Gemini Examples

To run the Gemini examples, you'll need to provide a valid Gemini API key:

```bash
# On Windows PowerShell
$env:GEMINI_API_KEY = "your-api-key"; node examples/gemini-basic-test.js

# On Linux/macOS
GEMINI_API_KEY="your-api-key" node examples/gemini-basic-test.js
```

The examples will create an `output` directory in the examples folder to store generated content when applicable.
