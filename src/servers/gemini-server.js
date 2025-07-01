/**
 * Gemini Server Implementation
 *
 * This server provides an HTTP interface to the Gemini API,
 * allowing it to be used as a tool and to call other tools.
 */

import express from 'express';
import cors from 'cors';
import bodyParser from 'json-body-parser';
import geminiClient, { GeminiClient } from '../lib/gemini-client.js';
import { executeToolProxy } from '../tool-proxy.js';
import dotenv from 'dotenv';
import logger from '../logger.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.GEMINI_SERVER_PORT || 3006;

// Tool registry for tools that Gemini can call
const availableTools = new Map();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'gemini-server' });
});

// Initialize and validate configuration
app.get('/api/initialize', async (req, res) => {
  try {
    const isValid = await geminiClient.validateApiKey();
    if (!isValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid API key',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Gemini API initialized successfully',
      model: geminiClient.config.model,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: `Initialization failed: ${error.message}`,
    });
  }
});

// Register a tool for Gemini to use
app.post('/api/register-tool', (req, res) => {
  const { toolId, toolInfo } = req.body;

  if (!toolId || !toolInfo) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing toolId or toolInfo',
    });
  }

  availableTools.set(toolId, toolInfo);

  res.status(200).json({
    status: 'success',
    message: `Tool ${toolId} registered successfully`,
    availableToolsCount: availableTools.size,
  });
});

// Generate text
app.post('/api/generate', async (req, res) => {
  const { prompt, options = {} } = req.body;

  if (!prompt) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing prompt',
    });
  }

  try {
    const result = await geminiClient.generateText(prompt, options);
    res.status(200).json({
      status: 'success',
      result,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: `Text generation failed: ${error.message}`,
    });
  }
});

// Create a chat session
app.post('/api/chat/session', (req, res) => {
  const { options = {} } = req.body;

  try {
    // Generate a unique session ID
    const sessionId = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    // Store chat instance in memory (in production, use Redis or another store)
    const chat = geminiClient.createChat(options);

    // For simplicity, we're storing the chat instance directly
    // In production, you would store this in a proper session store
    app.locals[sessionId] = chat;

    res.status(200).json({
      status: 'success',
      sessionId,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: `Failed to create chat session: ${error.message}`,
    });
  }
});

// Send a message in a chat session
app.post('/api/chat/message', async (req, res) => {
  const { sessionId, message, options = {} } = req.body;

  if (!sessionId || !message) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing sessionId or message',
    });
  }

  const chat = app.locals[sessionId];

  if (!chat) {
    return res.status(404).json({
      status: 'error',
      message: 'Chat session not found',
    });
  }

  try {
    const result = await geminiClient.sendChatMessage(chat, message, options);
    res.status(200).json({
      status: 'success',
      result,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: `Failed to send message: ${error.message}`,
    });
  }
});

// Generate with tools - allows Gemini to call other tools
app.post('/api/generate-with-tools', async (req, res) => {
  const { prompt, tools = [], options = {} } = req.body;

  if (!prompt) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing prompt',
    });
  }

  try {
    // Create a specific instance for tool calls
    const toolClient = new GeminiClient({
      ...geminiClient.config,
      tools: tools.map((toolId) => {
        const toolInfo = availableTools.get(toolId);
        if (!toolInfo) {
          throw new Error(`Tool ${toolId} not registered`);
        }
        return toolInfo;
      }),
    });

    // Create generation config with tool support
    const generationConfig = {
      maxOutputTokens: options.maxTokens || toolClient.config.maxTokens,
      temperature: options.temperature || toolClient.config.temperature,
      topP: options.topP || toolClient.config.topP,
      topK: options.topK || toolClient.config.topK,
    };

    const result = await toolClient.model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig,
      tools: tools.map((toolId) => {
        const toolInfo = availableTools.get(toolId);
        return {
          functionDeclarations: toolInfo.functions,
        };
      }),
    });

    const response = result.response;

    // Process any tool calls in the response
    if (
      response.candidates &&
      response.candidates[0].content.parts[0].functionCall
    ) {
      const functionCall = response.candidates[0].content.parts[0].functionCall;
      const { name, args } = functionCall;

      // Execute the tool through the proxy
      const toolResult = await executeToolProxy(name, JSON.parse(args));

      // Continue the conversation with the tool result
      const followUpResult = await toolClient.model.generateContent({
        contents: [
          { role: 'user', parts: [{ text: prompt }] },
          {
            role: 'model',
            parts: [{ functionCall }],
          },
          {
            role: 'function',
            parts: [
              {
                functionResponse: {
                  name: name,
                  response: { result: JSON.stringify(toolResult) },
                },
              },
            ],
          },
        ],
        generationConfig,
      });

      res.status(200).json({
        status: 'success',
        result: {
          text: followUpResult.response.text(),
          toolCalls: [
            {
              tool: name,
              args: JSON.parse(args),
              result: toolResult,
            },
          ],
          candidates: followUpResult.response.candidates,
          promptFeedback: followUpResult.response.promptFeedback,
          usageMetadata: followUpResult.response.usageMetadata,
        },
      });
    } else {
      // No tool calls, return the normal response
      res.status(200).json({
        status: 'success',
        result: {
          text: response.text(),
          candidates: response.candidates,
          promptFeedback: response.promptFeedback,
          usageMetadata: response.usageMetadata,
        },
      });
    }
  } catch (error) {
    logger.error('Error in generate-with-tools:', { error });
    res.status(500).json({
      status: 'error',
      message: `Generation with tools failed: ${error.message}`,
    });
  }
});

// Generate embeddings
app.post('/api/embed', async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing text',
    });
  }

  try {
    const embedding = await geminiClient.generateEmbedding(text);
    res.status(200).json({
      status: 'success',
      embedding,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: `Embedding generation failed: ${error.message}`,
    });
  }
});

// Start the server
const server = app.listen(PORT, () => {
  logger.info(`Gemini server running on port ${PORT}`);
});

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
  });
});

export default server;
