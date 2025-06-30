/**
 * Gemini Tool Implementation
 *
 * This module implements the Gemini API as a tool for the MCP server.
 */

import fetch from 'node-fetch';
import GEMINI_ACTIONS from '../schema/gemini-actions.js';
import dotenv from 'dotenv';
import logger from '../logger.js';

// Load environment variables
dotenv.config();

// Default configuration
const DEFAULT_CONFIG = {
  apiKey: process.env.GEMINI_API_KEY,
  serverUrl: `http://localhost:${process.env.GEMINI_SERVER_PORT || 3006}`,
  model: process.env.GEMINI_MODEL || 'gemini-1.5-pro-preview-0425',
};

// Chat sessions storage (in-memory for simplicity)
const chatSessions = new Map();

// Tool registry for tools that Gemini can use
const registeredTools = new Map();

/**
 * Initialize the Gemini tool
 * @returns {Promise<boolean>} - True if initialization is successful
 */
async function initializeTool() {
  try {
    // Check server health
    const healthResponse = await fetch(`${DEFAULT_CONFIG.serverUrl}/health`);

    if (!healthResponse.ok) {
      logger.error('Gemini server health check failed');
      return false;
    }

    // Initialize API
    const initResponse = await fetch(
      `${DEFAULT_CONFIG.serverUrl}/api/initialize`
    );
    const initData = await initResponse.json();

    if (initData.status !== 'success') {
      logger.error('Gemini API initialization failed:', {
        message: initData.message,
      });
      return false;
    }

    logger.info('Gemini tool initialized successfully with model:', {
      model: initData.model,
    });
    return true;
  } catch (error) {
    logger.error('Failed to initialize Gemini tool:', { error });
    return false;
  }
}

/**
 * Generate text using Gemini
 * @param {object} params - Generation parameters
 * @returns {Promise<object>} - Generation result
 */
async function generateText(params) {
  validateParams(params, ['prompt']);

  try {
    const response = await fetch(`${DEFAULT_CONFIG.serverUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: params.prompt,
        options: {
          temperature: params.temperature,
          maxTokens: params.maxTokens,
          topP: params.topP,
          topK: params.topK,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Generation failed with status: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      result: data.result,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Create a chat session
 * @param {object} params - Session parameters
 * @returns {Promise<object>} - Session information
 */
async function createChatSession(params = {}) {
  try {
    const response = await fetch(
      `${DEFAULT_CONFIG.serverUrl}/api/chat/session`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ options: params }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to create chat session: ${response.status}`);
    }

    const data = await response.json();

    // Store session ID
    const sessionId = data.sessionId;
    chatSessions.set(sessionId, {
      createdAt: new Date(),
      history: [],
    });

    return {
      success: true,
      sessionId,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Send a message in a chat session
 * @param {object} params - Message parameters
 * @returns {Promise<object>} - Response result
 */
async function sendChatMessage(params) {
  validateParams(params, ['sessionId', 'message']);

  try {
    const { sessionId, message, options = {} } = params;

    // Check if session exists
    if (!chatSessions.has(sessionId)) {
      throw new Error(`Chat session ${sessionId} not found`);
    }

    const response = await fetch(
      `${DEFAULT_CONFIG.serverUrl}/api/chat/message`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message, options }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.status}`);
    }

    const data = await response.json();

    // Update session history
    const session = chatSessions.get(sessionId);
    session.history.push({
      role: 'user',
      content: message,
    });
    session.history.push({
      role: 'model',
      content: data.result.text,
    });

    return {
      success: true,
      result: data.result,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get chat session history
 * @param {object} params - Parameters with sessionId
 * @returns {Promise<object>} - Chat history
 */
async function getChatHistory(params) {
  validateParams(params, ['sessionId']);

  try {
    const { sessionId } = params;

    // Check if session exists
    if (!chatSessions.has(sessionId)) {
      throw new Error(`Chat session ${sessionId} not found`);
    }

    const session = chatSessions.get(sessionId);

    return {
      success: true,
      history: session.history,
      createdAt: session.createdAt,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Generate content with images
 * @param {object} params - Generation parameters
 * @returns {Promise<object>} - Generation result
 */
async function generateWithImages(params) {
  validateParams(params, ['prompt', 'imagePaths']);

  try {
    const response = await fetch(
      `${DEFAULT_CONFIG.serverUrl}/api/generate-with-images`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      }
    );

    if (!response.ok) {
      throw new Error(`Generation with images failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      result: data.result,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Generate embeddings for text
 * @param {object} params - Embedding parameters
 * @returns {Promise<object>} - Embedding result
 */
async function generateEmbedding(params) {
  validateParams(params, ['text']);

  try {
    const response = await fetch(`${DEFAULT_CONFIG.serverUrl}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Embedding generation failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      embedding: data.embedding,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Register a tool for Gemini to use
 * @param {object} params - Tool registration parameters
 * @returns {Promise<object>} - Registration result
 */
async function registerTool(params) {
  validateParams(params, ['toolId', 'toolInfo']);

  try {
    const { toolId, toolInfo } = params;

    // Register tool with Gemini server
    const response = await fetch(
      `${DEFAULT_CONFIG.serverUrl}/api/register-tool`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolId, toolInfo }),
      }
    );

    if (!response.ok) {
      throw new Error(`Tool registration failed: ${response.status}`);
    }

    // Store locally as well
    registeredTools.set(toolId, toolInfo);

    const data = await response.json();
    return {
      success: true,
      message: data.message,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Generate text with the ability to call tools
 * @param {object} params - Generation parameters
 * @returns {Promise<object>} - Generation result with tool calls
 */
async function generateWithTools(params) {
  validateParams(params, ['prompt']);

  try {
    const { prompt, tools = [], options = {} } = params;

    // Verify all tools are registered
    for (const toolId of tools) {
      if (!registeredTools.has(toolId)) {
        throw new Error(`Tool ${toolId} is not registered`);
      }
    }

    const response = await fetch(
      `${DEFAULT_CONFIG.serverUrl}/api/generate-with-tools`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, tools, options }),
      }
    );

    if (!response.ok) {
      throw new Error(`Generation with tools failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      result: data.result,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Validate required parameters
 * @param {object} params - Parameter object
 * @param {string[]} required - Required parameter names
 * @throws {Error} - If required parameter is missing
 */
function validateParams(params, required) {
  for (const param of required) {
    if (params[param] === undefined) {
      throw new Error(`Missing required parameter: ${param}`);
    }
  }
}

// Define the Gemini tool interface
const geminiTool = {
  id: 'gemini',
  name: 'Gemini AI',
  description:
    "Google's Gemini AI model for text generation, chat, and embeddings",
  category: 'ai',
  capabilities: {
    textGeneration: true,
    chat: true,
    multimodal: true,
    embeddings: true,
    toolCalling: true,
    version: '1.0.0',
  },
  securityPolicy: {
    allowedContextTypes: ['text', 'image'],
    maxTokensPerRequest: 8192,
    rateLimits: {
      requests: 100,
      timeWindow: 60 * 1000, // 1 minute
    },
    auditLogging: true,
  },
  actions: GEMINI_ACTIONS,
  handlers: {
    initializeTool,
    generateText,
    createChatSession,
    sendChatMessage,
    getChatHistory,
    generateWithImages,
    generateEmbedding,
    registerTool,
    generateWithTools,
  },
};

export default geminiTool;
