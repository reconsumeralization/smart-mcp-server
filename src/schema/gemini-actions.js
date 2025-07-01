/**
 * Gemini Tool Actions Schema
 *
 * Defines the JSON schema for Gemini model API actions,
 * including tool usage capabilities.
 */

export const GEMINI_ACTIONS = {
  // Basic text generation
  gemini_generate_text: {
    name: 'gemini_generate_text',
    description: 'Generate text content using the Gemini model',
    parameters: {
      type: 'object',
      required: ['prompt'],
      properties: {
        prompt: {
          type: 'string',
          description: 'The text prompt to send to Gemini',
        },
        temperature: {
          type: 'number',
          description:
            'Controls randomness: lowering results in less random completions (0-1)',
          default: 0.7,
        },
        maxTokens: {
          type: 'integer',
          description: 'The maximum number of tokens to generate',
          default: 8192,
        },
        topP: {
          type: 'number',
          description: 'Controls diversity via nucleus sampling',
          default: 0.95,
        },
        topK: {
          type: 'integer',
          description: 'Controls diversity via top-k sampling',
          default: 40,
        },
      },
    },
  },

  // Chat sessions
  gemini_create_chat: {
    name: 'gemini_create_chat',
    description: 'Create a new chat session with Gemini',
    parameters: {
      type: 'object',
      properties: {
        history: {
          type: 'array',
          description: 'Optional initial conversation history',
          items: {
            type: 'object',
            properties: {
              role: {
                type: 'string',
                enum: ['user', 'model'],
              },
              parts: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    text: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
        },
        temperature: {
          type: 'number',
          description: 'Controls randomness for this chat session',
        },
        maxTokens: {
          type: 'integer',
          description: 'Maximum tokens for each response in this chat',
        },
      },
    },
  },

  // Send message to chat session
  gemini_chat_message: {
    name: 'gemini_chat_message',
    description: 'Send a message in an existing chat session',
    parameters: {
      type: 'object',
      required: ['sessionId', 'message'],
      properties: {
        sessionId: {
          type: 'string',
          description: 'The ID of the chat session',
        },
        message: {
          type: 'string',
          description: 'The message to send',
        },
      },
    },
  },

  // Generate text with tool calling capabilities
  gemini_generate_with_tools: {
    name: 'gemini_generate_with_tools',
    description:
      'Generate text using Gemini with the ability to call other tools',
    parameters: {
      type: 'object',
      required: ['prompt'],
      properties: {
        prompt: {
          type: 'string',
          description: 'The text prompt to send to Gemini',
        },
        tools: {
          type: 'array',
          description: 'List of tool IDs that Gemini can use',
          items: {
            type: 'string',
          },
        },
        temperature: {
          type: 'number',
          description:
            'Controls randomness: lowering results in less random completions (0-1)',
          default: 0.7,
        },
        maxTokens: {
          type: 'integer',
          description: 'The maximum number of tokens to generate',
          default: 8192,
        },
      },
    },
  },

  // Generate multimodal content
  gemini_generate_with_images: {
    name: 'gemini_generate_with_images',
    description: 'Generate content using both text and images with Gemini',
    parameters: {
      type: 'object',
      required: ['prompt', 'imagePaths'],
      properties: {
        prompt: {
          type: 'string',
          description: 'The text prompt to send to Gemini',
        },
        imagePaths: {
          type: 'array',
          description: 'Paths to image files',
          items: {
            type: 'string',
          },
        },
        temperature: {
          type: 'number',
          description:
            'Controls randomness: lowering results in less random completions (0-1)',
        },
        maxTokens: {
          type: 'integer',
          description: 'The maximum number of tokens to generate',
        },
      },
    },
  },

  // Generate embeddings
  gemini_generate_embedding: {
    name: 'gemini_generate_embedding',
    description: 'Generate vector embeddings for a text input',
    parameters: {
      type: 'object',
      required: ['text'],
      properties: {
        text: {
          type: 'string',
          description: 'The text to convert to embeddings',
        },
      },
    },
  },

  // Register a tool for Gemini to use
  gemini_register_tool: {
    name: 'gemini_register_tool',
    description: 'Register a tool that Gemini can call',
    parameters: {
      type: 'object',
      required: ['toolId', 'toolInfo'],
      properties: {
        toolId: {
          type: 'string',
          description: 'Unique identifier for the tool',
        },
        toolInfo: {
          type: 'object',
          description: 'Tool specification including functions schema',
          properties: {
            name: {
              type: 'string',
              description: 'Human-readable name for the tool',
            },
            description: {
              type: 'string',
              description: 'Description of what the tool does',
            },
            functions: {
              type: 'array',
              description: 'Function declarations for the tool',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                  },
                  description: {
                    type: 'string',
                  },
                  parameters: {
                    type: 'object',
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

export const GEMINI_TOOL_CATEGORIES = {
  GENERATION: ['gemini_generate_text', 'gemini_generate_with_tools'],
  CHAT: ['gemini_create_chat', 'gemini_chat_message'],
  MULTIMODAL: ['gemini_generate_with_images'],
  EMBEDDINGS: ['gemini_generate_embedding'],
  TOOL_INTEGRATION: ['gemini_register_tool'],
};

export default GEMINI_ACTIONS;
