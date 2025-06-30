/**
 * Gemini Tool Tests
 *
 * Unit tests for the Gemini integration.
 */

import geminiTool from '../tools/gemini-tool.js';
import geminiClient from '../lib/gemini-client.js';

describe('Gemini Tool', () => {
  let mockChatSession;

  beforeAll(() => {
    // Mock the entire gemini-client module
    jest.mock('../lib/gemini-client.js');
  });

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup mock implementations
    mockChatSession = {
      sendMessage: jest.fn().mockResolvedValue({
        response: {
          text: () => 'Mock response to message',
          candidates: [
            { content: { parts: [{ text: 'Mock response to message' }] } },
          ],
        },
      }),
      history: [
        { role: 'user', parts: 'Hello' },
        { role: 'model', parts: 'Hi there' },
      ],
    };

    geminiClient.validateApiKey.mockResolvedValue(true);
    geminiClient.generateText.mockImplementation((prompt) =>
      Promise.resolve({
        text: `Generated text for prompt: ${prompt}`,
      })
    );
    geminiClient.createChat.mockReturnValue(mockChatSession);
    geminiClient.generateEmbedding.mockResolvedValue(Array(128).fill(0.5));
  });

  describe('initialization', () => {
    it('should initialize successfully with valid API key', async () => {
      const result = await geminiTool.initializeTool();
      expect(result).toBe(true);
    });
  });

  describe('generateText', () => {
    it('should generate text from a prompt', async () => {
      const result = await geminiTool.generateText({ prompt: 'Test prompt' });
      expect(result.success).toBe(true);
      expect(result.result.text).toContain('Test prompt');
      expect(geminiClient.generateText).toHaveBeenCalledWith(
        'Test prompt',
        undefined
      );
    });

    it('should fail with empty prompt', async () => {
      const result = await geminiTool.generateText({ prompt: '' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });
  });

  describe('chat functionality', () => {
    let sessionId;

    beforeEach(async () => {
      const result = await geminiTool.createChatSession({});
      sessionId = result.sessionId;
    });

    it('should create a chat session', () => {
      expect(sessionId).toBeDefined();
    });

    it('should send a message in a chat session', async () => {
      const result = await geminiTool.sendChatMessage({
        sessionId,
        message: 'Hello, Gemini!',
      });
      expect(result.success).toBe(true);
      expect(result.result.text).toContain('Mock response');
    });

    it('should get chat history', async () => {
      // Need to create a session first to have history
      await geminiTool.sendChatMessage({ sessionId, message: 'First message' });
      const result = await geminiTool.getChatHistory({ sessionId });
      expect(result.success).toBe(true);
      expect(result.history).toBeDefined();
    });

    it('should fail with invalid session ID', async () => {
      const result = await geminiTool.sendChatMessage({
        sessionId: 'invalid-session-id',
        message: 'This should fail',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('embedding generation', () => {
    it('should generate embeddings for text', async () => {
      const result = await geminiTool.generateEmbedding({
        text: 'Test text for embedding',
      });
      expect(result.success).toBe(true);
      expect(result.embedding.length).toBe(128);
      expect(Array.isArray(result.embedding)).toBe(true);
    });

    it('should fail with empty text', async () => {
      const result = await geminiTool.generateEmbedding({ text: '' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });
  });
});
