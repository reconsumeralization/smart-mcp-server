# Gemini API Integration

This document explains how to integrate and use Google's Gemini API with the smart-mcp-server.

## Overview

The Smart MCP Server integrates with Google's Gemini API to provide powerful generative AI capabilities. This integration enables:

- Text generation with various configurations
- JSON response formatting
- Streaming responses for real-time applications
- Mixed content handling

## Prerequisites

To use the Gemini API integration, you'll need:

1. A Google AI Studio account
2. A valid Gemini API key
3. Node.js v18 or later

## Setup

### 1. Get an API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create or sign in to your Google account
3. Generate an API key
4. Make sure your API key has access to the Gemini models you want to use

### 2. Configure Environment Variables

Create a `.env` file in the root of your project based on the `.env.example` template:

```bash
# Copy the example file
cp .env.example .env

# Edit with your favorite editor
nano .env
```

Update the following values:

```env
GEMINI_API_KEY=your-actual-api-key
GEMINI_MODEL=gemini-2.0-flash  # or another Gemini model
GEMINI_MAX_TOKENS=2048  # adjust based on your needs
GEMINI_TEMPERATURE=0.7  # 0.0 to 1.0, lower for more deterministic responses
GEMINI_TOP_P=0.9
GEMINI_TOP_K=40
```

### 3. Install Dependencies

```bash
npm install @google/generative-ai
```

## Available Models

The Gemini integration supports various models:

| Model | Description | Use Cases |
|-------|-------------|-----------|
| gemini-2.0-flash | Fast and efficient text generation | General text, code, chat |
| gemini-1.5-flash | Previous generation, still effective | Simpler text generation |
| gemini-1.5-pro | More powerful, handles complex tasks | Complex reasoning, planning |

## Usage Examples

### Basic Text Generation

```javascript
import { GeminiClient } from '../lib/gemini-client.js';

const client = new GeminiClient();
const result = await client.generateText("Explain JavaScript Promises");
console.log(result);
```

### JSON Generation

```javascript
import { GeminiClient } from '../lib/gemini-client.js';

const client = new GeminiClient({ temperature: 0.2 }); // Lower temperature for structured data
const prompt = `Generate a JSON object for a user profile with name, email, and age.
The response must be valid JSON with no other text.`;

const result = await client.generateJson(prompt);
console.log(result);
```

### Streaming Responses

```javascript
import { GeminiClient } from '../lib/gemini-client.js';

const client = new GeminiClient();
const stream = await client.generateStream("Explain quantum computing");

for await (const chunk of stream) {
  process.stdout.write(chunk); // Display each chunk as it arrives
}
```

## Handling Errors

The Gemini integration includes error handling for common issues:

- API key validation
- Rate limiting
- Model availability
- Response parsing errors

See the examples in `examples/gemini-response-types-example.js` for implementation details.

## Troubleshooting

If you encounter issues:

1. Verify your API key is valid and has the necessary permissions
2. Check you haven't exceeded your quota or rate limits
3. Try using a different Gemini model
4. Ensure your prompts follow Google's content policy
5. Check network connectivity and proxy settings

## Additional Resources

- [Google AI Studio Documentation](https://ai.google.dev/docs)
- [Gemini API Reference](https://ai.google.dev/api/rest/v1beta/models)
- [Content Guidelines](https://ai.google.dev/docs/content_guidelines)
