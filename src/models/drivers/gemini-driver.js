import { GoogleGenerativeAI } from '@google/generative-ai';
import ModelDriver from '../ModelDriver.js';
import tokenManager from '../../lib/token-manager.js';
import { logger } from '../../logger.js';

/**
 * Helper function to safely get environment variables with proper error handling
 * Based on best practices from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling
 */
function getRequiredEnvVar(key, description = '') {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    const message = description 
      ? `Configuration error: '${key}' is required - ${description}`
      : `Configuration error: '${key}' is required`;
    throw new Error(message);
  }
  return value.trim();
}

function getOptionalEnvVar(key, defaultValue = null) {
  const value = process.env[key];
  return value && value.trim() !== '' ? value.trim() : defaultValue;
}

/**
 * Enhanced Gemini Driver with MCP and A2A Protocol Compliance
 * Integrates with TokenManager for secure token handling and automatic refresh
 */
export default class GeminiDriver extends ModelDriver {
  constructor () {
    super();
    this.name = process.env.GEMINI_MODEL || 'gemini-2.5-pro';
    this.tokenData = null;
    this.genAI = null;
    this.model = null;
    this.initialized = false;
    
    // Register for token refresh events
    tokenManager.onTokenRefresh('gemini_primary', this.handleTokenRefresh.bind(this));
  }

  /**
   * Initialize the driver with MCP/A2A compliant token
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // Get or generate MCP/A2A compliant token
      this.tokenData = await tokenManager.getCurrentGeminiToken();
      
      // Initialize Google AI with the token
      this.genAI = new GoogleGenerativeAI(this.tokenData.apiKey);
      this.model = this.genAI.getGenerativeModel({ 
        model: this.name,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        }
      });

      this.initialized = true;
      
      logger.info('Gemini driver initialized with MCP/A2A compliant token', {
        model: this.name,
        mcp_compliant: this.tokenData.mcp_compliant,
        a2a_compliant: this.tokenData.a2a_compliant,
        expires_at: this.tokenData.expires_at
      });

    } catch (error) {
      logger.error('Failed to initialize Gemini driver:', error);
      throw new Error(`Gemini driver initialization failed: ${error.message}`);
    }
  }

  /**
   * Handle token refresh events
   */
  async handleTokenRefresh(newTokenData) {
    logger.info('Refreshing Gemini driver with new token');
    
    this.tokenData = newTokenData;
    this.genAI = new GoogleGenerativeAI(newTokenData.apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: this.name,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    });

