import { jest } from '@jest/globals';

// ---- mocks -------------------------------------------------------------

const fakeDriver = {
  generate: jest.fn(async ({ prompt }) => ({ text: `echo:${prompt}` })),
  stream: jest.fn(async function* ({ prompt }) {
    yield { text: `chunk:${prompt}` };
  }),
  embedding: jest.fn(async ({ text }) => Array(3).fill(text.length))
};

jest.unstable_mockModule('../src/models/index.js', () => ({
  getDriver: () => fakeDriver,
  listDrivers: () => ['fake']
}));

jest.unstable_mockModule('../src/logger.js', () => ({
  default: { info: () => {}, error: () => {} }
}));

jest.unstable_mockModule('../src/registry/index.js', () => ({
  callTool: async (id, args) => ({ ok: true, id, args }),
  listTools: () => [{ id: 'mcp_dummy' }]
}));

// ---- import after mocks are registered ---------------------------------
const { handleArrow } = await import('../src/archer/arrow-handler.js');

// ---- tests --------------------------------------------------------------

describe('Arrow handler', () => {
  test('handles generateText arrows', async () => {
    const arrow = { type: 'generateText', payload: { prompt: 'hi', driver: 'fake' } };
    const res = await handleArrow(arrow);
    expect(res.type).toBe('result');
    expect(res.payload.text).toBe('echo:hi');
    expect(fakeDriver.generate).toHaveBeenCalled();
  });

  test('handles capabilities arrow', async () => {
    const arrow = { type: 'capabilities' };
    const res = await handleArrow(arrow);
    expect(res.type).toBe('result');
    expect(res.payload.drivers).toContain('fake');
    expect(res.payload.tools[0]).toHaveProperty('id');
  });

  test('returns error for unknown arrow', async () => {
    const arrow = { type: 'unknown' };
    const res = await handleArrow(arrow);
    expect(res.type).toBe('error');
  });
}); 