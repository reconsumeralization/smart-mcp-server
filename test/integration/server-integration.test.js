import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import fetch from 'node-fetch';

const TEST_PORT = 3212;
const BASE_URL = `http://localhost:${TEST_PORT}`;

// Set environment variable before importing server
process.env.ARROW_PORT = TEST_PORT;

import { startArrowServer } from '../../src/archer/server.js';

describe('Server Integration Tests', () => {
  let server;

  beforeAll(async () => {
    // Start server for testing
    server = await startArrowServer();
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  describe('Health Endpoints', () => {
    test('should respond to health check', async () => {
      const response = await fetch(`${BASE_URL}/health`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toEqual({ status: 'ok' });
    });

    test('should respond to capabilities endpoint', async () => {
      const response = await fetch(`${BASE_URL}/.well-known/agent.json`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('name', 'smart-mcp-server');
      expect(data).toHaveProperty('capabilities');
      expect(data.capabilities).toHaveProperty('generateText');
      expect(data.capabilities).toHaveProperty('toolCall');
    });
  });

  describe('Arrow API', () => {
    test('should handle capabilities request', async () => {
      const response = await fetch(`${BASE_URL}/arrow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'capabilities' })
      });
      
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('type', 'result');
      expect(data).toHaveProperty('payload');
    });

    test('should validate arrow message schema', async () => {
      const response = await fetch(`${BASE_URL}/arrow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invalid: 'message' })
      });
      
      expect(response.status).toBe(400);
    });

    test('should handle generateText request', async () => {
      const response = await fetch(`${BASE_URL}/arrow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'generateText',
          payload: {
            prompt: 'Hello, test!',
            model: 'gemini'
          }
        })
      });
      
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('type');
    });

    test('should handle toolCall request', async () => {
      const response = await fetch(`${BASE_URL}/arrow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'tool.call',
          payload: {
            id: 'mcp_dummy',
            args: { test: 'data' }
          }
        })
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data).toEqual({
        type: 'result',
        payload: {
          ok: true,
          id: 'mcp_dummy',
          args: { test: 'data' }
        }
      });
    });

    test('should return error for invalid tool', async () => {
      const response = await fetch(`${BASE_URL}/arrow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'tool.call',
          payload: {
            id: 'mcp_nonexistent',
            args: {}
          }
        })
      });
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.type).toBe('error');
      expect(data.payload).toContain('not found');
    });

    test('should handle generateText stream request', async () => {
      const response = await fetch(`${BASE_URL}/arrow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'generateText',
          payload: {
            prompt: 'stream test',
            stream: true,
            model: 'gemini'
          }
        })
      });

      expect(response.status).toBe(200);
      const text = await response.text();
      // Streaming responses are newline-delimited JSON
      const parts = text.trim().split('\n');
      const chunks = parts.map(p => JSON.parse(p));
      expect(chunks[0].type).toBe('chunk');
      expect(chunks[0].payload.text).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should return 404 for unknown routes', async () => {
      const response = await fetch(`${BASE_URL}/unknown-route`);
      expect(response.status).toBe(404);
    });

    test('should handle malformed JSON', async () => {
      const response = await fetch(`${BASE_URL}/arrow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      });
      
      expect(response.status).toBe(400);
    });
  });
}); 