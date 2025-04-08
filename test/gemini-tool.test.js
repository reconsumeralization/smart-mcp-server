/**
 * Gemini Tool Tests
 * 
 * Unit tests for the Gemini integration.
 */

import { describe, it, before, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import geminiTool from '../tools/gemini-tool.js';
import geminiClient from '../lib/gemini-client.js';

// Mock the gemini client
mock.method(geminiClient, 'validateApiKey', () => Promise.resolve(true));
mock.method(geminiClient, 'generateText', (prompt, options) => {
  return Promise.resolve({
    text: `Generated text for prompt: ${prompt}`,
    candidates: [{ content: { parts: [{ text: `Generated text for prompt: ${prompt}` }] } }],
    promptFeedback: { blockReason: null },
    usageMetadata: { promptTokenCount: prompt.length / 4, candidatesTokenCount: 20 }
  });
});
mock.method(geminiClient, 'createChat', (options) => {
  return {
    sendMessage: (message) => Promise.resolve({
      response: {
        text: () => `Response to: ${message}`,
        candidates: [{ content: { parts: [{ text: `Response to: ${message}` }] } }],
        promptFeedback: { blockReason: null },
        usageMetadata: { promptTokenCount: message.length / 4, candidatesTokenCount: 15 }
      }
    })
  };
});
mock.method(geminiClient, 'generateEmbedding', (text) => {
  return Promise.resolve(Array(128).fill(0).map((_, i) => i / 128));
});

describe('Gemini Tool', () => {
  before(async () => {
    // Initialize the tool
    await geminiTool.initializeTool();
  });
  
  describe('initialization', () => {
    it('should initialize successfully with valid API key', async () => {
      const result = await geminiTool.initializeTool();
      assert.strictEqual(result, true);
    });
  });
  
  describe('generateText', () => {
    it('should generate text from a prompt', async () => {
      const result = await geminiTool.generateText({
        prompt: 'Test prompt',
        options: { temperature: 0.5 }
      });
      
      assert.strictEqual(result.success, true);
      assert.ok(result.result.text.includes('Test prompt'));
    });
    
    it('should fail with empty prompt', async () => {
      const result = await geminiTool.generateText({
        prompt: '',
        options: {}
      });
      
      assert.strictEqual(result.success, false);
      assert.ok(result.error.includes('required'));
    });
  });
  
  describe('chat functionality', () => {
    let sessionId;
    
    it('should create a chat session', async () => {
      const result = await geminiTool.createChatSession({
        options: { temperature: 0.7 }
      });
      
      assert.strictEqual(result.success, true);
      assert.ok(result.sessionId);
      sessionId = result.sessionId;
    });
    
    it('should send a message in a chat session', async () => {
      const result = await geminiTool.sendChatMessage({
        sessionId,
        message: 'Hello, Gemini!',
        options: {}
      });
      
      assert.strictEqual(result.success, true);
      assert.ok(result.result.text.includes('Hello, Gemini!'));
      assert.strictEqual(result.history.length, 2); // User message + response
    });
    
    it('should get chat history', async () => {
      const result = await geminiTool.getChatHistory({
        sessionId
      });
      
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.history.length, 2);
      assert.strictEqual(result.history[0].role, 'user');
      assert.strictEqual(result.history[1].role, 'model');
    });
    
    it('should fail with invalid session ID', async () => {
      const result = await geminiTool.sendChatMessage({
        sessionId: 'invalid-session-id',
        message: 'This should fail',
        options: {}
      });
      
      assert.strictEqual(result.success, false);
      assert.ok(result.error.includes('not found'));
    });
  });
  
  describe('embedding generation', () => {
    it('should generate embeddings for text', async () => {
      const result = await geminiTool.generateEmbedding({
        text: 'Test text for embedding'
      });
      
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.embedding.length, 128);
      assert.ok(Array.isArray(result.embedding));
    });
    
    it('should fail with empty text', async () => {
      const result = await geminiTool.generateEmbedding({
        text: ''
      });
      
      assert.strictEqual(result.success, false);
      assert.ok(result.error.includes('required'));
    });
  });
}); 