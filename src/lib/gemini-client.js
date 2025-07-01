/**
 * Gemini API Client
 *
 * A wrapper around Google's Generative AI SDK for use with the Gemini model.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import mime from 'mime-types';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import config from '../config.js';
import logger from '../logger.js';

// Load environment variables
dotenv.config();

// Default configuration
const DEFAULT_CONFIG = {
  apiKey: process.env.GEMINI_API_KEY,
  model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS || '2048', 10),
  temperature: parseFloat(process.env.GEMINI_TEMPERATURE || '0.7'),
  topP: parseFloat(process.env.GEMINI_TOP_P || '0.9'),
  topK: parseInt(process.env.GEMINI_TOP_K || '40', 10),
  // Available models include:
  // GEMINI 2.x MODELS:
  // - gemini-2.0-flash (Faster model - RECOMMENDED)
  // - gemini-1.5-flash (Previous generation)
  // - gemini-1.5-pro (More powerful, handles complex tasks)
  // GEMINI 1.5 MODELS:
  // - gemini-1.5-pro (Standard 1.5 Pro model)
  // - gemini-1.5-flash (Faster 1.5 model)
  // - gemini-1.5-flash-8b (8B parameter version)
  // GEMMA MODELS:
  // - gemma-3-1b-it, gemma-3-4b-it, gemma-3-12b-it, gemma-3-27b-it
  // - gemma-2-2b-it, gemma-2-9b-it, gemma-2-27b-it
  // MULTIMEDIA MODELS:
  // - gemini-pro-vision (For images)
  // EMBEDDINGS MODEL:
  // - embedding-001 (For embeddings)
};

// Gemini client class
class GeminiClient {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (!this.config.apiKey) {
      throw new Error(
        'Gemini API key is required. Set GEMINI_API_KEY environment variable or provide in config.'
      );
    }

    this.genAI = new GoogleGenerativeAI(this.config.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: this.config.model });
    this.embeddingModel = this.genAI.getGenerativeModel({
      model: 'embedding-001',
    });
  }

  /**
   * Generate text from a prompt
   * @param {string} prompt - The text prompt
   * @param {object} options - Generation options
   * @returns {Promise<object>} - Generated content
   */
  async generateText(prompt, options = {}) {
    try {
      const generationConfig = {
        maxOutputTokens: options.maxTokens || this.config.maxTokens,
        temperature: options.temperature || this.config.temperature,
        topP: options.topP || this.config.topP,
        topK: options.topK || this.config.topK,
      };

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig,
      });

      const response = result.response;
      return {
        text: response.text(),
        candidates: response.candidates,
        promptFeedback: response.promptFeedback,
        usageMetadata: response.usageMetadata,
      };
    } catch (error) {
      logger.error('Error generating text with Gemini:', { error });
      throw error;
    }
  }

  /**
   * Create a new chat session
   * @param {object} options - Chat options
   * @returns {object} - Chat session
   */
  createChat(options = {}) {
    const generationConfig = {
      maxOutputTokens: options.maxTokens || this.config.maxTokens,
      temperature: options.temperature || this.config.temperature,
      topP: options.topP || this.config.topP,
      topK: options.topK || this.config.topK,
    };

    const chat = this.model.startChat({
      history: options.history || [],
      generationConfig,
    });

    return chat;
  }

  /**
   * Send a message in a chat session
   * @param {object} chat - Chat session
   * @param {string} message - Message to send
   * @param {object} options - Message options
   * @returns {Promise<object>} - Chat response
   */
  async sendChatMessage(chat, message, _options = {}) {
    try {
      const result = await chat.sendMessage(message);
      const response = result.response;

      return {
        text: response.text(),
        candidates: response.candidates,
        promptFeedback: response.promptFeedback,
        usageMetadata: response.usageMetadata,
      };
    } catch (error) {
      logger.error('Error sending chat message to Gemini:', { error });
      throw error;
    }
  }

  /**
   * Generate content with image inputs
   * @param {string} prompt - Text prompt
   * @param {Array<string>} imagePaths - Paths to image files
   * @param {object} options - Generation options
   * @returns {Promise<object>} - Generated content
   */
  async generateWithImages(prompt, imagePaths, options = {}) {
    try {
      // Switch to multimodal model if not already using it
      const visionModel = this.genAI.getGenerativeModel({
        model: 'gemini-2.0-flash-img-generation',
      });

      const generationConfig = {
        maxOutputTokens: options.maxTokens || this.config.maxTokens,
        temperature: options.temperature || this.config.temperature,
        topP: options.topP || this.config.topP,
        topK: options.topK || this.config.topK,
      };

      // Prepare image parts
      const imageParts = await Promise.all(
        imagePaths.map(async (imagePath) => {
          const imageData = await fs.readFile(imagePath);
          const mimeType =
            mime.lookup(path.extname(imagePath)) || 'application/octet-stream';

          return {
            inlineData: {
              data: Buffer.from(imageData).toString('base64'),
              mimeType,
            },
          };
        })
      );

      // Combine text and images
      const parts = [{ text: prompt }, ...imageParts];

      const result = await visionModel.generateContent({
        contents: [{ role: 'user', parts }],
        generationConfig,
      });

      const response = result.response;
      return {
        text: response.text(),
        candidates: response.candidates,
        promptFeedback: response.promptFeedback,
        usageMetadata: response.usageMetadata,
      };
    } catch (error) {
      logger.error('Error generating content with images in Gemini:', {
        error,
      });
      throw error;
    }
  }

  /**
   * Generate embeddings for text
   * @param {string} text - Text to embed
   * @returns {Promise<Array<number>>} - Embedding vector
   */
  async generateEmbedding(text) {
    try {
      // Use embedding model
      const result = await this.embeddingModel.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      logger.error('Error generating embedding with Gemini:', { error });
      throw error;
    }
  }

  /**
   * Get the embedding model as a tool for use in tool-calling scenarios.
   * This allows the embedding model to be used as a tool in Gemini's tool-calling API.
   * @returns {object} - Embedding tool definition
   */
  getEmbeddingTool() {
    // This is a pseudo-tool definition for demonstration.
    // In a real implementation, you may want to define a function declaration
    // that describes the embedding model's API for Gemini's tool-calling.
    return {
      functionDeclarations: [
        {
          name: 'generateEmbedding',
          description:
            'Generate an embedding vector for a given text input using the embedding-001 model.',
          parameters: {
            type: 'object',
            properties: {
              text: {
                type: 'string',
                description: 'The text to embed.',
              },
            },
            required: ['text'],
          },
        },
      ],
      // The actual function implementation can be mapped in your tool-calling handler.
    };
  }

  /**
   * Check if API key is valid by making a simple API call
   * @returns {Promise<boolean>} - True if API key is valid
   */
  async validateApiKey() {
    try {
      const validationModel = this.genAI.getGenerativeModel({
        model: 'gemini-2.5-pro-preview-03-25',
      });
      await validationModel.generateContent('Test', { maxOutputTokens: 5 });
      return true;
    } catch (error) {
      if (error.message && error.message.includes('API key')) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Generate JSON response from a prompt
   * @param {string} prompt - The text prompt requesting JSON
   * @param {object} options - Generation options
   * @returns {Promise<object>} - Parsed JSON object
   */
  async generateJson(prompt, options = {}) {
    try {
      // Use lower temperature for more deterministic JSON output
      const jsonOptions = {
        ...options,
        temperature: options.temperature || 0.2,
      };

      const result = await this.generateText(prompt, jsonOptions);
      const responseText = result.text.trim();

      // Try to extract JSON if there's additional text
      const jsonMatch = responseText.match(/(\{[\s\S]*\})/);
      const jsonText = jsonMatch ? jsonMatch[0] : responseText;

      try {
        return JSON.parse(jsonText);
      } catch (parseError) {
        logger.error('Error parsing JSON from Gemini response:', {
          error: parseError,
        });
        throw new Error('Failed to parse JSON from response: ' + responseText);
      }
    } catch (error) {
      logger.error('Error generating JSON with Gemini:', { error });
      throw error;
    }
  }

  /**
   * Generate content with streaming
   * @param {string} prompt - Text prompt
   * @param {object} options - Generation options
   * @returns {Promise<object>} - Stream object
   */
  async generateStream(prompt, options = {}) {
    try {
      const generationConfig = {
        maxOutputTokens: options.maxTokens || this.config.maxTokens,
        temperature: options.temperature || this.config.temperature,
        topP: options.topP || this.config.topP,
        topK: options.topK || this.config.topK,
      };

      const result = await this.model.generateContentStream({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig,
      });

      // Return a more convenient stream interface
      return {
        stream: result.stream,
        async text() {
          let fullText = '';
          for await (const chunk of result.stream) {
            fullText += chunk.text();
          }
          return fullText;
        },
      };
    } catch (error) {
      logger.error('Error generating streaming content with Gemini:', { error });
      throw error;
    }
  }
}

// Create and export singleton instance
const geminiClient = new GeminiClient();

export default geminiClient;
export { GeminiClient };

// Allow the embedding model as a tool in tool-calling scenarios
// This can be used in addition to functionDeclarations for workflows
function getEmbeddingTool() {
  return geminiClient.getEmbeddingTool();
}

if (!config.gemini.apiKey) {
  throw new Error('GEMINI_API_KEY is not set in the environment variables.');
}

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

/**
 * Uses Gemini with function calling to select the best function to execute for a given task.
 *
 * @param {string} taskDescription The natural language description of the task.
 * @param {Array<object>} workflowFunctions An array of function declarations for the available workflows.
 * @param {boolean} [includeEmbeddingTool=false] Whether to include the embedding model as a tool.
 * @returns {Promise<object|null>} The function call object from the model, or null if none was returned.
 */
async function getFunctionCall(
  taskDescription,
  workflowFunctions,
  includeEmbeddingTool = false
) {
  try {
    // Optionally include the embedding tool
    const tools = [{ functionDeclarations: workflowFunctions }];
    if (includeEmbeddingTool) {
      tools.push(getEmbeddingTool());
    }

    const model = genAI.getGenerativeModel({
      model: config.gemini.model,
      tools,
    });

    const chat = model.startChat();
    const result = await chat.sendMessage(taskDescription);
    const call = result.response.functionCalls?.()[0];

    if (call) {
      logger.info({ functionCall: call }, 'Gemini selected a function call.');
      return call;
    }

    logger.info('No function call was returned by Gemini.');
    return null;
  } catch (error) {
    logger.error({ error }, 'Error interacting with Gemini API');
    throw new Error('Failed to get function call from Gemini.');
  }
}

export { getFunctionCall, getEmbeddingTool };