    logger.info('Gemini driver refreshed successfully');
  }

  /**
   * Ensure driver is initialized before operations
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }

    // Check if token is still valid
    if (!tokenManager.isTokenValid(this.tokenData)) {
      logger.warn('Token expired, refreshing...');
      await tokenManager.refreshGeminiToken();
    }
  }

  async validate () {
    try {
      await this.ensureInitialized();
      
      // Validate MCP and A2A compliance
      tokenManager.validateMCPCompliance(this.tokenData);
      tokenManager.validateA2ACompliance(this.tokenData);
      
      // Lightweight health-check: generate a simple response
      const testResult = await this.generate({ prompt: 'Hello', maxTokens: 10 });
      
      if (!testResult || !testResult.text) {
        throw new Error('Validation failed: No response from Gemini API');
      }
      
      logger.info('Gemini driver validation successful', {
        model: this.name,
        token_valid: tokenManager.isTokenValid(this.tokenData),
        mcp_compliant: this.tokenData.mcp_compliant,
        a2a_compliant: this.tokenData.a2a_compliant
      });
      
      return true;
    } catch (err) {
      logger.error('Gemini validation failed:', err);
      throw new Error(`Gemini validation failed: ${err.message}`);
    }
  }

  async generate ({ prompt, temperature = 0.7, maxTokens = 1024, model, ...rest }) {
    try {
      await this.ensureInitialized();
      
      // Use specified model or default
      const targetModel = model || this.name;
      
      // Switch model if different from current
      if (targetModel !== this.name) {
        this.model = this.genAI.getGenerativeModel({ 
          model: targetModel,
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
            ...rest
          }
        });
      }

      logger.info(`generateText via ${targetModel}`);

      const result = await this.model.generateContent({ 
        contents: [{ role: 'user', parts: [{ text: prompt }] }], 
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
          ...rest
        }
      });
      
      const text = result.response.text();
      
      // Log usage for compliance tracking
      logger.debug('Gemini generation completed', {
        model: targetModel,
        prompt_length: prompt.length,
        response_length: text.length,
        temperature,
        maxTokens,
        mcp_compliant: true,
        a2a_compliant: true
      });
      
      return { text };
    } catch (error) {
      logger.error('Gemini generation failed:', error);
      
      // Check if error is due to token issues
      if (error.message.includes('API key') || error.message.includes('authentication')) {
        logger.warn('Token authentication failed, attempting refresh...');
        try {
          await tokenManager.refreshGeminiToken();
          // Retry the request once with new token
          return await this.generate({ prompt, temperature, maxTokens, model, ...rest });
        } catch (refreshError) {
          logger.error('Token refresh failed:', refreshError);
          throw new Error(`Gemini generation failed after token refresh: ${refreshError.message}`);
        }
      }
      
      throw new Error(`Gemini generation failed: ${error.message}`);
    }
  }

  async *stream ({ prompt, temperature = 0.7, model, ...rest }) {
    try {
      await this.ensureInitialized();
      
      // Use specified model or default
      const targetModel = model || this.name;
      
      // Switch model if different from current
      if (targetModel !== this.name) {
        this.model = this.genAI.getGenerativeModel({ 
          model: targetModel,
          generationConfig: {
            temperature,
            ...rest
          }
        });
      }

      logger.info(`streamText via ${targetModel}`);

      const stream = await this.model.generateContentStream({ 
        contents: [{ role: 'user', parts: [{ text: prompt }] }], 
        generationConfig: {
          temperature,
          ...rest
        }
      });
      
      for await (const chunk of stream.stream) {
        if (chunk.text()) {
          yield { text: chunk.text() };
        }
      }
      
      logger.debug('Gemini streaming completed', {
        model: targetModel,
        prompt_length: prompt.length,
        temperature,
        mcp_compliant: true,
        a2a_compliant: true
      });
      
    } catch (error) {
      logger.error('Gemini streaming failed:', error);
      
      // Check if error is due to token issues
      if (error.message.includes('API key') || error.message.includes('authentication')) {
        logger.warn('Token authentication failed during streaming, attempting refresh...');
        try {
          await tokenManager.refreshGeminiToken();
          // Retry the request once with new token
          yield* this.stream({ prompt, temperature, model, ...rest });
          return;
        } catch (refreshError) {
          logger.error('Token refresh failed during streaming:', refreshError);
          throw new Error(`Gemini streaming failed after token refresh: ${refreshError.message}`);
        }
      }
      
      throw new Error(`Gemini streaming failed: ${error.message}`);
    }
  }

  async embedding ({ text, model }) {
    try {
      await this.ensureInitialized();
      
      // Use text-embedding model for embeddings
      const embeddingModel = model || 'text-embedding-004';
      const embedModel = this.genAI.getGenerativeModel({ model: embeddingModel });
      
      logger.info(`embedding via ${embeddingModel}`);

      const result = await embedModel.embedContent(text);
      
      logger.debug('Gemini embedding completed', {
        model: embeddingModel,
        text_length: text.length,
        vector_length: result.embedding.values.length,
        mcp_compliant: true,
        a2a_compliant: true
      });
      
      return result.embedding.values; // Return the embedding vector
    } catch (error) {
      logger.error('Gemini embedding failed:', error);
      
      // Check if error is due to token issues
      if (error.message.includes('API key') || error.message.includes('authentication')) {
        logger.warn('Token authentication failed during embedding, attempting refresh...');
        try {
          await tokenManager.refreshGeminiToken();
          // Retry the request once with new token
          return await this.embedding({ text, model });
        } catch (refreshError) {
          logger.error('Token refresh failed during embedding:', refreshError);
          throw new Error(`Gemini embedding failed after token refresh: ${refreshError.message}`);
        }
      }
      
      throw new Error(`Gemini embedding failed: ${error.message}`);
    }
  }

  /**
   * Get token information for debugging/monitoring
   */
  getTokenInfo() {
    if (!this.tokenData) {
      return { status: 'not_initialized' };
    }

    return {
      status: 'initialized',
      type: this.tokenData.type,
      created_at: this.tokenData.created_at,
      expires_at: this.tokenData.expires_at,
      mcp_compliant: this.tokenData.mcp_compliant,
      a2a_compliant: this.tokenData.a2a_compliant,
      scopes: this.tokenData.scopes,
      capabilities: this.tokenData.capabilities,
      valid: tokenManager.isTokenValid(this.tokenData)
    };
  }

  /**
   * Force token refresh
   */
  async forceTokenRefresh() {
    logger.info('Forcing Gemini token refresh');
    return await tokenManager.refreshGeminiToken();
  }
} 