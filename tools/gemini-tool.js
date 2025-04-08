/**
 * Gemini Tool
 * 
 * Tool for interacting with Google's Gemini API for text generation and chat functionality.
 */

import geminiClient from '../lib/gemini-client.js';
import logger from '../logger.js';

// Cache for chat sessions
const chatSessions = new Map();

// Clean up old chat sessions periodically (every hour)
setInterval(() => {
  const now = Date.now();
  const MAX_AGE_MS = 3600000; // 1 hour
  
  for (const [sessionId, session] of chatSessions.entries()) {
    if (now - session.lastUsed > MAX_AGE_MS) {
      chatSessions.delete(sessionId);
      logger.debug(`Cleaned up inactive chat session: ${sessionId}`);
    }
  }
}, 3600000);

/**
 * Initialize the Gemini tool
 * Validates the API key and configuration
 */
export async function initializeTool() {
  try {
    const isValid = await geminiClient.validateApiKey();
    if (!isValid) {
      logger.error('Invalid Gemini API key or configuration');
      return false;
    }
    
    logger.info('Gemini tool initialized successfully');
    return true;
  } catch (error) {
    logger.error('Failed to initialize Gemini tool:', error);
    return false;
  }
}

/**
 * Generate text with Gemini
 * @param {object} params - Parameters for text generation
 * @returns {Promise<object>} - Generated content
 */
export async function generateText(params) {
  try {
    const { prompt, options = {} } = params;
    
    if (!prompt) {
      throw new Error('Prompt is required for text generation');
    }
    
    const result = await geminiClient.generateText(prompt, options);
    
    // Log usage for analytics
    logger.debug(`Gemini text generation: ${prompt.substring(0, 50)}... (${result.text.length} chars)`);
    
    return {
      success: true,
      result
    };
  } catch (error) {
    logger.error('Error generating text with Gemini:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate text'
    };
  }
}

/**
 * Create a new chat session
 * @param {object} params - Parameters for chat creation
 * @returns {Promise<object>} - Chat session info
 */
export async function createChatSession(params) {
  try {
    const { options = {} } = params;
    const sessionId = generateSessionId();
    
    const chat = geminiClient.createChat(options);
    
    chatSessions.set(sessionId, {
      chat,
      options,
      created: Date.now(),
      lastUsed: Date.now(),
      messages: []
    });
    
    logger.debug(`Created new Gemini chat session: ${sessionId}`);
    
    return {
      success: true,
      sessionId
    };
  } catch (error) {
    logger.error('Error creating Gemini chat session:', error);
    return {
      success: false,
      error: error.message || 'Failed to create chat session'
    };
  }
}

/**
 * Send a message in a chat session
 * @param {object} params - Parameters for sending a message
 * @returns {Promise<object>} - Chat response
 */
export async function sendChatMessage(params) {
  try {
    const { sessionId, message, options = {} } = params;
    
    if (!sessionId) {
      throw new Error('Session ID is required for chat');
    }
    
    if (!message) {
      throw new Error('Message is required for chat');
    }
    
    const session = chatSessions.get(sessionId);
    if (!session) {
      throw new Error(`Chat session not found: ${sessionId}`);
    }
    
    // Update last used timestamp
    session.lastUsed = Date.now();
    
    // Add message to history
    session.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    });
    
    // Send message
    const result = await geminiClient.sendChatMessage(session.chat, message, options);
    
    // Add response to history
    session.messages.push({
      role: 'model',
      content: result.text,
      timestamp: new Date().toISOString()
    });
    
    logger.debug(`Gemini chat message in session ${sessionId}: ${message.substring(0, 50)}...`);
    
    return {
      success: true,
      result,
      history: session.messages
    };
  } catch (error) {
    logger.error('Error sending Gemini chat message:', error);
    return {
      success: false,
      error: error.message || 'Failed to send chat message'
    };
  }
}

/**
 * Get chat history
 * @param {object} params - Parameters for retrieving chat history
 * @returns {Promise<object>} - Chat history
 */
export async function getChatHistory(params) {
  try {
    const { sessionId } = params;
    
    if (!sessionId) {
      throw new Error('Session ID is required');
    }
    
    const session = chatSessions.get(sessionId);
    if (!session) {
      throw new Error(`Chat session not found: ${sessionId}`);
    }
    
    // Update last used timestamp
    session.lastUsed = Date.now();
    
    return {
      success: true,
      history: session.messages,
      created: session.created
    };
  } catch (error) {
    logger.error('Error retrieving Gemini chat history:', error);
    return {
      success: false,
      error: error.message || 'Failed to retrieve chat history'
    };
  }
}

/**
 * Generate content with images
 * @param {object} params - Parameters for generating content with images
 * @returns {Promise<object>} - Generated content
 */
export async function generateWithImages(params) {
  try {
    const { prompt, imagePaths, options = {} } = params;
    
    if (!prompt) {
      throw new Error('Prompt is required for image content generation');
    }
    
    if (!imagePaths || !Array.isArray(imagePaths) || imagePaths.length === 0) {
      throw new Error('At least one image path is required');
    }
    
    const result = await geminiClient.generateWithImages(prompt, imagePaths, options);
    
    logger.debug(`Gemini image content generation: ${prompt.substring(0, 50)}... with ${imagePaths.length} images`);
    
    return {
      success: true,
      result
    };
  } catch (error) {
    logger.error('Error generating content with images in Gemini:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate content with images'
    };
  }
}

/**
 * Generate embeddings for text
 * @param {object} params - Parameters for generating embeddings
 * @returns {Promise<object>} - Embedding vector
 */
export async function generateEmbedding(params) {
  try {
    const { text } = params;
    
    if (!text) {
      throw new Error('Text is required for embedding generation');
    }
    
    const embedding = await geminiClient.generateEmbedding(text);
    
    logger.debug(`Gemini embedding generation: ${text.substring(0, 50)}...`);
    
    return {
      success: true,
      embedding
    };
  } catch (error) {
    logger.error('Error generating embedding with Gemini:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate embedding'
    };
  }
}

/**
 * Generate a unique session ID
 * @returns {string} - Unique session ID
 */
function generateSessionId() {
  return 'gemini-' + Math.random().toString(36).substring(2, 15) + 
    Math.random().toString(36).substring(2, 15);
}

// Export all functions
export default {
  initializeTool,
  generateText,
  createChatSession,
  sendChatMessage,
  getChatHistory,
  generateWithImages,
  generateEmbedding
}; 