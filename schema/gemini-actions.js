/**
 * Gemini Tool Actions Schema
 * 
 * This file defines the schema for Gemini API tool actions
 * used by the MCP server.
 */

export const geminiActionSchemas = {
  // Text generation action
  gemini_generate_text: {
    name: 'gemini_generate_text',
    description: 'Generate text content using Google\'s Gemini AI model',
    parameters: [
      {
        name: 'prompt',
        type: 'string',
        required: true,
        description: 'The text prompt to generate content from'
      },
      {
        name: 'temperature',
        type: 'number',
        required: false,
        description: 'Controls randomness of output (0.0-1.0, default: 0.7)',
        defaultValue: 0.7
      },
      {
        name: 'maxTokens',
        type: 'integer',
        required: false,
        description: 'Maximum number of tokens to generate (default: 1024)',
        defaultValue: 1024
      },
      {
        name: 'topP',
        type: 'number',
        required: false,
        description: 'Nucleus sampling parameter (0.0-1.0, default: 0.95)',
        defaultValue: 0.95
      },
      {
        name: 'topK',
        type: 'integer',
        required: false,
        description: 'Top-K sampling parameter (default: 40)',
        defaultValue: 40
      }
    ],
    tokenCost: 1 // Base token cost for this action
  },
  
  // Chat session creation action
  gemini_create_chat: {
    name: 'gemini_create_chat',
    description: 'Create a new chat session with Gemini AI',
    parameters: [
      {
        name: 'temperature',
        type: 'number',
        required: false,
        description: 'Controls randomness of output (0.0-1.0, default: 0.7)',
        defaultValue: 0.7
      },
      {
        name: 'maxTokens',
        type: 'integer',
        required: false,
        description: 'Maximum number of tokens to generate per message (default: 1024)',
        defaultValue: 1024
      },
      {
        name: 'history',
        type: 'array',
        required: false,
        description: 'Initial chat history (array of role/content objects)',
        defaultValue: []
      }
    ],
    tokenCost: 1
  },
  
  // Chat message action
  gemini_chat_message: {
    name: 'gemini_chat_message',
    description: 'Send a message in an existing Gemini chat session',
    parameters: [
      {
        name: 'sessionId',
        type: 'string',
        required: true,
        description: 'ID of the chat session'
      },
      {
        name: 'message',
        type: 'string',
        required: true,
        description: 'Message content to send'
      },
      {
        name: 'temperature',
        type: 'number',
        required: false,
        description: 'Controls randomness of output (0.0-1.0, default: 0.7)',
        defaultValue: 0.7
      },
      {
        name: 'maxTokens',
        type: 'integer',
        required: false,
        description: 'Maximum number of tokens to generate (default: 1024)',
        defaultValue: 1024
      }
    ],
    tokenCost: 1
  },
  
  // Chat history retrieval action
  gemini_get_chat_history: {
    name: 'gemini_get_chat_history',
    description: 'Retrieve the history of a Gemini chat session',
    parameters: [
      {
        name: 'sessionId',
        type: 'string',
        required: true,
        description: 'ID of the chat session'
      }
    ],
    tokenCost: 0.5
  },
  
  // Image-based content generation action
  gemini_generate_with_images: {
    name: 'gemini_generate_with_images',
    description: 'Generate content using text prompt and images with Gemini Vision',
    parameters: [
      {
        name: 'prompt',
        type: 'string',
        required: true,
        description: 'The text prompt to generate content from'
      },
      {
        name: 'imagePaths',
        type: 'array',
        required: true,
        description: 'Array of paths to image files'
      },
      {
        name: 'temperature',
        type: 'number',
        required: false,
        description: 'Controls randomness of output (0.0-1.0, default: 0.7)',
        defaultValue: 0.7
      },
      {
        name: 'maxTokens',
        type: 'integer',
        required: false,
        description: 'Maximum number of tokens to generate (default: 1024)',
        defaultValue: 1024
      }
    ],
    tokenCost: 2 // Higher cost due to image processing
  },
  
  // Embedding generation action
  gemini_generate_embedding: {
    name: 'gemini_generate_embedding',
    description: 'Generate vector embeddings for text using Gemini',
    parameters: [
      {
        name: 'text',
        type: 'string',
        required: true,
        description: 'Text to generate embeddings for'
      }
    ],
    tokenCost: 0.5
  }
};

export default geminiActionSchemas; 