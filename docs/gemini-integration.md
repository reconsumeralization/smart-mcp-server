# Gemini API Integration

The Smart MCP Server integrates with Google's Gemini API to provide powerful text generation, chat functionality, and other AI capabilities. This document provides instructions on setting up and using the Gemini integration.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Configuration](#configuration)
- [API Reference](#api-reference)
  - [Text Generation](#text-generation)
  - [Chat Functionality](#chat-functionality)
  - [Image-Based Generation](#image-based-generation)
  - [Embeddings](#embeddings)
- [Context-Aware Selector Integration](#context-aware-selector-integration)
- [Examples](#examples)
- [Error Handling](#error-handling)
- [Server Implementation](#server-implementation)
- [Security Considerations](#security-considerations)

## Prerequisites

To use the Gemini integration, you'll need:

1. A Google AI Studio account with access to the Gemini API
2. A valid Gemini API key
3. Node.js 18.0 or higher
4. The `@google/generative-ai` and `mime-types` npm packages

## Configuration

Configuration is managed through environment variables in the `.env` file:

```
# Gemini Configuration
GEMINI_API_KEY=your-api-key-here
GEMINI_MODEL=gemini-pro
GEMINI_MAX_TOKENS=8192
GEMINI_TEMPERATURE=0.7
GEMINI_TOP_P=0.95
GEMINI_TOP_K=40
GEMINI_SERVER_PORT=3006
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Your Gemini API key (required) | - |
| `GEMINI_MODEL` | The Gemini model to use | gemini-pro |
| `GEMINI_MAX_TOKENS` | Maximum tokens to generate | 8192 |
| `GEMINI_TEMPERATURE` | Controls randomness (0.0-1.0) | 0.7 |
| `GEMINI_TOP_P` | Nucleus sampling parameter | 0.95 |
| `GEMINI_TOP_K` | Top-K sampling parameter | 40 |
| `GEMINI_SERVER_PORT` | Port for the Gemini server | 3006 |

## API Reference

### Text Generation

Generate text content from a prompt:

```javascript
import geminiClient from './lib/gemini-client.js';

const result = await geminiClient.generateText('Your prompt here', {
  temperature: 0.7,
  maxTokens: 500
});

console.log(result.text);
```

#### Parameters

- `prompt` (string, required): The text prompt
- `options` (object, optional):
  - `temperature` (number, default: 0.7): Controls randomness
  - `maxTokens` (number, default: 8192): Maximum tokens to generate
  - `topP` (number, default: 0.95): Nucleus sampling parameter
  - `topK` (number, default: 40): Top-K sampling parameter

### Chat Functionality

Create a chat session and send messages:

```javascript
// Create a new chat session
const chat = geminiClient.createChat();

// Send a message and get response
const response = await chat.sendMessage('Hello, Gemini!');
console.log(response.text());

// Send a follow-up message
const followUpResponse = await chat.sendMessage('Tell me more about that.');
console.log(followUpResponse.text());
```

Using the tool API:

```javascript
// Create a session
const sessionResult = await geminiTool.createChatSession({});
const sessionId = sessionResult.sessionId;

// Send a message
const msgResult = await geminiTool.sendChatMessage({
  sessionId,
  message: 'Hello, Gemini!'
});

console.log(msgResult.result.text);
```

### Image-Based Generation

Generate content using both text and images:

```javascript
const result = await geminiClient.generateWithImages(
  'Describe what you see in this image',
  ['/path/to/image.jpg', '/path/to/another.png']
);

console.log(result.text);
```

### Embeddings

Generate vector embeddings for text:

```javascript
const embedding = await geminiClient.generateEmbedding('Your text here');
console.log(`Generated embedding with ${embedding.length} dimensions`);
```

## Context-Aware Selector Integration

The Gemini tools are integrated with the context-aware selector, which allows them to be recommended based on user context. The following tools are available:

- `gemini_generate_text`: Text generation
- `gemini_create_chat`: Create a chat session
- `gemini_chat_message`: Send a message in a chat session
- `gemini_get_chat_history`: Retrieve chat history
- `gemini_generate_with_images`: Generate content from text and images
- `gemini_generate_embedding`: Generate text embeddings

The context keywords used to recommend Gemini tools include: "generate", "chat", "text", "ai", "gemini", "create", "model", "image".

## Examples

See the `examples/gemini-example.js` file for complete usage examples, including:

- Text generation
- Chat conversations
- Embedding generation

## Error Handling

The Gemini client and tool handle errors gracefully:

- API key validation errors are returned clearly
- Invalid parameters are checked before API calls
- Network and server errors are caught and returned with descriptive messages

For example:

```javascript
try {
  const result = await geminiClient.generateText('');
} catch (error) {
  console.error('Error:', error.message);
  // Handle the error appropriately
}
```

## Server Implementation

The Gemini server (`servers/gemini-server.js`) provides HTTP endpoints for all Gemini functionality:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Server health check |
| `/api/initialize` | GET | Initialize and validate configuration |
| `/api/generate` | POST | Generate text |
| `/api/chat/session` | POST | Create a chat session |
| `/api/chat/message` | POST | Send a chat message |
| `/api/chat/history/:sessionId` | GET | Get chat history |
| `/api/generate/images` | POST | Generate content with images |
| `/api/embed` | POST | Generate text embeddings |

## Security Considerations

- API keys are stored in environment variables, not in code
- Rate limiting is implemented to prevent abuse
- All API endpoints validate input parameters
- Error messages are sanitized to avoid revealing sensitive information
- Session management includes automatic cleanup of inactive sessions 