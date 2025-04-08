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

// Load environment variables
dotenv.config();

// Default configuration
const DEFAULT_CONFIG = {
  apiKey: process.env.GEMINI_API_KEY,
  model: process.env.GEMINI_MODEL || 'gemini-pro',
  maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS || '8192', 10),
  temperature: parseFloat(process.env.GEMINI_TEMPERATURE || '0.7'),
  topP: parseFloat(process.env.GEMINI_TOP_P || '0.95'),
  topK: parseInt(process.env.GEMINI_TOP_K || '40', 10)
};

// Gemini client class
class GeminiClient {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    if (!this.config.apiKey) {
      throw new Error('Gemini API key is required. Set GEMINI_API_KEY environment variable or provide in config.');
    }
    
    this.genAI = new GoogleGenerativeAI(this.config.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: this.config.model });
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
        topK: options.topK || this.config.topK
      };
      
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig
      });
      
      const response = result.response;
      return {
        text: response.text(),
        candidates: response.candidates,
        promptFeedback: response.promptFeedback,
        usageMetadata: response.usageMetadata
      };
    } catch (error) {
      console.error('Error generating text with Gemini:', error);
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
      topK: options.topK || this.config.topK
    };
    
    const chat = this.model.startChat({
      history: options.history || [],
      generationConfig
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
  async sendChatMessage(chat, message, options = {}) {
    try {
      const result = await chat.sendMessage(message);
      const response = result.response;
      
      return {
        text: response.text(),
        candidates: response.candidates,
        promptFeedback: response.promptFeedback,
        usageMetadata: response.usageMetadata
      };
    } catch (error) {
      console.error('Error sending chat message to Gemini:', error);
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
      const visionModel = this.genAI.getGenerativeModel({ model: 'gemini-pro-vision' });
      
      const generationConfig = {
        maxOutputTokens: options.maxTokens || this.config.maxTokens,
        temperature: options.temperature || this.config.temperature,
        topP: options.topP || this.config.topP,
        topK: options.topK || this.config.topK
      };
      
      // Prepare image parts
      const imageParts = await Promise.all(imagePaths.map(async (imagePath) => {
        const imageData = await fs.readFile(imagePath);
        const mimeType = mime.lookup(path.extname(imagePath)) || 'application/octet-stream';
        
        return {
          inlineData: {
            data: Buffer.from(imageData).toString('base64'),
            mimeType
          }
        };
      }));
      
      // Combine text and images
      const parts = [
        { text: prompt },
        ...imageParts
      ];
      
      const result = await visionModel.generateContent({
        contents: [{ role: 'user', parts }],
        generationConfig
      });
      
      const response = result.response;
      return {
        text: response.text(),
        candidates: response.candidates,
        promptFeedback: response.promptFeedback,
        usageMetadata: response.usageMetadata
      };
    } catch (error) {
      console.error('Error generating content with images in Gemini:', error);
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
      const embeddingModel = this.genAI.getGenerativeModel({ model: 'embedding-001' });
      
      const result = await embeddingModel.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      console.error('Error generating embedding with Gemini:', error);
      throw error;
    }
  }
  
  /**
   * Check if API key is valid by making a simple API call
   * @returns {Promise<boolean>} - True if API key is valid
   */
  async validateApiKey() {
    try {
      await this.generateText('Test', { maxTokens: 5 });
      return true;
    } catch (error) {
      if (error.message && error.message.includes('API key')) {
        return false;
      }
      throw error;
    }
  }
}

// Create and export singleton instance
const geminiClient = new GeminiClient();

export default geminiClient;
export { GeminiClient }; 